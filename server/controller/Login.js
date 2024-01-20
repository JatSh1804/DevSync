const bcrypt = require("bcrypt");
const { query } = require("express");
const jwt = require("jsonwebtoken");

const secret_key = process.env.SECRET_KEY ;

const user = [{
    id: 1705529558177,
    username: 'mom',
    password: '$2b$10$uVOGAsiNX00lUANGAFl3.eAkmJeSl2AX6J95cHdmt1PWMBrmEVhoy'
},
{
    id: 1705529580937,
    username: 'hell',
    password: '$2b$10$d1cpOv8wZ5kWtpI13FbmXuGZ6Y.X/vMTekGJEB8ZcHntpM2IfNe4u'
}]

async function Login(req, res) {
    console.log('body=>', req.body)
    const { username, password } = req.body;
    console.log('username=>', username)
    const datauser = user.find(user => user.username === username);
    if (datauser && datauser.username === username && await bcrypt.compare(password, datauser.password)) {
        const token = jwt.sign({ id: user.id }, secret_key, { expiresIn: '1h' });
        // res.cookie('token', token, { httpOnly: true, sameSite: 'false' })

        res.json({ message: 'Authentication successful' });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
};
module.exports = { Login }