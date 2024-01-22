const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secret_key = process.env.SECRET_KEY || 'devSync';
const UserAUTH = require("../Schema/User");


// This is just a mock database for the sake of example
// In a real application, you would use a real database
const users = [{
    id: 1705906135163,
    username: 'qwerty@gmail.com',
    password: '$2b$10$HfuKGTcZjYXh8RvDaO1xveGmXPXO8TTezdznlot0T5d0/tXB2G0PS'
}];

async function SignUp(req, res) {
    const { username, password } = req.body;
    console.log(username, password)

    // Check if the username is already taken
    if (users.find(user => user.username === username)) {
        console.log('Username is already taken')
        return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const user = { id: Date.now(), username, password: hashedPassword };
    users.push(user);
    UserAUTH.findOneAndUpdate()
    // Generate a JWT for the new user
    const token = jwt.sign({ id: user.id }, secret_key, { expiresIn: '1h' });

    // Send the JWT to the client
    // res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' })

    res.json({ message: 'Authentication successful' });
    console.log((users))

};




module.exports = { SignUp, users };