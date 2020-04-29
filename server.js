var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", function (socket) {
  io.sockets.emit(
    "user-joined",
    socket.id,
    io.engine.clientsCount,
    Object.keys(io.sockets.clients().sockets)
  );

  socket.on("signal", (toId, message) => {
    io.to(toId).emit("signal", socket.id, message);
  });

  socket.on("message", function (data) {
    io.sockets.emit("broadcast-message", socket.id, data);
  });

  socket.on("disconnect", function () {
    io.sockets.emit("user-left", socket.id);
  });
});

http.listen(3000, function () {
  console.log("listening on *:3000");
});
