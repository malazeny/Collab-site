import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

const MAX_SEGMENTS = 3;
let activeSegments = new Set();

console.log("MAX_SEGMENTS IS:", MAX_SEGMENTS);

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    let segment = 0;
    while (activeSegments.has(segment)) {
      segment++;
      if (segment >= MAX_SEGMENTS) segment = 0;
    }

    activeSegments.add(segment);
    console.log("ACTIVE SEGMENTS NOW:", Array.from(activeSegments));
    console.log(`Assigned segment ${segment} to ${socket.id}`);


  socket.emit("assignedSegment", {
    segment,
    total: MAX_SEGMENTS,
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    activeSegments.delete(segment);
    console.log("ACTIVE SEGMENTS NOW:", Array.from(activeSegments));
  });

  socket.on("draw", (data) => socket.broadcast.emit("draw", data));
  socket.on("clear", () => socket.broadcast.emit("clear"));
  socket.on("requestReveal", () => io.emit("reveal"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});