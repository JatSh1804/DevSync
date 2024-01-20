import { io } from "socket.io-client";

export const socketinit = async () => {
    return io(process.env.SOCKET_LINK || "/", {
        auth: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXNzIjoiMTIzNDU2IiwibmFtZSI6IkphdGluIiwiaWF0IjoxNTE2MjM5MDIyfQ.Afl2vu2OwaB0caqnGZSimFiCWji4k3bnJzhYZKge-2w'
        }
    }, () => { });
}
