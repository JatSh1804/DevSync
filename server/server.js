const express = require("express")
const app = express();

const socket = require("socket.io")
const { createServer } = require("node:http");
const server = createServer(app);
const { Server } = require("socket.io")
const PORT = process.env.PORT || 3002;
const cors = require("cors");
app.use(
    cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] })
);

const io = new Server(server, { cors: { origin: "http://localhost:5173" } });
app.get("/", (req, res) => {

    // res.send("hello")
    res.sendFile(__dirname + '/index.html')
})
const Users = []
function AllConnectedUser(RoomId) {
    return Array.from(io.sockets.adapter.rooms.get(RoomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: Users[socketId].username,
            };
        }
    );
};
io.on('connection', (socket) => {
    // console.log(socket.id)
    socket.on("UserJoin", ({ RoomId, username }) => {
        Users[socket.id] = { username: username, RoomId: RoomId };
        socket.join(RoomId);

        const client = AllConnectedUser(RoomId);
        console.log({ RoomId, username, socketid: socket.id })
        console.log(Users);
        // console.log(client)

        io.in(RoomId).emit("Joined", { client, socketId: socket.id, username })
    })

    socket.on("Code Change", ({ RoomId, code }) => {
        // console.log(code)
        socket.in(RoomId).emit("Code Sync", { code: code })
    })

    socket.on("chat message", ({ RoomId, message, sender, username }) => {
        console.log("message received", message);
        console.log(`sender:${username} `)
        socket.in(RoomId).emit("message receive", { message, sender, username })
    });

    socket.on('disconnect', (Room) => {
        console.log(Users[socket.id]);
        try {
            io.to(Users[socket.id].RoomId).emit("Userleave", { socketId: socket.id, User: Users[socket.id] })
            delete Users[socket.id]
            console.log("Userleave Emitted!")
        } catch { console.log('Socket not found!') }

        socket.leave();
        console.log("A User disconnected!");
    })
})

server.listen(PORT, () => { console.log(`Listening on:${PORT}`) })