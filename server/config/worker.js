const mediasoup = require("mediasoup");

const mediaCodes = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
    },
];

async function createWorker() {
    try {
        const worker = await mediasoup.createWorker({
            rtcMaxPort: 2020,
            rtcMinPort: 2000,
            logLevel: 'debug', // Set log level as needed
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        })
        console.log(`worker pid ${worker.pid}`)

        worker.on('died', error => {
            // This implies something serious happened, so kill the application
            console.error('mediasoup worker has died')
            setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
        })
        // console.log(MediaS)
        return worker;
    } catch (error) {
        console.error('Error starting Mediasoup worker:', error);
        throw error; // Propagate the error for handling elsewhere
    }
}

async function createRouter(worker, rooms, RoomId) {
    try {
        const workerInstance = await worker;
        if (!workerInstance) {
            throw new Error('Worker is not initialized');
        }
        console.log(workerInstance);

        let router = rooms.get(RoomId);
        if (!router) {
            router = await workerInstance.createRouter({ mediaCodecs: mediaCodes });
            rooms.set(RoomId, router)
            router.on("close", () => {
                console.log("Mediasoup router closed.");
                // Handle router close event if needed
            });
            console.log('Router created successfully');
        }
        return router;
    } catch (error) {
        console.error('Error creating Mediasoup router:', error);
        throw error;
    }
}

module.exports = { createWorker, createRouter, mediaCodes };
