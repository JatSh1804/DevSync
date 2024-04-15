import { Device } from "mediasoup-client"
export default async function createDevice(rtpCapability) {
    try {
        // Create a new device
        const device = new Device();

        // Initialize the device
        await device.load({
            // Specify the router RTP capabilities
            routerRtpCapabilities: rtpCapability,

            // Specify the transport options (optional)
            // transportOptions: {/* Transport options */}
        });

        console.log('Mediasoup client device created successfully');
        return device;
    } catch (error) {
        console.error('Error creating Mediasoup client device:', error);
        if (error.name === 'UnsupportedError')
            console.warn('browser not supported')
    }
    throw error; // Rethrow the error for handling at the caller level
}