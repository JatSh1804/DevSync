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


    const webRtcTransportOptions = {
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
    }
const createWebRtcTransport = async (socket, worker, rooms, RoomId, callback, transports) => {
  try {
    // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
    const router = await createRouter(worker, rooms, RoomId);
    if (!router) {
      throw new Error(`Failed to get/create router for room: ${RoomId}`);
    }

    
    // Create the transport with retry logic
    let transport;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            transport = await router.createWebRtcTransport(webRtcTransportOptions);
            break;
        } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
                throw error;
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Store transport with proper ID
    const transportId = transport.id;
    transports.set(transportId, transport);
    
    console.log(`Transport ${transportId} created successfully`);

    transport.on('dtlsstatechange', dtlsState => {
      console.log(`Transport ${transportId} dtls state: ${dtlsState}`);
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
      transports.delete(transportId);
    });

    // send back to the client the following prameters
    // const rtpCapabilities = router.rtpCapabilities;
    // console.log('resending rtpCapabilities=>',rtpCapabilities)
    // rtpCapabilities

    callback({
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
      params: {
        id: transportId,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        transportId: transportId // Important: Send back the same ID
      }
    });

    return transport

  } catch (error) {
    console.error('Transport creation error:', error);
    callback({
      params: {
        error: error.message
      }
    })
    throw error;
  }
}
module.exports = { createWebRtcTransport };