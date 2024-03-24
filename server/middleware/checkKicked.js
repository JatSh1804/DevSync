const Room = require("../Schema/room")
async function checkKickedUser(socket, next) {
    const { RoomId } = socket.handshake.query; // Assuming the user ID and room ID are sent in the request body
    const userId = socket.data.authenticated_email;
    // Check if the user is kicked from the room
    try {
        const kicked = await isUserKicked(userId, RoomId);
        if (kicked) {
            next(new Error('You are kicked from the room'));
        }
    } catch (error) {
        console.log(userId)
        console.error('Error checking if user is kicked:', error);
        next(new Error('Internal Server Error'));
    }
    // If the user is not kicked, proceed to join the room
    console.log('Not kicked out!')
    next();
}
async function isUserKicked(userId, RoomId) {
    // Check if the user is kicked from the room in the database
    console.log("Searching for the User In DB:", userId, RoomId)
    const kickedUser = await Room.findOne({ RoomId, 'kickedUsers.email': userId });
    console.log(kickedUser);
    return kickedUser !== null; // Returns true if the user is kicked, false otherwise
}
module.exports = { checkKickedUser };