const { createRouter } = require("./worker");
const os = require('os')
const ifaces = os.networkInterfaces()


const getLocalIp = () => {
  let localIp = '127.0.0.1'
  Object.keys(ifaces).forEach((ifname) => {
    for (const iface of ifaces[ifname]) {
      // Ignore IPv6 and 127.0.0.1
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        continue
      }
      // Set the local ip to the first IPv4 address found and exit the loop
      localIp = iface.address
      return
    }
  })
  return localIp
}

const createWebRtcTransport = async (socket, worker, rooms, RoomId, callback, transports) => {
  try {
    // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions

    const webRtcTransport_options = {
      listenIps: [
        {
          ip: '0.0.0.0', // replace with relevant IP address
          announcedIp: getLocalIp(),
          // announcedIp:null
        },
      ],
      enableUdp: true,
      // enableTcp: true,
      preferUdp: true,
      // iceServers: [
      //   { urls: 'stun:stun.l.google.com:19302' },
      //   // { urls: 'stun:stun1.l.google.com:19302' },
      //   // { urls: 'stun:stun2.l.google.com:19302' },
      //   // { urls: 'stun:stun3.l.google.com:19302' },
      //   // { urls: 'turns:freeturn.tel:5349', username: 'free', credential: 'free' }
      // ]
    }
    const router = await createRouter(worker, rooms, RoomId)

    // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
    let transport = await router.createWebRtcTransport(webRtcTransport_options)

    transports.set(socket.id, transport);
    console.log(transport)



    console.log(`transport id: ${transport.id}`)

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        transport.close()
      }
    })
    transport.on('iceconnectionstatechange', (iceState) => {
      console.log(`ICE state changed to ${iceState}`);
      if (iceState === 'failed') {
        console.error('ICE connection state failed');
        // Handle ICE connection failure
      }
    });

    transport.on('close', () => {
      console.log('transport closed');
    });

    transport.on('close', () => {
      console.log('transport closed')
    })

    // send back to the client the following prameters
    // const rtpCapabilities = router.rtpCapabilities;
    // console.log('resending rtpCapabilities=>',rtpCapabilities)
    // rtpCapabilities

    callback({
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      }
    }
    )
    // }

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
module.exports = { createWebRtcTransport };