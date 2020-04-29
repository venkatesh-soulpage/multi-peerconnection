var VideoChat = {
  localVideo: document.getElementById("localVideo"),
  videoButton: $("#get-video"),
  callButton: $("#call"),
  connections: [],
  constraints: {
    video: true,
    audio: true,
  },
  saveConfig: function (token) {
    VideoChat.twilioConfig = {
      iceServers: token.iceServers,
    };
  },
  requestMediaStream: function () {
    navigator.mediaDevices
      .getUserMedia(VideoChat.constraints)
      .then(VideoChat.onMediaStream)
      .catch(VideoChat.onMediaError);
  },
  onMediaStream: function (stream) {
    VideoChat.localVideo.srcObject = stream;
    VideoChat.localStream = stream;
    VideoChat.callButton.removeAttr("disabled");
  },
  onMediaError: function (error) {
    console.log(error);
  },
  onToken: function () {
    VideoChat.socket = io.connect();
    VideoChat.socket.on("signal", VideoChat.fromServer);
    VideoChat.socket.on("connect", function () {
      VideoChat.socketId = VideoChat.socket.id;

      VideoChat.socket.on("user-left", VideoChat.onDisconnect);

      VideoChat.socket.on("user-joined", VideoChat.onJoin);
    });
    VideoChat.socket.on("token", VideoChat.saveConfig);
    VideoChat.socket.emit("token");
  },
  onJoin: function (id, count, clients) {
    clients.forEach(function (socketListId) {
      if (!VideoChat.connections[socketListId]) {
        VideoChat.connections[socketListId] = new RTCPeerConnection(
          VideoChat.twilioConfig
        );
        //Wait for their ice candidate
        VideoChat.connections[socketListId].onicecandidate = function () {
          VideoChat.onIceCandidate(event, socketListId);
        };

        //Wait for their video stream
        VideoChat.connections[socketListId].onaddstream = function () {
          VideoChat.onAddStream(event, socketListId);
        };

        //Add the local video stream
        VideoChat.connections[socketListId].addStream(VideoChat.localStream);
      }
    });

    //Create an offer to connect with your local description

    VideoChat.connections[id].createOffer().then(function (offer) {
      VideoChat.onCandidate(id, offer);
    });
  },
  onDisconnect: function (id) {
    var video = document.querySelector('[data-socket="' + id + '"]');
    var parentDiv = video.parentElement;
    parentDiv.removeChild(video);
  },
  onAddStream: function (event, id) {
    var video = document.createElement("video");

    video.setAttribute("data-socket", id);
    video.srcObject = event.stream;
    video.autoplay = true;
    video.playsinline = true;

    document.querySelector("#remoteVideo").appendChild(video);
  },
  onIceCandidate: function (event, socketListId) {
    if (event.candidate != null) {
      console.log("SENDING ICE");
      VideoChat.socket.emit(
        "signal",
        socketListId,
        JSON.stringify({ ice: event.candidate })
      );
    }
  },
  onCandidate: function (fromId, description) {
    VideoChat.connections[fromId]
      .setLocalDescription(description)
      .then(function () {
        VideoChat.socket.emit(
          "signal",
          fromId,
          JSON.stringify({
            sdp: VideoChat.connections[fromId].localDescription,
          })
        );
      })
      .catch((e) => console.log(e));
  },
  fromServer: function (fromId, message) {
    //Parse the incoming signal
    var signal = JSON.parse(message);

    //Make sure it's not coming from yourself
    if (fromId != VideoChat.socketId) {
      if (signal.sdp) {
        VideoChat.connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(function () {
            if (signal.sdp.type == "offer") {
              VideoChat.connections[fromId]
                .createAnswer()
                .then(function (description) {
                  VideoChat.onCandidate(fromId, description);
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        VideoChat.connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  },
};

VideoChat.videoButton.click(function () {
  VideoChat.requestMediaStream();
});
VideoChat.callButton.click(function () {
  VideoChat.onToken();
});
