const jwt = require("jsonwebtoken")

let secretKey = process.env.JWT_KEY || 'devsync';
async function authenticate(token) {
    console.log('token=>', token)
    return new Promise((resolve, reject) => {

        if (!token) {
            reject(new Error('Authentication error: Token missing'));
        }
        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                // Token verification failed
                console.log('verification failed:')
                reject(err);
            } else {
                // Token is valid
                resolve(decoded);
            }
        });
    });
}
module.exports = { authenticate };
