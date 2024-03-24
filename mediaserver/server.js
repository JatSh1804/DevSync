const { Worker, Router, WebRtcTransport } = require('mediasoup');
const router = require("./config")

const media = async () => {
    await router()
        .then(res =>
            console.log(res)
        )
};
// console.log(media)
media()

console.log('Mediasoup router created');

