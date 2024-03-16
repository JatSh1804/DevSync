const Redis = require("ioredis");
// console.log(process.env.REDIS_PORT)
// const pub = new Redis('rediss://red-cmfhsdmg1b2c73cm83dg:7qwEMx2KGC6J1H4vK40eOSDkOKjarIfM@singapore-redis.render.com:6379' || '');
// const sub = new Redis('rediss://red-cmfhsdmg1b2c73cm83dg:7qwEMx2KGC6J1H4vK40eOSDkOKjarIfM@singapore-redis.render.com:6379' || '');
const pub = new Redis("");
const sub = new Redis("");
pub.connect(() => { console.log('pub') });
sub.connect(() => { console.log('sub') });

module.exports = { pub, sub }

