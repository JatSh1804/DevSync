const mediasoup = require('mediasoup');
async function startMediasoupWorker() {
    const worker = await mediasoup.createWorker({
        logLevel: 'debug', // Set log level as needed
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    });

    console.log('Mediasoup worker started');
    return worker;
}
const router = async () => {
    const worker = await startMediasoupWorker();
    return await worker.createRouter({
        mediaCodecs: [
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
        ],
    });
}
// router()
module.exports = router;