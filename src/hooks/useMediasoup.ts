import { Device } from 'mediasoup-client';
import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface UseMediasoupProps {
    socket: React.MutableRefObject<Socket | null>;
    roomId: string;
    username: string;
}

// Simple helper for validating RTP parameters
const validateRtpParameters = (params: any) => {
    if (!params) return false;
    if (!params.codecs || !Array.isArray(params.codecs)) return false;
    return true;
};

export const useMediasoup = ({ socket, roomId, username }: UseMediasoupProps) => {
    const [localStream, setLocalStream] = useState<MediaStream>();
    const [remoteStreams, setRemoteStreams] = useState<Map<string, { stream: MediaStream; username: string }>>(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [remoteStates, setRemoteStates] = useState<Map<string, { isAudioEnabled: boolean; isVideoEnabled: boolean }>>(new Map());

    // MediaSoup references - Split into send and receive transports
    const device = useRef<Device>();
    const sendTransport = useRef<any>(); // For producing only
    const recvTransport = useRef<any>(); // For consuming only
    const producers = useRef<Map<string, any>>(new Map());
    const consumers = useRef<Map<string, Map<string, any>>>(new Map());  // Map of socketId -> Map of kind -> consumer

    // Debug tracking
    const initialized = useRef<boolean>(false);
    const debugLog = useRef<string[]>([]);

    // Helper function to log with timestamped entries
    const logWithTimestamp = (message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}`;
        console.log(logMessage, data);
        debugLog.current.push(logMessage);
        if (data) debugLog.current.push(JSON.stringify(data));
    };

    const initializeDevice = async () => {
        try {
            if (initialized.current) {
                logWithTimestamp('Device already initialized, skipping');
                return;
            }

            logWithTimestamp('Initializing mediasoup device');
            
            // Get router RTP capabilities
            const { rtpCapabilities } = await socket.current?.emitWithAck('getRtpCapabilities', { roomId });

            if (!rtpCapabilities) {
                throw new Error('Failed to get RTP capabilities from server');
            }

            // Create and load the mediasoup device
            device.current = new Device();
            await device.current.load({ routerRtpCapabilities: rtpCapabilities });
            
            logWithTimestamp('MediaSoup device initialized successfully', {
                canProduce: device.current.canProduce('audio') && device.current.canProduce('video'),
                loaded: device.current.loaded
            });
            
            initialized.current = true;
        } catch (error) {
            logWithTimestamp('Failed to initialize device', error);
            initialized.current = false;
            throw error;
        }
    };

    // Modified to create a send transport specifically
    const createSendTransport = async () => {
        try {
            if (!device.current?.loaded) {
                throw new Error('Device not initialized');
            }

            if (sendTransport.current && !sendTransport.current.closed) {
                logWithTimestamp('Send transport already exists, reusing existing transport');
                return sendTransport.current;
            }

            logWithTimestamp('Creating send WebRTC transport');

            // Create a transport specifically for sending
            const { params } = await socket.current?.emitWithAck('createWebRtcTransport', {
                sender: true,
                roomId,
                socketId: socket.current.id
            });

            if (!params || params.error) {
                throw new Error(params?.error || 'Failed to create send transport');
            }

            logWithTimestamp('Send transport parameters received', {
                id: params.id,
                transportId: params.transportId
            });

            // Create a send transport
            const newTransport = device.current.createSendTransport({
                id: params.id,
                iceParameters: params.iceParameters,
                iceCandidates: params.iceCandidates,
                dtlsParameters: params.dtlsParameters,
                sctpParameters: params.sctpParameters,
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Handle connection event
            newTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                logWithTimestamp('Send transport connect event triggered');
                try {
                    const response = await socket.current?.emitWithAck('transport-connect', {
                        transportId: params.transportId,
                        dtlsParameters
                    });

                    if (response?.error) {
                        logWithTimestamp('Send transport connect error from server', response.error);
                        errback(new Error(response.error));
                    } else {
                        logWithTimestamp('Send transport connected successfully');
                        callback();
                    }
                } catch (error) {
                    logWithTimestamp('Send transport connection failed', error);
                    errback(error);
                }
            });

            // Handle produce event
            newTransport.on('produce', async (parameters, callback, errback) => {
                try {
                    logWithTimestamp('Send transport produce event triggered', {
                        kind: parameters.kind
                    });

                    const { id } = await socket.current?.emitWithAck('transport-produce', {
                        transportId: params.transportId,
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters,
                        appData: { ...parameters.appData, roomId }
                    });

                    logWithTimestamp('Producer created successfully', { id });
                    callback({ id });
                } catch (error) {
                    logWithTimestamp('Producer creation failed', error);
                    errback(error);
                }
            });

            // Monitor transport state changes
            newTransport.on('connectionstatechange', (state) => {
                logWithTimestamp(`Send transport connection state changed to ${state}`);
                
                if (state === 'failed' || state === 'disconnected') {
                    // Implement reconnection logic if needed
                    logWithTimestamp('Send transport connection failed, attempting to reconnect');
                }
            });

            sendTransport.current = newTransport;
            return newTransport;
        } catch (error) {
            logWithTimestamp('Failed to create send transport', error);
            throw error;
        }
    };

    // New function to create a separate receive transport
    const createReceiveTransport = async () => {
        try {
            if (!device.current?.loaded) {
                throw new Error('Device not initialized');
            }

            if (recvTransport.current && !recvTransport.current.closed) {
                logWithTimestamp('Receive transport already exists, reusing existing transport');
                return recvTransport.current;
            }

            logWithTimestamp('Creating receive WebRTC transport');

            // Create a transport specifically for receiving
            const { params } = await socket.current?.emitWithAck('createWebRtcTransport', {
                sender: false,
                roomId,
                socketId: socket.current.id
            });

            if (!params || params.error) {
                throw new Error(params?.error || 'Failed to create receive transport');
            }

            logWithTimestamp('Receive transport parameters received', {
                id: params.id,
                transportId: params.transportId
            });

            // Create a receive transport
            const newTransport = device.current.createRecvTransport({
                id: params.id,
                iceParameters: params.iceParameters,
                iceCandidates: params.iceCandidates,
                dtlsParameters: params.dtlsParameters,
                sctpParameters: params.sctpParameters,
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Handle connection event
            newTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                logWithTimestamp('Receive transport connect event triggered');
                try {
                    const response = await socket.current?.emitWithAck('transport-connect', {
                        transportId: params.transportId,
                        dtlsParameters
                    });

                    if (response?.error) {
                        logWithTimestamp('Receive transport connect error from server', response.error);
                        errback(new Error(response.error));
                    } else {
                        logWithTimestamp('Receive transport connected successfully');
                        callback();
                    }
                } catch (error) {
                    logWithTimestamp('Receive transport connection failed', error);
                    errback(error);
                }
            });

            // Monitor transport state changes
            newTransport.on('connectionstatechange', (state) => {
                logWithTimestamp(`Receive transport connection state changed to ${state}`);
                
                if (state === 'failed' || state === 'disconnected') {
                    logWithTimestamp('Receive transport connection failed');
                }
            });

            recvTransport.current = newTransport;
            return newTransport;
        } catch (error) {
            logWithTimestamp('Failed to create receive transport', error);
            throw error;
        }
    };

    const startStreaming = async () => {
        try {
            logWithTimestamp('Starting media streaming');
            
            // Initialize device if not already done
            await initializeDevice();
            
            // Create the send transport for producing
            await createSendTransport();

            // Also create the receive transport for consuming
            await createReceiveTransport();

            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            }).catch(error => {
                logWithTimestamp('Failed to get user media with full constraints', error);
                // Try with more basic constraints
                return navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                }).catch(fallbackError => {
                    logWithTimestamp('Failed to get basic user media', fallbackError);
                    // Let's try just audio as last resort
                    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                });
            });

            logWithTimestamp('User media obtained successfully', {
                audio: stream.getAudioTracks().length > 0,
                video: stream.getVideoTracks().length > 0
            });

            // Set tracks as enabled
            stream.getTracks().forEach(track => {
                track.enabled = true;
            });

            // Save local stream
            setLocalStream(stream);

            // Produce each track
            for (const track of stream.getTracks()) {
                logWithTimestamp(`Producing ${track.kind} track`);
                
                const producer = await sendTransport.current.produce({
                    track,
                    codecOptions: track.kind === 'video' ? {
                        videoGoogleStartBitrate: 1000
                    } : undefined,
                    encodings: track.kind === 'video' ? [
                        { maxBitrate: 500000, scaleResolutionDownBy: 2 }
                    ] : undefined,
                    appData: { roomId, username }
                });

                logWithTimestamp(`${track.kind} producer created`, {
                    id: producer.id
                });

                // Store producer reference
                producers.current.set(track.kind, producer);

                // Notify server that we're ready to produce
                socket.current?.emit('producer-ready', {
                    producerId: producer.id,
                    kind: track.kind,
                    roomId,
                    username
                });
            }

            logWithTimestamp('Media streaming started successfully');
        } catch (error) {
            logWithTimestamp('Failed to start streaming', error);
            throw error;
        }
    };

    const consumeStream = async (producerId: string, socketId: string, producerUsername: string, kind: string) => {
        try {
            if (!device.current?.loaded) {
                throw new Error('Device not initialized');
            }

            // Make sure we have a receive transport - use a dedicated receive transport
            if (!recvTransport.current || recvTransport.current.closed) {
                await createReceiveTransport();
            }

            logWithTimestamp(`Consuming ${kind} stream from ${producerUsername}`, {
                producerId,
                socketId,
                transportId: recvTransport.current.id
            });

            // Create consumer using our receive transport
            const { id, rtpParameters, producerPaused } = await socket.current?.emitWithAck('consume', {
                rtpCapabilities: device.current.rtpCapabilities,
                remoteProducerId: producerId,
                transportId: recvTransport.current.id,
                roomId
            });

            if (!id) {
                throw new Error('Failed to get consumer ID from server');
            }

            logWithTimestamp(`Consumer parameters received`, {
                id,
                kind,
                producerPaused
            });

            // Create the consumer
            const consumer = await recvTransport.current.consume({
                id,
                producerId,
                kind,
                rtpParameters
            });

            logWithTimestamp(`Consumer created`, {
                id: consumer.id,
                track: consumer.track ? {
                    kind: consumer.track.kind,
                    enabled: consumer.track.enabled,
                    readyState: consumer.track.readyState
                } : 'No track'
            });

            // Store consumer by socket ID and kind
            if (!consumers.current.has(socketId)) {
                consumers.current.set(socketId, new Map());
            }
            consumers.current.get(socketId)?.set(kind, consumer);

            // Update remote stream with the new track
            setRemoteStreams(prev => {
                const newStreams = new Map(prev);
                const existingStream = newStreams.get(socketId);

                if (existingStream) {
                    // Replace track if it exists
                    const existingTracks = existingStream.stream.getTracks();
                    const existingTrack = existingTracks.find(t => t.kind === kind);
                    if (existingTrack) {
                        existingStream.stream.removeTrack(existingTrack);
                        existingTrack.stop();
                    }
                    
                    // Add new track
                    existingStream.stream.addTrack(consumer.track);
                    newStreams.set(socketId, existingStream);
                } else {
                    // Create new stream
                    const newStream = new MediaStream([consumer.track]);
                    newStreams.set(socketId, {
                        stream: newStream,
                        username: producerUsername
                    });
                }
                
                return newStreams;
            });

            // Resume the consumer
            await consumer.resume();
            
            // Tell the server we've resumed
            await socket.current?.emitWithAck('consumer-resume', {
                consumerId: consumer.id,
                roomId
            });

            logWithTimestamp(`Consumer ${id} resumed successfully`);

            // Monitor the consumer for changes
            consumer.on('transportclose', () => {
                logWithTimestamp(`Consumer ${consumer.id} transport closed`);
                removeConsumer(socketId, kind);
            });

            consumer.on('trackended', () => {
                logWithTimestamp(`Consumer ${consumer.id} track ended`);
                removeConsumer(socketId, kind);
            });

            return consumer;
        } catch (error) {
            logWithTimestamp(`Error consuming stream from ${socketId}`, error);
            throw error;
        }
    };

    const removeConsumer = (socketId: string, kind?: string) => {
        const consumerMap = consumers.current.get(socketId);
        
        if (consumerMap) {
            if (kind) {
                // Close specific consumer
                const consumer = consumerMap.get(kind);
                if (consumer) {
                    logWithTimestamp(`Closing ${kind} consumer for ${socketId}`);
                    consumer.close();
                    consumerMap.delete(kind);
                    
                    // Update remote stream by removing this track
                    setRemoteStreams(prev => {
                        const newStreams = new Map(prev);
                        const existingStream = newStreams.get(socketId);
                        
                        if (existingStream) {
                            const track = existingStream.stream.getTracks().find(t => t.kind === kind);
                            if (track) {
                                existingStream.stream.removeTrack(track);
                                track.stop();
                            }
                            
                            // If no tracks left, remove the stream
                            if (existingStream.stream.getTracks().length === 0) {
                                newStreams.delete(socketId);
                            }
                        }
                        
                        return newStreams;
                    });
                }
                
                // If no consumers left for this socket, clean up
                if (consumerMap.size === 0) {
                    consumers.current.delete(socketId);
                }
            } else {
                // Close all consumers for this socket
                consumerMap.forEach(consumer => {
                    logWithTimestamp(`Closing all consumers for ${socketId}`);
                    consumer.close();
                });
                
                consumers.current.delete(socketId);
                
                // Remove remote stream
                setRemoteStreams(prev => {
                    const newStreams = new Map(prev);
                    const existingStream = newStreams.get(socketId);
                    
                    if (existingStream) {
                        existingStream.stream.getTracks().forEach(track => track.stop());
                        newStreams.delete(socketId);
                    }
                    
                    return newStreams;
                });
            }
        }
    };

    const toggleAudio = () => {
        const audioProducer = producers.current.get('audio');
        if (audioProducer) {
            if (isAudioEnabled) {
                audioProducer.pause();
                // Notify others
                socket.current?.emit('producer-pause', {
                    kind: 'audio',
                    roomId
                });
            } else {
                audioProducer.resume();
                // Notify others
                socket.current?.emit('producer-resume', {
                    kind: 'audio',
                    roomId
                });
            }
            setIsAudioEnabled(!isAudioEnabled);
            
            // Also update local stream track
            localStream?.getAudioTracks().forEach(track => {
                track.enabled = !isAudioEnabled;
            });
        }
    };

    const toggleVideo = () => {
        const videoProducer = producers.current.get('video');
        if (videoProducer) {
            if (isVideoEnabled) {
                videoProducer.pause();
                // Notify others
                socket.current?.emit('producer-pause', {
                    kind: 'video',
                    roomId
                });
            } else {
                videoProducer.resume();
                // Notify others
                socket.current?.emit('producer-resume', {
                    kind: 'video',
                    roomId
                });
            }
            setIsVideoEnabled(!isVideoEnabled);
            
            // Also update local stream track
            localStream?.getVideoTracks().forEach(track => {
                track.enabled = !isVideoEnabled;
            });
        }
    };

    // Event handlers
    useEffect(() => {
        if (!socket.current) return;

        // Initialize device when component mounts
        initializeDevice().catch(error => {
            logWithTimestamp('Failed to initialize device on mount', error);
        });

        // Handle existing producers when joining
        socket.current.on('existing-producers', async ({ producers }) => {
            logWithTimestamp('Received existing producers', producers);
            
            for (const { producerId, socketId, kind, username } of producers) {
                try {
                    await consumeStream(producerId, socketId, username, kind);
                } catch (error) {
                    logWithTimestamp(`Failed to consume existing producer: ${producerId}`, error);
                }
            }
        });

        // Handle new producer
        socket.current.on('new-producer', async ({ producerId, socketId, kind, username }) => {
            logWithTimestamp('New producer detected', { producerId, socketId, kind, username });
            
            try {
                await consumeStream(producerId, socketId, username, kind);
            } catch (error) {
                logWithTimestamp(`Failed to consume new producer: ${producerId}`, error);
            }
        });

        // Handle producer closed
        socket.current.on('producer-closed', ({ socketId, kind, producerId }) => {
            logWithTimestamp('Producer closed', { socketId, kind, producerId });
            removeConsumer(socketId, kind);
        });

        // Handle producer pause/resume
        socket.current.on('producer-pause', ({ socketId, kind }) => {
            logWithTimestamp(`Producer paused: ${socketId}, kind: ${kind}`);
            
            setRemoteStates(prev => {
                const newStates = new Map(prev);
                const currentState = newStates.get(socketId) || { isAudioEnabled: true, isVideoEnabled: true };
                newStates.set(socketId, {
                    ...currentState,
                    [kind === 'audio' ? 'isAudioEnabled' : 'isVideoEnabled']: false
                });
                return newStates;
            });
        });

        socket.current.on('producer-resume', ({ socketId, kind }) => {
            logWithTimestamp(`Producer resumed: ${socketId}, kind: ${kind}`);
            
            setRemoteStates(prev => {
                const newStates = new Map(prev);
                const currentState = newStates.get(socketId) || { isAudioEnabled: true, isVideoEnabled: true };
                newStates.set(socketId, {
                    ...currentState,
                    [kind === 'audio' ? 'isAudioEnabled' : 'isVideoEnabled']: true
                });
                return newStates;
            });
        });

        return () => {
            // Clean up event listeners
            socket.current?.off('existing-producers');
            socket.current?.off('new-producer');
            socket.current?.off('producer-closed');
            socket.current?.off('producer-pause');
            socket.current?.off('producer-resume');
            
            // Clean up local stream
            localStream?.getTracks().forEach(track => track.stop());
            
            // Clean up producers
            producers.current.forEach(producer => producer.close());
            
            // Clean up consumers
            consumers.current.forEach(socketConsumers => {
                socketConsumers.forEach(consumer => {
                    consumer.close();
                });
            });
            
            // Close both transports
            if (sendTransport.current && !sendTransport.current.closed) {
                sendTransport.current.close();
            }
            
            if (recvTransport.current && !recvTransport.current.closed) {
                recvTransport.current.close();
            }
        };
    }, [socket.current, roomId]);

    return {
        localStream,
        remoteStreams,
        remoteStates,
        isAudioEnabled,
        isVideoEnabled,
        toggleAudio,
        toggleVideo,
        startStreaming,
        debugLogs: () => debugLog.current // Export debug logs for troubleshooting
    };
};
