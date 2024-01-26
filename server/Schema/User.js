const mongoose = require("mongoose")

const validateEmail = function (email) {
    const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return regex.test(email);
};

const user = new mongoose.Schema({
    id: { type: String, lowercase: true, unique: true },
    Username: { type: String, required: [true, 'Username is Required.'] },
    Email: { type: String, unique: true, required: [true, 'Email is Required'], validate: [validateEmail, 'Enter a valid email'], },
    Password: { type: String }

}, { collection: 'UserAuth', strict: false })

module.exports = UserAUTH = mongoose.model('user', user);
