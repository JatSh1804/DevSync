const Redis = require("ioredis");
// console.log(process.env.REDIS_PORT)
const pub = new Redis();
const sub = new Redis();
pub.connect(() => { console.log('pub') });
sub.connect(() => { console.log('sub') });

module.exports = { pub, sub }

