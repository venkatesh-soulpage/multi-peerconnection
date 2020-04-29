require("dotenv").config();

var port = process.env.PORT || 3000;

var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var twilio = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
app.use(express.static("public"));

io.on("connection", function (socket) {
  io.sockets.emit(
    "user-joined",
    socket.id,
    io.engine.clientsCount,
    Object.keys(io.sockets.clients().sockets)
  );
  socket.on("token", function () {
    console.log("Received token request");
    twilio.tokens.create(function (err, response) {
      if (err) {
        console.log(err);
      } else {
        // Return the token to the browser.
        console.log("Token generated. Returning it to the client");
        socket.emit(
          "token",
          response,
          socket.id,
          io.engine.clientsCount,
          Object.keys(io.sockets.clients().sockets)
        );
      }
    });
  });
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

http.listen(port, () => console.log(`listening on *: ${port}`));
