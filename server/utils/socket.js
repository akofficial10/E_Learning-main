export const emitSocketEvent = (req, userId, event, data) => {
  const io = req.app.get("io");
  const socketId = io.sockets.sockets.get(userId);

  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};
