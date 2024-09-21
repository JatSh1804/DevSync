const Redis = require("ioredis");
require('dotenv').config();

// let connect
// const connect = "rediss://default:AVNS_0kCeYsa_d7KJgfDs2Gh@devsync-jatin1804sharma-5d76.a.aivencloud.com:10706";
// const connect = "rediss://red-cmfhsdmg1b2c73cm83dg:7qwEMx2KGC6J1H4vK40eOSDkOKjarIfM@singapore-redis.render.com:6379";
console.log(process.env.REDIS_URL)
const pub = new Redis(process.env.REDIS_URL || connect || "");
const sub = new Redis(process.env.REDIS_URL || connect || "");
pub.connect(() => { console.log('pub') });
sub.connect(() => { console.log('sub') });

module.exports = { pub, sub }

