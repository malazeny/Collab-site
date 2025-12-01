import { io } from "socket.io-client";

export const socket = io("https://collab-site.onrender.com", {
  transports: ["websocket"],
  autoConnect: true,
});
