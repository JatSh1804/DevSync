
module.exports = RTPHandlers = (socket, router, producerTransport, consumerTransport, createWebRtcTransport) => {
    socket.on('getRtpCapabilities', async (callback) => {
        console.log('Req for rtpCapabilities...')
        // console.log(`Here's the =>${JSON.stringify(router)}`)

        const rtpCapabilities = await router?.rtpCapabilities

        // console.log('rtp Capabilities', rtpCapabilities)

        // call callback from the client and send back the rtpCapabilities
        callback({ rtpCapabilities })
    })

    socket.on('createWebRtcTransport', async ({ sender }, callback) => {
        console.log(`Is this a sender request? ${sender}`)
        // The client indicates if it is a producer or a consumer
        // if sender is true, indicates a producer else a consumer
        if (sender)
            producerTransport = await createWebRtcTransport(callback.router)
        else
            consumerTransport = await createWebRtcTransport(callback, router)
    })
}