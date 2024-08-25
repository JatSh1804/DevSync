
const { createWebRtcTransport } = require("../config/TransportConfig");
const { createRouter } = require("../config/worker");
module.exports = RTPHandlers = (worker, socket, rooms, producerTransport, consumerTransport, transports) => {
    socket.on('getRtpCapabilities', async ({ RoomId }, callback) => {

        console.log('Request for RTP Capabilities...');
        const router = await createRouter(worker, rooms, RoomId)
        if (router) {
            const rtpCapabilities = router.rtpCapabilities;
            callback({ rtpCapabilities });
        } else {
            callback({ error: 'Room not found' });
        }
    })

    socket.on('createWebRtcTransport', async ({ sender, RoomId }, callback) => {
        console.log(`Is this a sender request? ${sender}`)
        // The client indicates if it is a producer or a consumer
        // if sender is true, indicates a producer else a consumer
        if (sender)
            producerTransport = await createWebRtcTransport(socket, worker, rooms, RoomId, callback, transports)
        else
            consumerTransport = await createWebRtcTransport(socket, worker, rooms, RoomId, callback, transports)
    })

    // socket.on('transport-connect', async ({ dtlsParameters }) => {
    //     console.log('received a transport-connect request back from the client')
    //     const transport = transports.get(socket.id); // Retrieve the transport using the socket ID
    //     if (transport) {
    //         console.log('transport=>', transport)
    //         console.log(dtlsParameters)
    //         await transport.connect({ dtlsParameters });
    //     }
    // });

    socket.on('transport-connect', async ({ transportId, dtlsParameters }, callback) => {
        const transport = transports.get(socket.id);  // Retrieve the user's transport
        if (transport) {
            try {
                await transport.connect({ dtlsParameters });
                console.log(`Transport ${transport.id} connected successfully`);
                callback({ connected: true });
            } catch (error) {
                console.error(`Transport connect error for ${transport.id}:`, error);
                callback({ connected: false, error: error.message });
            }
        } else {
            console.error(`Transport not found for socket ID ${socket.id}`);
            callback({ connected: false, error: 'Transport not found' });
        }
    });

    // When the client creates a producer
    socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
        console.log('received a transport-produce request which maybe means that the producer is now producing')
        const transport = transports.get(socket.id); // Retrieve the transport using the socket ID
        if (transport) {
            const producer = await transport.produce({ kind, rtpParameters, appData });
            callback({ id: producer.id });
        }
    });
}