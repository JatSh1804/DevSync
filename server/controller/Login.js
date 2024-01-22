const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const secret_key = process.env.SECRET_KEY || 'devSync';

const { users } = require("./Signup")

async function Login(req, res) {
    console.log('body=>', req.body)
    const { username, password } = req.body;
    console.log('username=>', username)
    const datauser = users.find(user => user.username === username);
    if (datauser && datauser.username === username && await bcrypt.compare(password, datauser.password)) {
        const token = jwt.sign({ id: users.id }, secret_key, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 60 * 1000 })
        console.log('Successful=>', token)

        res.json({ message: 'Authentication successful' });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
};
module.exports = { Login }