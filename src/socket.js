import { io } from "socket.io-client";

export const socketinit = async () => {
    return io("http://localhost:3002", () => { });
}
