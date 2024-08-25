import { io } from "socket.io-client";
import { apiRoute } from "../environment";
// const token = document.cookie;
// console.log('token=>', token)
export const socketinit = async (query) => {
    return io( `${apiRoute}/`, {
        withCredentials: true,
        // auth: {
        //     token: token
        // }
        query
    }, () => { });
}
