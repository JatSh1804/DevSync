import { Device } from "mediasoup-client"
export default async function createDevice(rtpCapability, device) {
    try {
        // Create a new device
        device.current = new Device();

        // Initialize the device
        console.log(rtpCapability);
        await device.current.load({
            // Specify the router RTP capabilities
            routerRtpCapabilities: rtpCapability.rtpCapabilities,

            // Specify the transport options (optional)
            // transportOptions: {/* Transport options */}
        }).then(() => {
            console.log(device.current.createSendTransport)
            console.log('Mediasoup client device created successfully');
        });
        return device;
    } catch (error) {
        console.error('Error creating Mediasoup client device:', error);
        if (error.name === 'UnsupportedError')
            console.warn('browser not supported')
    }
    throw error; // Rethrow the error for handling at the caller level
}