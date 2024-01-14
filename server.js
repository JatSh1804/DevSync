const express = require("express")
const app = express();

const { createServer } = require("node:http");
const server = createServer(app);
const { Server } = require("socket.io")
const { pub, sub } = require("./client")
const path = require("path")
const cors = require("cors");
const PORT = process.env.PORT || 3002;

app.use(
    cors({ origin: "*" })
);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('dist'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const Users = [];
// let lastCode = { code: '', username: '', socketId: '' }
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
sub.on("message", (channel, message) => {
    console.log("channel=>", channel)
    let data = JSON.parse(message)
    console.log(channel, "=>", data)

    switch (data.type) {
        case "JOIN":
            io.in(channel).emit("Joined", { client: AllConnectedUser(data.RoomId), socketId: data.socket, username: data.username });
            break;

        case "LEAVE":
            console.log("REDIS=>USER LEFT")
            io.to(channel).emit("Userleave", data)

            break;
        case "CODE":
            console.log("CODE")

            io.to(channel).emit("Code Sync", { code: data.code, username: data.username });
            break;
        default:
            break;
    }
})
io.on('connection', (socket) => {
    socket.on("UserJoin", async ({ RoomId, username }) => {
        sub.subscribe(RoomId);
        Users[socket.id] = { username: username, RoomId: RoomId };
        socket.join(RoomId);

        const clients = AllConnectedUser(RoomId);
        console.log({ RoomId, username, socketid: socket.id })
        console.log(Users);
        // console.log(client)
        await pub.publish(RoomId, JSON.stringify({ type: "JOIN", RoomId, username, socket: socket.id }))
        try {

            const lastCode = await pub.get(`lastCode:${RoomId}`).then(res => JSON.parse(res)).then(res => {
                console.log(res.code);
                socket.emit("Code Sync", { code: res.code, username: res.username });
                return res;
            })
            console.log("lastCode=>", lastCode)
        } catch (error) {
            console.log("Last Code doesn't exists.")
        }
    })


    socket.on("Code Change", ({ RoomId, code, username }) => {
        pub.set(`lastCode:${RoomId}`, JSON.stringify({ code, username, socketId: socket.id }))
        pub.publish(RoomId, JSON.stringify({ type: "CODE", username, code }))
        // console.log(code)
        // socket.in(RoomId).emit("Code Sync", { code: code })
    })

    socket.on("chat message", ({ RoomId, message, sender, username }) => {
        console.log("message received", message);
        console.log(`sender:${username}`)
        pub.publish(RoomId, JSON.stringify({ type: "CHAT", message, sender, username }))
        // socket.in(RoomId).emit("message receive", { message, sender, username })
        socket.nsp.to(RoomId).emit("message receive", { message, sender, username })
    });

    socket.on('disconnect', (Room) => {
        // console.log(Users[socket.id]);
        console.log('room>', Users[socket.id].RoomId);
        try {
            pub.publish(Users[socket.id].RoomId, JSON.stringify({ type: "LEAVE", socketId: socket.id, User: Users[socket.id] }))
            console.log("Userleave Emitted!")
            if (!AllConnectedUser || AllConnectedUser(Room).length == 0) {
                pub.expire(`lastCode:${Users[socket.id].RoomId}`, 10)
            }
            delete Users[socket.id]
        } catch (error) {
            console.log('Socket not found!')
            console.log(error)
        }

        socket.leave();
        console.log("A User disconnected!");
    })
})

server.listen(PORT, () => { console.log(`Listening on:${PORT}`) })