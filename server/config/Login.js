const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const secret_key = process.env.SECRET_KEY || 'devsync';

const { GetCred } = require('../controller/db')

const maxAge = 360000 * 1000
async function Login(req, response) {
    const { Email, Password } = req.body;
    console.log('Email=>', Email, Password)

    const datauser = await GetCred({ Email })
        .then(async res => {
            console.log(res)
            if (await bcrypt.compare(Password, res.Password)) {
                console.log('datauser=>', res)

                const token = jwt.sign({ id: res.id, Username: res.Username, Email: res.Email }, secret_key, { expiresIn: '1h' });
                response.cookie('token', token, { httpOnly: true, maxAge, Secure: true })
                response.cookie('User', { Username: res.Username, Email: res.Email }, { maxAge, })
                console.log('Successful=>', token)

                response.json({ message: 'Authentication successful' });
            } else {
                response.status(401).json({ message: 'Invalid username or password' });
            }
            return res;
        })
        .catch(err => {
            console.log('error=>', err)
            response.status(500).json(err)
        })
};
module.exports = { Login }