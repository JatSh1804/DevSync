const mediasoup = require("mediasoup");

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    parameters: {
      minptime: 10,
      useinbandfec: 1,
      usedtx: 1,
      stereo: 1,
    },
    rtcpFeedback: [
      { type: 'transport-cc' }
    ]
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000
    },
    rtcpFeedback: [
      { type: 'goog-remb' },
      { type: 'transport-cc' },
      { type: 'ccm', parameter: 'fir' },
      { type: 'nack' },
      { type: 'nack', parameter: 'pli' }
    ]
  }
];

const workerSettings = {
  logLevel: 'warn',
  logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  rtcMinPort: 40000,
  rtcMaxPort: 49999  // Provides 9999 ports which should be plenty
};

async function createWorker() {
  try {
    const worker = await mediasoup.createWorker(workerSettings)
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

    let router = rooms.get(RoomId);
    if (!router) {
      // Create router with predefined mediaCodecs
      router = await workerInstance.createRouter({ mediaCodecs });
      rooms.set(RoomId, router);

      // Log the router's RTP capabilities for debugging
      console.log('Router RTP capabilities:', router.rtpCapabilities);

      router.on("close", () => {
        console.log("Mediasoup router closed.");
        rooms.delete(RoomId);
      });
    }
    return router;
  } catch (error) {
    console.error('Error creating Mediasoup router:', error);
    throw error;
  }
}

module.exports = { createWorker, createRouter, mediaCodecs };
