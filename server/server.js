const express = require("express")
const app = express();
require('dotenv').config();
const { createServer } = require("node:http");
const fs = require('fs')
const path = require("path")
const options = {
    key: fs.readFileSync(path.join(__dirname, './ssl/server-key.pem'), 'utf-8'),
    cert: fs.readFileSync(path.join(__dirname, './ssl/server-cert.pem'), 'utf-8')
}

const server = createServer(options, app);
const { Server } = require("socket.io")
const { pub, sub } = require("./client")
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

const Room = require("./Schema/room");
const { checkKickedUser } = require("./middleware/checkKicked");
const { createWorker, createRouter, mediaCodes } = require("./config/worker");
const RTPHandlers = require("./controller/RTPRoutes")
// const router=require("./'")

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

async function workerInstance() {
    return await createWorker()
}
const worker = workerInstance()
let router;

//Middleware used for rectifying request
app.use(express.json());
app.use(express.urlencoded({ extended: false }))

app.use(cookieParser())

app.use(express.static(path.join(__dirname,'dist')))

app.get('/api/auth/verify', (req, res) => {
    authenticate(req.headers?.authorization?.split(' ')[1] || req.cookies?.token)
        .then(decoded => {
            console.log("Logged In")
            res.json({ loggedIn: true, ...decoded })
        })
        .catch(err => {
            console.log("Not Logged In")

            res.status(401).json({ loggedIn: false, ...err })
        })
});

app.get('*', (req, res, next) => {
    // console.log("received...");
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.post("/Login", Login);
app.post("/Signup", SignUp)
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

mongoose.connect(process.env.MONGODB || '')
    .then(() => { console.log('Connected!') });

const Users = [];

async function AllConnectedUser(RoomId) {
    let Alluser = await pub.hgetall(`room:${RoomId}:users`)
        .then(res =>
            Object.entries(res).map(([socketId, value]) => {
                let [username, role, email] = value.split('/');
                return { socketId, username, role, email }
            })
        )
    return Alluser;
};
const CodeExpire = async (socket, timeout) => {
    console.log('expire');
    await pub.expire(`room:${Users[socket.id]?.RoomId}`, timeout)
        .then(res => console.log('expire=>', res))
}

const RedisPublish = async (RoomId, type, data) => {
    // console.log(JSON.stringify(data))
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
                        console.log('allConnectedUser=>',)
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
            break;
        case 'Kicked':
            io.in(channel).emit("Kicked", { email: data.email, socketId: data.socketId })
            break;
        default:
            break;

    }
})
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
            console.log('error=>', err.message),
                next(new Error(err))
            // next()
        })
    // console.log(verification)
})
io.use((socket, next) => checkKickedUser(socket, next))


let rooms = new Map();
let transports = new Map();
let producers = new Map();  // Change from array to Map
let consumers = new Map();  // Change from array to Map

// Create a helper function to initialize mediasoup resources for a room
const initializeMediasoupRoom = async (roomId, worker) => {
    if (!rooms.has(roomId)) {
        const router = await createRouter(worker, rooms, roomId);
        console.log(`Created new mediasoup router for room ${roomId}`);
        return router;
    }
    return rooms.get(roomId);
};

io.on('connection', async (socket) => {
    // Fix userJoin to properly initialize mediasoup resources
    socket.on("UserJoin", async ({ RoomId, username, email, role }, callback) => {
        try {
            // Initialize mediasoup router for this room
            const router = await initializeMediasoupRoom(RoomId, await worker);
            const rtpCapabilities = router.rtpCapabilities;
            
            console.log('USERJOINED with RTP capabilities:', {
                roomId: RoomId,
                username,
                hasRouter: !!router
            });
            
            callback({ rtpCapabilities });
            
            if (role == 'owner' || role == 'cohost') {
                await pub.hsetnx(`room:${RoomId}`, 'info', JSON.stringify({ owner: email, role }))
                await pub.hset(`room:${RoomId}`, 'socket', socket.id)
            }
            sub.subscribe(RoomId);
            Users[socket.id] = { username, RoomId };
            socket.join(RoomId);
            await pub.hset(`room:${RoomId}:users`, socket.id, `${username}/${role}/${socket.data.authenticated_email}`)
    
            console.log({ RoomId, username, socketid: socket.id })
            console.log(Users);
            // console.log(client)
            await RedisPublish(RoomId, "JOIN", { RoomId, username, socket: socket.id, email: socket.data.authenticated_email, role })
            try {
                const lastCode = await pub.hget(`room:${RoomId}`, 'lastCode')
                    .then(res => JSON.parse(res))
                    .then(res => {
                        pub.persist(`room:${RoomId}`)
                        console.log(res.code);
                        socket.emit("Code Sync", { code: res.code, username: res.username });
                        return res;
                    })
                const room = await Room.findOne({ RoomId });
                room.createdAt = undefined;
    
                // Save the updated room document
                await room.save();
    
                console.log(`Expiration time removed for room ${RoomId} when user ${username} joined`)
    
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
        } catch (error) {
            console.error('Error in UserJoin:', error);
            callback({ error: error.message });
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
        console.log(code);
        var data = qs.stringify({
            code: code,
            language: language,
            input: input || ''
        });
        console.log('language=>', language, code);
        console.log()
        var config = {
            method: 'post',
            url: process.env.COMPILE_URL || 'http://api.codex.jagraav.in' || '',
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

    socket.on("Kick", async ({ RoomId, socketId, role, email }) => {
        // Check permissions and perform kick action as before...

        // Update the room document in the database to reflect the kicked user
        try {
            // const objectRoomId = new mongoose.Types.ObjectId(RoomId);
            const room = Room.findOneAndUpdate(
                { RoomId },
                { $push: { kickedUsers: { email } } },
                { new: true, upsert: true } // To return the updated document
            ).then(updatedRoom => {
                console.log('Room updated successfully with kicked user:', updatedRoom);
            })
                .catch(err => {
                    console.error('Failed to update room:', err);
                });

            // console.log('RoomInfo:=>', room)
            // Add the kicked user's information to the kickedUsers array
            RedisPublish(RoomId, 'Kicked', { socketId, email })

            // Notify other users in the room about the kick (if needed)

            console.log(`User ${socketId} has been kicked out from room ${RoomId} and updated in the database`);
        } catch (error) {
            console.error(`Failed to update room ${RoomId} in the database:`, error);
        }
    });



    RTPHandlers(worker, socket, rooms, producers, consumers, transports);
    // Add this to your main server file or where you initialize socket.io
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [transportId, transport] of transports.entries()) {
            // Close transports that are older than 1 hour and not connected
            if (transport.appData.timestamp && (now - transport.appData.timestamp > 3600000)) {
                if (transport.dtlsState !== 'connected') {
                    console.log(`Cleaning up stale transport: ${transportId}`);
                    transport.close();
                    transports.delete(transportId);
                }
            }
        }
    }, 300000); // Run every 5 minutes


    // Add room cleanup when all users leave
    socket.on('disconnect', async (reason) => {
        const User = Users[socket.id];
        // console.log('room>', Users?.RoomId);
        try {
            await RedisPublish(User?.RoomId, 'LEAVE', { socketId: socket.id, User: User })
            await pub.hdel(`room:${User?.RoomId}:users`, socket.id)
            // console.log("AllUser=>", await AllConnectedUser(User.RoomId).length)
            await AllConnectedUser(User?.RoomId)
                .then(data => {
                    console.log('expire1')
                    if (data.length == 0) {
                        CodeExpire(socket, 300);
                        
                        // Close mediasoup resources for this room
                        if (rooms.has(User?.RoomId)) {
                            console.log(`Closing mediasoup router for empty room ${User?.RoomId}`);
                            // Keep the router in the map, but clean up associated resources
                            // Don't close the router itself to avoid issues with reconnections
                        }
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