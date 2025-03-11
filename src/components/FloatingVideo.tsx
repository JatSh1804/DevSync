import * as React from "react"
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoProps {
    stream?: MediaStream;
    username: string;
    muted?: boolean;
    isAudioEnabled?: boolean;
    isVideoEnabled?: boolean;
}

const VideoTile = ({ stream, username, muted = false, isAudioEnabled = true, isVideoEnabled = true }: VideoProps) => {
    console.log("debug: video stream received", stream);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

    useEffect(() => {
        if (videoRef.current && stream) {
            // Don't set track.enabled directly, as this can interfere with the producer/consumer state
            videoRef.current.srcObject = stream;
            videoRef.current.muted = muted;

            // Remove the manual track enabling/disabling
            // const videoTrack = stream.getVideoTracks()[0];
            // const audioTrack = stream.getAudioTracks()[0];
            // if (videoTrack) {
            //     videoTrack.enabled = isVideoEnabled;
            // }
            // if (audioTrack) {
            //     audioTrack.enabled = isAudioEnabled;
            // }

            const playVideo = async () => {
                try {
                    await videoRef.current?.play();
                    setNeedsUserInteraction(false);
                } catch (error) {
                    if (error instanceof DOMException && error.name === 'NotAllowedError') {
                        setNeedsUserInteraction(true);
                    } else {
                        console.error('Error playing video:', error);
                    }
                }
            };

            playVideo();
        }
    }, [stream, muted, isAudioEnabled, isVideoEnabled]);

    const handleClick = async () => {
        try {
            if (videoRef.current) {
                await videoRef.current.play();
                setNeedsUserInteraction(false);
            }
        } catch (error) {
            console.error('Error playing video on click:', error);
        }
    };

    const handlePlayError = async () => {
        console.log(`Attempting to recover playback for ${username}`);
        try {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setNeedsUserInteraction(false);
            }
        } catch (error) {
            console.error('Recovery failed:', error);
            setNeedsUserInteraction(true);
        }
    };

    useEffect(() => {
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.addEventListener('error', handlePlayError);
        }
        return () => {
            if (videoElement) {
                videoElement.removeEventListener('error', handlePlayError);
            }
        };
    }, []);
    return (
        <div className="relative rounded-lg overflow-hidden bg-muted">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onClick={handleClick}
            />
            <div className="absolute bottom-2 left-2 text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                {username || 'Unknown User'}
            </div>
            {needsUserInteraction && !muted && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
                    onClick={handleClick}
                >
                    <div className="bg-white/90 p-2 rounded-lg text-sm">
                        Click to enable audio
                    </div>
                </div>
            )}
        </div>
    );
};

interface FloatingVideoProps {
    localStream?: MediaStream;
    remoteStreams: Map<string, { stream: MediaStream; username: string }>;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    username: string;
    remoteStates: Map<string, { isAudioEnabled: boolean; isVideoEnabled: boolean }>;
}

export const FloatingVideo = ({
    localStream,
    remoteStreams,
    onToggleAudio,
    onToggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    username,
    remoteStates = new Map() // Add default value
}: FloatingVideoProps) => {
    const [minimized, setMinimized] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg ${minimized ? 'w-48' : 'w-[800px]'
                }`}
        >
            <div className="p-2 flex justify-between items-center">
                <h3 className="text-sm font-medium">Video Call</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMinimized(!minimized)}
                >
                    {minimized ? 'Expand' : 'Minimize'}
                </Button>
            </div>

            <AnimatePresence>
                {!minimized && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="grid gap-2 p-2 auto-rows-fr"
                        style={{
                            gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(remoteStreams.size + 1))}, 1fr)`
                        }}
                    >
                        {localStream && (
                            <VideoTile
                                stream={localStream}
                                username={`${username} (You)`}
                                muted={true}
                                isAudioEnabled={isAudioEnabled}
                                isVideoEnabled={isVideoEnabled}
                            />
                        )}

                        {Array.from(remoteStreams.entries()).map(([socketId, { stream, username: remoteUsername }]) => {
                            // Add null check and default values
                            const remoteState = remoteStates?.get(socketId) || {
                                isAudioEnabled: true,
                                isVideoEnabled: true
                            };

                            return (
                                <VideoTile
                                    key={socketId}
                                    stream={stream}
                                    username={remoteUsername}
                                    isAudioEnabled={remoteState.isAudioEnabled}
                                    isVideoEnabled={remoteState.isVideoEnabled}
                                />
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-2 flex justify-center gap-2 border-t">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleAudio}
                    className={!isAudioEnabled ? 'text-destructive' : ''}
                >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleVideo}
                    className={!isVideoEnabled ? 'text-destructive' : ''}
                >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
            </div>
        </motion.div>
    );
};
