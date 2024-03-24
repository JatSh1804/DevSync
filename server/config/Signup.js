const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secret_key = process.env.SECRET_KEY || 'devSync';
const { SetCred } = require('../controller/db');


// This is just a mock database for the sake of example
// In a real application, you would use a real database

async function SignUp(req, response) {
    const { Username, Password, Email } = req.body;
    console.log(Email, Password)

    // const getData = await GetCred({ Email })
    //     .then(res => res)
    //     .catch(err => console.log(err))

    // Check if the username is already taken

    // Hash the password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Create the new user
    const user = { id: Date.now(), Username, Email, Password: hashedPassword };
    try {
        await SetCred({ id: user.id, Username, Email, Password: hashedPassword })
            .then(res => {
                console.log("this is SetCred=>", JSON.stringify(res));
                response.status(200).json({ message: 'Profile Created Successfully!' })
            }
            )
            .catch(err => {
                console.log(err.message);
                response.status(401).json({ message: err.message });
                return;
            });
    } catch (err) { response.status(401).json(err) }
    // Generate a JWT for the new user
    const token = jwt.sign({ id: user.id }, secret_key, { expiresIn: '1h' });

    // Send the JWT to the client
    // res.cookie('token', token, { httpOnly: true, secure: true })

    // console.log((users))

};




module.exports = { SignUp };