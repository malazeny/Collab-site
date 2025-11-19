import { io } from "socket.io-client";

// Replace this with your Render backend URL:
export const socket = io("http://localhost:5173", {
  transports: ["websocket"],
});
