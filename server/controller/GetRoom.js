const { pub } = require("../client");
const { authenticate } = require("../middleware/authenticate");

async function GetRoom(req, res) {
    try {
        const { RoomId } = req.body;
        console.log(RoomId)
        // if (Type) {
        authenticate(req.cookies?.token)
            .then(async decoded => {
                try {
                    await pub.exists(`room:${RoomId}`)
                        .then(response => {
                            console.log('RoomDetails=>', response)
                            if (response) {
                                res.status(200).json({ Exists: true, message: 'Room Exists!' })
                            }
                            else {
                                res.status(200).json({ Exists: false, ...decoded, message: 'Room Does not Exists!' })
                            }
                        })
                } catch (err) {
                    console.log("Some ERROR=>", err)
                    res.status(502).json({ message: 'Some Server Error Occured!' })
                }
            })
            .catch((err) => {
                console.log(err)
                res.status(401).send('Not logged in')
            })
        // }
    }
    catch (error) {
        res.send(new Error(error))
        throw Error(error)
    }
}
module.exports = { GetRoom }