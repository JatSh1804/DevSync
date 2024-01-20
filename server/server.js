const express = require("express")
const app = express();

const { createServer } = require("node:http");
const server = createServer(app);
const { Server } = require("socket.io")
const { pub, sub } = require("./client")
const path = require("path")
const cors = require("cors");
const axios = require("axios");
const qs = require("qs");
const bodyParser = require("body-parser")
const PORT = process.env.PORT || 3002;
const { authenticate } = require("./middleware/authenticate");
const { SignUp } = require("./controller/Signup");
const { Login } = require("./controller/Login");

app.use(
    cors({ origin: "http://localhost:5173" })
);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(express.static('dist'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});


app.post("/SignUp", (req, res) => SignUp(req, res));
app.post('/Login', (req, res) => Login(req, res));

// io.use(async (socket, next) => {
//     authenticate(socket, next)
//         .then((decoded) => {
//             socket.decoded = decoded;
//             console.log("decode=>", decoded)
//             next()
//         })
//         .catch(err => { console.log(err.message), next(new Error(err.message)) })
//     // console.log(verification)
// })



const Users = [];
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
const CodeExpire = async (socket, timeout) => {
    await pub.expire(`lastCode:${Users[socket.id].RoomId}`, timeout)
}
const RedisPublish = async (RoomId, type, data) => {
    await pub.publish(RoomId, JSON.stringify({ type, ...data }))
}


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
            // io.sockets.sockets.get(data.socketId)?.broadcast.to(channel).emit("Code Sync", { code: data.code, username: data.username });
            console.log("getting code")
            break;
        case 'CHAT':
            io.in(channel).emit("message receive", { message: data.message, sender: data.sender, username: data.username })
        default:
            break;
    }
})
io.on('connection', (socket) => {
    socket.on("UserJoin", async ({ RoomId, username }) => {
        sub.subscribe(RoomId);
        Users[socket.id] = { username: username, RoomId: RoomId };
        socket.join(RoomId);

        console.log({ RoomId, username, socketid: socket.id })
        console.log(Users);
        // console.log(client)
        await RedisPublish(RoomId, "JOIN", { RoomId, username, socket: socket.id })
        // await pub.publish(RoomId, JSON.stringify({ type: "JOIN", RoomId, username, socket: socket.id }))
        try {
            const lastCode = await pub.get(`lastCode:${RoomId}`)
                .then(res => JSON.parse(res))
                .then(res => {
                    pub.persist(`lastCode:${RoomId}`)
                    console.log(res.code);
                    socket.emit("Code Sync", { code: res.code, username: res.username });
                    return res;
                })
            console.log("lastCode=>", lastCode)
        } catch (error) {
            console.log("Last Code doesn't exists.")
        }
    })


    socket.on("Code Change", async ({ RoomId, code, username }) => {
        pub.set(`lastCode:${RoomId}`, JSON.stringify({ code, username, socketId: socket.id }))

        await RedisPublish(RoomId, 'CODE', { username, code, socketId: socket.id })
        // await pub.publish(RoomId, JSON.stringify({ type: "CODE", username, code }))
        // console.log(socket.to())
    })

    socket.on("chat message", async ({ RoomId, message, sender, username }) => {
        console.log("message received", message);
        console.log(`sender:${username}`)

        await RedisPublish(RoomId, 'CHAT', { message, sender, username })
        // pub.publish(RoomId, JSON.stringify({ type: "CHAT", message, sender, username }))

    });

    socket.on("Compile", async ({ code, language, input, RoomId }) => {
        var data = qs.stringify({
            code: 'val = int(input("Enter your value: ")) + 5\nprint(val)',
            language: 'py',
            input: input || ''
        });
        console.log('language=>', code);
        var config = {
            method: 'post',
            url: process.env.COMPILE_URL ,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        };

        await axios(config)
            .then((response) => {
                // console.log('response=>', response.)
                // io.in(RoomId).emit('Result', { result: response.data });
                console.log('response=>', (response));
            })
            .catch(function (error) {
                console.log('err =>', error);
            });
    })

    socket.on('disconnect', async (Room, reason) => {
        // console.log(Users[socket.id]);
        // console.log('Reason:', reason)
        console.log('room>', Users[socket.id]?.RoomId);
        // sub.quit();
        // pub.quit();
        try {
            await RedisPublish(Users[socket.id].RoomId, 'LEAVE', { socketId: socket.id, User: Users[socket.id] })

            console.log("Userleave Emitted!")
            if (!AllConnectedUser || AllConnectedUser(Room).length == 0) {
                CodeExpire(socket, 600)
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