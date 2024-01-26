
const UserAuth = require("../Schema/User");

async function GetCred({ Email }) {
    try {
        const res = await UserAuth.findOne({ Email });
        if (!res) {
            throw new Error("User doesn't Exists!");
        }
        return res;
    } catch (err) {
        console.log(err)
        throw new Error(err.message);
    }
}
async function UpdateCred({ Email, Username, Password }) {
    return await UserAuth.findOneAndUpdate({ Email }, { Username, Password }, { new: true, upsert: true });
}

async function SetCred({ Email, Username, Password, id }) {
    const user = await UserAuth.findOne({ Email });
    console.log('user=>', user)
    if (!user) {
        return await UserAuth.findOneAndUpdate({ Email }, { id, Username, Email, Password }, { new: true, upsert: true });
    }
    throw new Error("Email Exists Already!")
}
module.exports = { GetCred, UpdateCred, SetCred };