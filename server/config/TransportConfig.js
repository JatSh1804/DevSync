const createWebRtcTransport = async (callback,router) => {
    try {
      // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
      const webRtcTransport_options = {
        listenIps: [
          {
            ip: '0.0.0.0', // replace with relevant IP address
            announcedIp: '127.0.0.1',
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      }
  
      // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
      let transport = await router.createWebRtcTransport(webRtcTransport_options)
      console.log(`transport id: ${transport.id}`)
  
      transport.on('dtlsstatechange', dtlsState => {
        if (dtlsState === 'closed') {
          transport.close()
        }
      })
  
      transport.on('close', () => {
        console.log('transport closed')
      })
  
      // send back to the client the following prameters
      callback({
        // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        }
      })
  
      return transport
  
    } catch (error) {
      console.log(error)
      callback({
        params: {
          error: error
        }
      })
    }
  }