const mongoose = require("mongoose")
const roomSchema = new mongoose.Schema({
    RoomId: { type: String, required: true },
    // Other fields for room information...
    kickedUsers: [{
        email: { type: String, required: true }
    }],
    createdAt: { type: Date, default: Date.now, expires: 10 }
}, { strict: false });

roomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 });
module.exports = Room = mongoose.model('room', roomSchema);
