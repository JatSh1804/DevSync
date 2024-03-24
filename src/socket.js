import { io } from "socket.io-client";
// const token = document.cookie;
// console.log('token=>', token)
export const socketinit = async () => {
    return io('/', {
        withCredentials: true
        // auth: {
        //     token: token
        // }
    }, () => { });
}
