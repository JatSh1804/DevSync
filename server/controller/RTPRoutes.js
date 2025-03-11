const { createWebRtcTransport } = require("../config/TransportConfig");
const { createRouter } = require("../config/worker");

// Add transport tracking map at the top
const activeTransports = new Map();

// Add transport state tracking
const transportConnections = new Map();

// Improve the producer finding logic with more detailed logging
const findProducer = async (producers, producerId) => {
    console.log(`Looking for producer with ID: ${producerId}`);
    console.log(`Available producers: ${producers.size} sockets`);
    
    // Log all available producers for debugging
    producers.forEach((producerMap, socketId) => {
        console.log(`Socket ${socketId} has ${producerMap.size} producers:`);
        producerMap.forEach((producer, kind) => {
            console.log(`- ${kind}: ${producer.id}`);
        });
    });

    for (const [socketId, producerMap] of producers.entries()) {
        for (const [kind, producer] of producerMap.entries()) {
            if (producer.id === producerId) {
                console.log(`Found producer ${producerId} from socket ${socketId} of kind ${kind}`);
                return { producer, socketId, kind };
            }
        }
    }
    console.log(`Producer ${producerId} NOT FOUND`);
    return null;
};

module.exports = RTPHandlers = (worker, socket, rooms, producers, consumers, transports) => {
    // In your RTPHandlers.js
    const cleanup = async (socket, roomId) => {
        try {
            // Clean up producers
            if (producers.has(socket.id)) {
                const producerMap = producers.get(socket.id);
                for (const [kind, producer] of producerMap.entries()) {
                    producer.close();
                    socket.broadcast.to(roomId).emit('producer-closed', {
                        socketId: socket.id,
                        kind
                    });
                }
                producers.delete(socket.id);
            }

            // Clean up consumers
            if (consumers.has(socket.id)) {
                const consumerMap = consumers.get(socket.id);
                for (const [consumerId, { consumer }] of consumerMap.entries()) {
                    consumer.close();
                }
                consumers.delete(socket.id);
            }

            // Clean up transports more thoroughly
            const socketTransports = Array.from(transports.entries())
                .filter(([key]) => key.startsWith(socket.id));
            
            for (const [key, transport] of socketTransports) {
                if (transport && !transport.closed) {
                    transport.close();
                    transports.delete(key);
                    activeTransports.delete(transport.id);
                }
            }

            // Clean up transport connections
            for (const [key, transport] of socketTransports) {
                transportConnections.delete(transport.id);
            }

        } catch (error) {
            console.error('Cleanup error:', error);
        }
    };

    socket.on('getRtpCapabilities', async ({ roomId }, callback) => {
        console.log('Request for RTP Capabilities for room:', roomId);
        const router = await createRouter(worker, rooms, roomId);
        if (router) {
            const rtpCapabilities = router.rtpCapabilities;
            callback({ rtpCapabilities });
        } else {
            callback({ error: 'Room not found' });
        }
    });

    socket.on('createWebRtcTransport', async ({ sender, roomId, socketId }, callback) => {
        try {
            // Use simple transport key - always use just the socket ID to create one transport per user
            const transportKey = socketId || socket.id;

            console.log('Transport key:', transportKey);

            const existingTransport = transports.get(transportKey);
            if (existingTransport) {
                if (existingTransport.closed) {
                    console.log(`Cleaning up closed transport: ${transportKey}`);
                    transports.delete(transportKey);
                    activeTransports.delete(existingTransport.id);
                } else {
                    console.log(`Reusing existing transport: ${transportKey}`);
                    return callback({
                        params: {
                            id: existingTransport.id,
                            iceParameters: existingTransport.iceParameters,
                            iceCandidates: existingTransport.iceCandidates,
                            dtlsParameters: existingTransport.dtlsParameters,
                            transportId: transportKey
                        }
                    });
                }
            }

            console.log('Creating WebRTC transport:', { socketId: transportKey, roomId });
            const transport = await createWebRtcTransport(socket, worker, rooms, roomId, callback, transports);

            // Track the transport creation
            activeTransports.set(transport.id, {
                created: Date.now(),
                socketId: transportKey,
                roomId
            });

            // Monitor transport state
            transport.observer.on('close', () => {
                console.log(`Transport ${transport.id} closed`);
                activeTransports.delete(transport.id);
                transports.delete(transportKey);
            });

            transport.observer.on('newproducer', (producer) => {
                console.log(`New producer created on transport ${transport.id}`);
            });

            // Store with consistent ID
            transports.set(transportKey, transport);

            callback({
                params: {
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                    transportId: transportKey
                }
            });
        } catch (error) {
            console.error('Transport creation error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('transport-connect', async ({ transportId, dtlsParameters }, callback) => {
        try {
            console.log(`Attempting to connect transport: ${transportId}`);
            // Use the transportId to find the transport directly in the Map
            // This can be either socket.id or just transportId depending on which one was used
            const transport = Array.from(transports.values()).find(t => t.id === transportId) || 
                              transports.get(transportId);
            
            if (!transport) {
                throw new Error(`Transport not found for ID: ${transportId}`);
            }

            // Check if transport is already connecting or connected
            const connectionState = transportConnections.get(transport.id);
            if (connectionState === 'connecting' || connectionState === 'connected') {
                console.log(`Transport ${transport.id} is already ${connectionState}`);
                return callback({ connected: true });
            }

            transportConnections.set(transport.id, 'connecting');
            console.log(`Connecting transport ${transport.id} with DTLS parameters`);

            await transport.connect({ dtlsParameters });
            
            transportConnections.set(transport.id, 'connected');
            console.log(`Transport ${transport.id} connected successfully`);
            callback({ connected: true });
        } catch (error) {
            console.error(`Transport connect error:`, error);
            transportConnections.set(transportId, 'failed');
            callback({ connected: false, error: error.message });
        }
    });

    // Handle new producer creation with username
    socket.on('transport-produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
        try {
            const transport = transports.get(transportId); // Use transportId from params
            if (!transport) {
                throw new Error(`Producer transport not found for ID: ${transportId}`);
            }

            const producer = await transport.produce({
                kind,
                rtpParameters,
                appData: {
                    ...appData,
                    socketId: socket.id,
                    transportId,
                    timestamp: Date.now()
                }
            });

            // Store producer with consistent structure
            if (!producers.has(socket.id)) {
                producers.set(socket.id, new Map());
            }
            producers.get(socket.id).set(kind, producer);

            console.log(`Producer created for ${socket.id} ${kind}:`, producer.id);
            console.log(`Total producers: ${Array.from(producers.keys()).length} sockets`);

            // Notify all other users in the room about the new producer
            socket.broadcast.to(appData.roomId).emit('new-producer', {
                producerId: producer.id,
                socketId: socket.id,
                kind,
                username: appData.username || socket.data?.username || 'Unknown User'
            });

            callback({ id: producer.id });

            // Start consuming for existing producers in the room
            const router = rooms.get(appData.roomId);
            if (router) {
                const producerList = Array.from(producers.entries())
                    .filter(([sid]) => sid !== socket.id) // Exclude self
                    .flatMap(([sid, producerMap]) =>
                        Array.from(producerMap.entries())
                            .map(([k, p]) => ({
                                producerId: p.id,
                                socketId: sid,
                                kind: k
                            }))
                    );

                // Notify the new user about existing producers
                socket.emit('existing-producers', { producers: producerList });
            }

        } catch (error) {
            console.error('transport-produce error:', error);
            callback({ error: error.message });
        }
    });

    // Handle consumer creation requests with improved error handling
    socket.on('consume', async ({ rtpCapabilities, remoteProducerId, transportId, roomId }, callback) => {
        try {
            console.log('Consume request received:', {
                remoteProducerId,
                transportId,
                rtpCapabilities: rtpCapabilities ? 'present' : 'missing'
            });

            // Find transport by ID first, then by key
            let transport = Array.from(transports.entries())
                .find(([, t]) => t.id === transportId)?.[1];
            
            if (!transport) {
                transport = transports.get(transportId);
            }

            if (!transport) {
                // If still not found, get the user's transport
                transport = transports.get(socket.id);
            }

            if (!transport) {
                throw new Error(`Transport not found: ${transportId}`);
            }

            console.log(`Found transport for consume: ${transport.id}`);
            
            const router = rooms.get(roomId);

            if (!router) {
                throw new Error(`Router not found for room: ${roomId}`);
            }

            // Log all active producers for debugging
            console.log(`Searching for producer ${remoteProducerId} among all producers:`);
            producers.forEach((producerMap, socketId) => {
                console.log(`- Socket ${socketId} has producers:`, Array.from(producerMap.values()).map(p => p.id));
            });

            // Find producer with the helper function - improved version with retry
            let producerData = await findProducer(producers, remoteProducerId);
            
            if (!producerData) {
                // If producer not found, wait a bit and retry once
                console.log(`Producer ${remoteProducerId} not found, retrying after delay...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                producerData = await findProducer(producers, remoteProducerId);
            }
            
            if (!producerData) {
                throw new Error(`Producer not found: ${remoteProducerId}`);
            }

            const { producer, socketId: producerSocketId } = producerData;

            // Validate RTP capabilities
            if (!rtpCapabilities || !router.rtpCapabilities) {
                throw new Error('Invalid RTP capabilities');
            }

            // Log detailed codec information for debugging
            console.log('Producer codecs:', JSON.stringify(producer.rtpParameters.codecs));
            console.log('Consumer capabilities:', JSON.stringify(rtpCapabilities.codecs));
            
            // Find matching codecs manually
            const matchingCodecs = producer.rtpParameters.codecs.filter(producerCodec => 
                rtpCapabilities.codecs.some(consumerCodec => 
                    consumerCodec.mimeType.toLowerCase() === producerCodec.mimeType.toLowerCase()
                )
            );
            
            console.log('Matching codecs:', matchingCodecs.length > 0 ? 'YES' : 'NO');
            
            // Check if router can consume with more detailed error handling
            if (!router.canConsume({
                producerId: producer.id,
                rtpCapabilities,
            })) {
                console.error('Router cannot consume. Capabilities mismatch:', {
                    producerCodecs: producer.rtpParameters.codecs.map(c => c.mimeType),
                    consumerCapabilities: rtpCapabilities.codecs.map(c => c.mimeType)
                });
                
                // Try to proceed anyway if we have matching codecs
                if (matchingCodecs.length === 0) {
                    throw new Error('Router cannot consume - no matching codecs found');
                }
                
                console.log('Found matching codecs, attempting to continue despite router.canConsume() returning false');
            }

            let consumer;
            try {
                // Create the consumer with additional verification
                console.log(`Creating consumer with producer ID: ${producer.id}`);
                consumer = await transport.consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: true,
                    appData: { socketId: socket.id, roomId, producerSocketId }
                });
                console.log(`Consumer created with ID: ${consumer.id}`);
            } catch (error) {
                console.error('Consumer creation error:', error);
                throw new Error(`Failed to create consumer: ${error.message}`);
            }

            if (!consumer) {
                throw new Error('Failed to create consumer');
            }

            // Store the consumer
            if (!consumers.has(socket.id)) {
                consumers.set(socket.id, new Map());
            }

            consumers.get(socket.id).set(consumer.id, {
                consumer,
                roomId,
                timestamp: Date.now()
            });

            console.log('Consumer created successfully:', {
                id: consumer.id,
                kind: consumer.kind,
                producerId: producer.id,
            });

            callback({
                id: consumer.id,
                producerId: producer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                producerPaused: consumer.producerPaused
            });

        } catch (error) {
            console.error('Consume error:', error);
            callback({ error: error.message });
        }
    });

    // Handle consumer resume with better error handling
    socket.on('consumer-resume', async ({ consumerId, forceResume }) => {
        try {
            console.log(`Attempting to resume consumer: ${consumerId} (force: ${!!forceResume})`);
            const consumerMap = consumers.get(socket.id);
            if (!consumerMap) {
                console.error(`No consumers found for socket: ${socket.id}`);
                return;
            }
            
            const consumerData = consumerMap.get(consumerId);
            if (!consumerData) {
                console.error(`Consumer not found: ${consumerId}`);
                return;
            }
            
            const { consumer } = consumerData;
            
            // Log current state for debugging
            console.log(`Consumer ${consumerId} current state:`, {
                kind: consumer.kind,
                paused: consumer.paused,
                producerPaused: consumer.producerPaused
            });
            
            // Force producer to resume if needed
            if (consumer.producerPaused) {
                const producerInfo = await findProducerById(producers, consumer.producerId);
                if (producerInfo && producerInfo.producer) {
                    console.log(`Resuming producer for consumer ${consumerId}`);
                    await producerInfo.producer.resume();
                }
            }
            
            console.log(`Resuming consumer ${consumerId} for ${consumer.kind}`);
            await consumer.resume();
            console.log(`Consumer ${consumerId} resumed successfully`);
            
            // Return success response that client can use for confirmation
            return { resumed: true };
        } catch (error) {
            console.error('Error resuming consumer:', error);
            return { resumed: false, error: error.message };
        }
    });

    // Add helper function to find producer by ID
    const findProducerById = async (producers, producerId) => {
        for (const [socketId, producerMap] of producers.entries()) {
            for (const [kind, producer] of producerMap.entries()) {
                if (producer.id === producerId) {
                    return { producer, socketId, kind };
                }
            }
        }
        return null;
    };

    // Add handler for producer ready notification
    socket.on('producer-ready', async ({ producerId, kind, roomId }) => {
        // Get username from socket or session
        const username = socket.username || 'Unknown User';

        // Notify all other users in the room about the new producer
        socket.broadcast.to(roomId).emit('new-producer', {
            producerId,
            socketId: socket.id,
            kind,
            username
        });
    });

    // Add handlers for producer pause/resume
    socket.on('producer-pause', async ({ kind, roomId }) => {
        const producerMap = producers.get(socket.id);
        if (producerMap && producerMap.has(kind)) {
            const producer = producerMap.get(kind);
            await producer.pause();

            // Notify other participants
            socket.broadcast.to(roomId).emit('producer-pause', {
                socketId: socket.id,
                kind
            });
        }
    });

    socket.on('producer-resume', async ({ kind, roomId }) => {
        const producerMap = producers.get(socket.id);
        if (producerMap && producerMap.has(kind)) {
            const producer = producerMap.get(kind);
            await producer.resume();

            // Notify other participants
            socket.broadcast.to(roomId).emit('producer-resume', {
                socketId: socket.id,
                kind
            });
        }
    });

    // Fix the duplicate disconnect handler
    socket.on('disconnect', () => {
        try {
            const roomId = [...socket.rooms].find(room => room !== socket.id);
            if (roomId) {
                cleanup(socket, roomId);
            }
            
            // Close and clean up consumers
            if (consumers.has(socket.id)) {
                const userConsumers = consumers.get(socket.id);
                if (userConsumers instanceof Map) {
                    userConsumers.forEach(({ consumer }) => {
                        if (consumer && typeof consumer.close === 'function') {
                            consumer.close();
                        }
                    });
                }
                consumers.delete(socket.id);
            }

            // Close and clean up transports
            if (transports.has(socket.id)) {
                const transport = transports.get(socket.id);
                if (transport && typeof transport.close === 'function') {
                    transport.close();
                }
                transports.delete(socket.id);
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    });
    
    socket.on('leave-room', ({ roomId }) => {
        cleanup(socket, roomId);
    });

    // Add handler for explicit stream stop
    socket.on('stop-streaming', ({ roomId }) => {
        if (producers.has(socket.id)) {
            const producerMap = producers.get(socket.id);
            producerMap.forEach((producer, kind) => {
                producer.close();
                socket.broadcast.to(roomId).emit('producer-closed', {
                    socketId: socket.id,
                    producerId: producer.id
                });
            });
            producers.delete(socket.id);
        }
    });

    // Add periodic cleanup of stale transports
    const cleanupStaleTransports = () => {
        const now = Date.now();
        activeTransports.forEach((data, transportId) => {
            if (now - data.created > 60000) { // 60 seconds
                const transport = Array.from(transports.values())
                    .find(t => t.id === transportId);
                
                if (transport && !transport.producer && !transport.consumers.size) {
                    console.log(`Cleaning up stale transport: ${transportId}`);
                    transport.close();
                }
            }
        });
    };

    setInterval(cleanupStaleTransports, 30000); // Run every 30 seconds
};