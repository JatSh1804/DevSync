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
const PORT = process.env.PORT || 3002;
const { authenticate } = require("./middleware/authenticate");
const cookieParser = require("cookie-parser");
const cookie = require("cookie")

const { SignUp } = require("./config/Signup");
const { Login } = require("./config/Login");
const mongoose = require("mongoose");
const { GetRoom } = require("./controller/GetRoom");

// app.use(require('express-status-monitor')(
//     { port: 3003 ,socketPath:'/statusst'}
// ));

app.use(
    cors({
        origin: 'http://localhost:5173',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        optionsSuccessStatus: 204,
    })
)


const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        credentials: true
    }
});
//Middleware used for rectifying request
app.use(express.json());
app.use(express.urlencoded({ extended: false }))

app.use(cookieParser())

app.use(express.static('./dist'));
app.get('*', (req, res, next) => {
    res.sendFile(path.join(__dirname, './dist', 'index.html'));
});

app.post("/Signup", (req, res) => SignUp(req, res));
app.post("/Login", (req, res) => Login(req, res));
app.post('/user', (req, res) => {
    authenticate(req.headers?.authorization?.split(' ')[1] || req.cookies?.token)
        .then(decoded => {
            res.json({ loggedIn: true, ...decoded })
        })
        .catch(err => {
            res.status(401).json({ loggedIn: false, ...err })
        })
})
app.post('/Room',
    (req, res) => GetRoom(req, res)
)


io.use(async (socket, next) => {
    // const cookies = c ie.parse(socket.request.headers.cookie || '');
    // const token = cookies.token;
    const token = cookie.parse(socket.handshake.headers.cookie || '').token
    authenticate(token)
        .then((decoded) => {
            socket.decoded = decoded;
            console.log("decode=>", decoded)
            // Used to pass down decoded info to the event
            socket.data = { authenticated_email: decoded.Email }
            next()
        })
        .catch(err => {
            console.log('error=>', err),
                next(new Error(err))
            // next()
        })
    // console.log(verification)
})

mongoose.connect(process.env.MONGODB || 'mongodb+srv://jatin1804sharma:jatin1234@cluster0.9ynjhkt.mongodb.net/User' || '')
    .then(() => { console.log('Connected!') });

const Users = [];

async function AllConnectedUser(RoomId) {
    let Alluser = await pub.hgetall(`room:${RoomId}:users`)
        .then(res =>
            Object.entries(res).map(([socketId, value]) => {
                let [username, role] = value.split('/');
                return { socketId, username, role }
            })
        )
    return Alluser;
};
const CodeExpire = async (socket, timeout) => {
    console.log('expire');
    await pub.expire(`room:${Users[socket.id].RoomId}`, timeout)
        .then(res => console.log('expire=>', res))
}

const RedisPublish = async (RoomId, type, data) => {
    // console.log(type)
    await pub.publish(RoomId, JSON.stringify({ type, ...data }))
}


sub.on("message", async (channel, message) => {
    console.log("channel=>", channel)
    let data = JSON.parse(message)
    console.log(channel, "=>", data)

    switch (data.type) {
        case "JOIN":
            try {
                AllConnectedUser(data.RoomId)
                    .then(async res => {
                        // console.log('allConnectedUser=>',)
                        io.in(channel).emit("Joined", { client: res, socketId: data.socket, username: data.username, role: data.role, email: data.email });
                    })
            } catch (error) {
                console.log(error)
            }
            break;

        case "LEAVE":
            console.log("REDIS=>USER LEFT")
            io.to(channel).emit("Userleave", data)
            break;
        case "CODE":
            console.log("CODE")
            io.to(channel).emit("Code Sync", { code: data.code, language: data.language, username: data.username });
            // io.sockets.sockets.get(data.socketId)?.broadcast.to(channel).emit("Code Sync", { code: data.code, username: data.username });
            // console.log("getting code")
            break;
        case 'CHAT':
            io.in(channel).emit("message receive", { message: data.message, sender: data.sender, username: data.username })
            break;
        case 'COMPILE':
            io.in(channel).emit('Result', { result: data.result });
            break;
        case 'PROMOTED':
            io.to(data.socketId).emit('PROMOTED', { role: data.role });
        default:
            break;
    }
})
io.on('connection', (socket) => {
    socket.on("UserJoin", async ({ RoomId, username, email, role }) => {
        console.log('USERJOINED')
        if (role == 'owner' || role == 'cohost') {
            await pub.hsetnx(`room:${RoomId}`, 'info', JSON.stringify({ owner: email, role }))
            await pub.hset(`room:${RoomId}`, 'socket', socket.id)
        }
        sub.subscribe(RoomId);
        Users[socket.id] = { username, RoomId };
        socket.join(RoomId);
        await pub.hset(`room:${RoomId}:users`, socket.id, `${username}/${role}`)

        console.log({ RoomId, username, socketid: socket.id })
        console.log(Users);
        // console.log(client)
        await RedisPublish(RoomId, "JOIN", { RoomId, username, socket: socket.id, email, role })
        try {
            const lastCode = await pub.hget(`room:${RoomId}`, 'lastCode')
                .then(res => JSON.parse(res))
                .then(res => {
                    pub.persist(`room:${RoomId}`)
                    console.log(res.code);
                    socket.emit("Code Sync", { code: res.code, username: res.username });
                    return res;
                })

        } catch (error) {
            console.log("Last Code doesn't exists.")
        }
        try {
            await pub.hget(`room:${RoomId}`, 'info')
                .then(res => JSON.parse(res))
                .then(async res => {
                    console.log('email=>', socket.data.authenticated_email)
                    console.log(res)
                    if (socket.data.authenticated_email == res.owner) {
                        io.to(socket.id).emit('ROLE', { role: 'owner', access: {} });
                        await pub.hset(`room:${RoomId}`, 'socket', socket.id)
                        // socket.to(socket).emit("ROLE", { role: 'owner', access: {} });
                        console.log("Role Send for the user when Owner joined in \n");
                    }
                }
                )
        } catch (error) {
            console.log("ROLE ACCESS ERROR=>", error)

        }
    })


    socket.on("Code Change", async ({ RoomId, language, code, username }) => {
        await pub.hset(`room:${RoomId}`, 'lastCode', JSON.stringify({ code, language, username, socketId: socket.id }))
        console.log("Getting code ")

        await RedisPublish(RoomId, 'CODE', { username, language, code, socketId: socket.id })
        // await pub.publish(RoomId, JSON.stringify({ type: "CODE", username, code }))
        // console.log(socket.to())
    })

    socket.on("chat message", async ({ RoomId, message, sender, username }) => {
        console.log("message received", message);
        console.log(`sender:${username}`)

        await RedisPublish(RoomId, 'CHAT', { message, sender, username })
        // pub.publish(RoomId, JSON.stringify({ type: "CHAT", message, sender, username }))

    });

    socket.on("PROMOTE", async ({ RoomId, socketId, role }) => {
        if (socket.id != socketId && role == 'owner') {
            RedisPublish(RoomId, 'PROMOTED', { role: 'cohost', socketId })
        }
    })
    socket.on("Compile", async ({ code, language, input, RoomId }) => {
        var data = qs.stringify({
            code: code,
            language: language,
            input: input || ''
        });
        console.log('language=>', language, code);
        var config = {
            method: 'post',
            url: process.env.COMPILE_URL || 'https://codex-api.fly.dev' || '',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        };

        await axios(config)
            .then(async (response) => {
                await RedisPublish(RoomId, 'COMPILE', { result: response.data })
                console.log('response=>', (response));
            })
            .catch(async (error) => {
                console.log('err =>', error);
                await RedisPublish(RoomId, 'COMPILE', { result: error.data })
            });
    })

    socket.on('disconnect', async (Room, reason) => {
        const User = Users[socket.id];
        // console.log('room>', Users?.RoomId);
        try {
            await RedisPublish(User?.RoomId, 'LEAVE', { socketId: socket.id, User: User })
            await pub.hdel(`room:${User.RoomId}:users`, socket.id)
            // console.log("AllUser=>", await AllConnectedUser(User.RoomId).length)
            await AllConnectedUser(User.RoomId)
                .then(data => {
                    if (data.length == 0) {
                        console.log('expire1')
                        CodeExpire(socket, 300)
                    }
                })
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