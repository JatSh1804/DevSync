const Redis = require("ioredis");
// console.log(process.env.REDIS_PORT)
const pub = new Redis(process.env.SERVER_URL || '');
const sub = new Redis(process.env.SERVER_URL || '');
pub.connect(() => { console.log('pub') });
sub.connect(() => { console.log('sub') });

module.exports = { pub, sub }

