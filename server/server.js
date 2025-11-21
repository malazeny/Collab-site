const MAX_SEGMENTS = 4;
let activeSegments = new Set();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  let segment = 0;
  while (activeSegments.has(segment)) {
    segment++;
    if (segment >= MAX_SEGMENTS) segment = 0;
  }

  activeSegments.add(segment);

  console.log(`Assigned segment ${segment} to ${socket.id}`);

  socket.emit("assignedSegment", {
    segment,
    total: MAX_SEGMENTS,
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    activeSegments.delete(segment);
  });

  socket.on("draw", (data) => socket.broadcast.emit("draw", data));
  socket.on("clear", () => socket.broadcast.emit("clear"));
  socket.on("requestReveal", () => io.emit("reveal"));
});
