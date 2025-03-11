import * as React from 'react';

interface StreamDebuggerProps {
    localStream?: MediaStream;
    remoteStreams: Map<string, { stream: MediaStream; username: string }>;
}

export const StreamDebugger: React.FC<StreamDebuggerProps> = ({ localStream, remoteStreams }) => {
    return (
        <div style={{ position: 'fixed', bottom: 0, right: 0, background: '#000', padding: '10px', color: '#fff', maxWidth: '300px' }}>
            <h3>Stream Debug Info</h3>
            
            <h4>Local Stream:</h4>
            {localStream ? (
                <div>
                    {localStream.getTracks().map(track => (
                        <div key={track.id}>
                            {track.kind}: {track.enabled ? '✅' : '❌'} 
                            {track.muted ? ' (Muted)' : ' (Unmuted)'}
                        </div>
                    ))}
                </div>
            ) : 'No local stream'}

            <h4>Remote Streams:</h4>
            {Array.from(remoteStreams.entries()).map(([socketId, { stream, username }]) => (
                <div key={socketId}>
                    <strong>{username}:</strong>
                    {stream.getTracks().map(track => (
                        <div key={track.id}>
                            {track.kind}: {track.enabled ? '✅' : '❌'} 
                            {track.muted ? ' (Muted)' : ' (Unmuted)'}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};
