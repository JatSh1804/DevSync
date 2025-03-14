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

// Get the public IP for production or local IP for development
const getAnnouncedIp = () => {
  if (process.env.PUBLIC_IP) {
    return process.env.PUBLIC_IP;
  }
  if (process.env.NODE_ENV === 'production') {
    // Default to local IP if no public IP is provided
    // In production, you should set PUBLIC_IP environment variable
    return getLocalIp();
  }
  return getLocalIp();
};

const webRtcTransportOptions = {
  listenIps: [
    {
      ip: '0.0.0.0', // Always listen on all interfaces
      announcedIp: getAnnouncedIp(),
    },
  ],
  enableUdp: true,
  enableTcp: true, // Enable TCP for environments where UDP might be blocked
  preferUdp: true,
  initialAvailableOutgoingBitrate: 1000000, // 1 Mbps
  minimumAvailableOutgoingBitrate: 600000, // 600 kbps
};

const createWebRtcTransport = async (socket, worker, rooms, RoomId, callback, transports) => {
  try {
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
            console.error(`Transport creation attempt ${retryCount}/${maxRetries} failed:`, error);
            if (retryCount === maxRetries) {
                throw error;
            }
            // Wait before retrying with increasing delay
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
    }

    // Store transport with proper ID
    const transportId = transport.id;
    transports.set(transportId, transport);
    
    console.log(`Transport ${transportId} created successfully`);

    // Add more detailed event handlers for diagnostics
    transport.on('dtlsstatechange', dtlsState => {
      console.log(`Transport ${transportId} dtls state: ${dtlsState}`);
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    transport.on('iceconnectionstatechange', (iceState) => {
      console.log(`Transport ${transportId} ICE state changed to ${iceState}`);
      if (iceState === 'failed' || iceState === 'disconnected') {
        console.error(`ICE connection state ${iceState} for transport ${transportId}`);
        // Don't immediately close - allow time for ICE to potentially recover
        if (iceState === 'failed') {
          setTimeout(() => {
            if (transport && !transport.closed && transport.iceConnectionState === 'failed') {
              console.log(`Closing failed transport ${transportId} after timeout`);
              transport.close();
            }
          }, 10000); // 10 second grace period
        }
      }
    });

    transport.on('close', () => {
      console.log('transport closed');
      transports.delete(transportId);
    });

    // Include ICE servers in the response to help with NAT traversal
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ];

    // Add TURN servers if they're configured in environment
    if (process.env.TURN_SERVER && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      iceServers.push({
        urls: process.env.TURN_SERVER,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL
      });
    }

    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        transportId: transportId,
        iceServers: iceServers
      }
    });

    return transport;

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