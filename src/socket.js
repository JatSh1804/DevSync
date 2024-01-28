import { io } from "socket.io-client";
// const token = document.cookie;
// console.log('token=>', token)
export const socketinit = async () => {
    return io('http://localhost:3002/', {
        withCredentials: true
        // auth: {
        //     token: token
        // }
    }, () => { });
}
