// Binary Extensions
Cryptodog.bex = {};
Cryptodog.bex.op = {
  // Separates this extension from a regular plaintext Cryptodog message.
  BEX_MAGIC:          [4, 69, 255],

  NOT_VALID:          0,
  // Packet headers
  SET_COLOR:          1,
  PING:               2,
  PONG:               3,
  COMPOSING:          4,
  PAUSED:             5,
  FILE_ATTACHMENT:    6,
  TEXT_MESSAGE:       7,
  FLAG_ME_AS_BOT:     8,
  STATUS_ONLINE:      9,
  STATUS_AWAY:        10,
  // Moderation commands
  MOD_ELECTED:        11,
  // Removes all "borked" users, or users who are not responding to Multiparty messages
  CLEAR_DEAD_USERS:   12,
  SET_CONTROL_TABLE:  13,
  SET_LOCKDOWN_LEVEL: 14,
  // WebRTC
  ICE_CANDIDATE:      30,
  RTC_OFFER:          31,
  RTC_ANSWER:         32
};

Cryptodog.bex.controlTables = {
  nicknames: [],
  keys:      [],
  phrases:   []
};

Cryptodog.bex.mods = [];

Cryptodog.bex.lockdownLevel = 0;

Cryptodog.bex.isModerator = function(nickname) {
  if (Cryptodog.buddies[nickname]) {
    if (Cryptodog.buddies[nickname].authenticated !== 2) {
      return false;
    }
  } else {
    return false;
  }

  return true;
}

Cryptodog.bex.handleSetControlTable = function(nickname, packet) {
  if ([
    "nicknames",
    "keys",
    "phrases"
  ].includes(packet.tableKey)); {
    if (Cryptodog.bex.isModerator(nickname)) {
      Cryptodog.bex.controlTables[packet.tableKey] = packet.table;
    }
  }

  Cryptodog.bex.invokeControlTables();
}

Cryptodog.bex.invokeControlTables = function() {
  Cryptodog.bex.invokeNicknamesTable();
  Cryptodog.bex.invokeKeysTable();
}

Cryptodog.bex.invokeNicknamesTable = function() {
  Object.keys(Cryptodog.buddies)
  .forEach(function(n) {
    for (var i = 0; i < Cryptodog.bex.controlTables.nicknames.length; i++) {
      var nick = new RegExp(Cryptodog.bex.controlTables.nicknames[i]);
      if (nick.test(n)) {
        Cryptodog.removeBuddy(n);
      }
    }
   });
}

Cryptodog.bex.invokeKeysTable = function() {
  Object.keys(Cryptodog.buddies)
  .forEach(function(n) {
    for (var i = 0; i < Cryptodog.bex.controlTables.keys.length; i++) {
      var key = Cryptodog.bex.controlTables.keys[i];
      if (Cryptodog.buddies[n]) {
        if (key === Cryptodog.buddies[n].mpFingerprint) {
          Cryptodog.removeBuddy(n);
        }
      }
    }
   });
}

Cryptodog.bex.handleSetLockdownLevel = function(nickname, packet) {
  if (Cryptodog.bex.isModerator(nickname)) {
    Cryptodog.bex.lockdownLevel = packet.level;
  }
}

Cryptodog.bex.clearDeadUsers = function(nickname, packet) {
  if (Cryptodog.bex.isModerator(nickname)) {
   Object.keys(Cryptodog.buddies)
   .forEach(function(n) {
      var buddy = Cryptodog.buddies[n];
      if (buddy.mpFingerprint === null) {
        Cryptodog.removeBuddy(n);
      }
    });
  }
}

/**
 * @param  {Array} array
 * @return {Uint8Array}
 */
Cryptodog.bex.serialize = function(array) {
  var o = Cryptodog.bex.op;
  var e = new etc.Buffer();
  e.writeBytes(o.BEX_MAGIC);
  e.writeUint(array.length);

  for (var i = 0; i < array.length; i++) {
    var packet = array[i];
    if (!packet.header) {
      e.writeUint(0);
      continue;
    }

    e.writeUint(packet.header);

    switch (packet.header) {
      case o.SET_COLOR:
      var bytes = etc.Encoding.decodeFromHex(packet.color.slice(1));
      if (bytes.length !== 3) {
        e.writeByte(0);
        e.writeByte(0);
        e.writeByte(0);
      } else {
        e.writeByte(bytes[0]);
        e.writeByte(bytes[1]);
        e.writeByte(bytes[2]);
      }
      break;

      case o.PING:
      case o.PONG:
      e.writeUUID(packet.pingID);
      break;

      case o.SET_STATUS:
      e.writeString(packet.status);
      break;

      case o.COMPOSING:
      case o.PAUSED:
      case o.FLAG_ME_AS_BOT:
      case o.STATUS_ONLINE:
      case o.STATUS_AWAY:
      case o.CLEAR_DEAD_USERS:
      break;

      case o.TEXT_MESSAGE:
      e.writeString(packet.messageType);
      e.writeString(packet.message);
      break;

      case o.RTC_OFFER:
      e.writeString(packet.target);
      e.writeString(packet.offerSDP);
      break;

      case o.RTC_ANSWER:
      e.writeString(packet.target);
      e.writeString(packet.answerSDP);
      break;

      case o.ICE_CANDIDATE:
      e.writeString(packet.target);
      e.writeString(packet.candidate);
      e.writeUint(packet.sdpMLineIndex);
      e.writeString(packet.sdpMid);
      break;

      case o.FILE_ATTACHMENT:
      e.writeUint(packet.prefixSize);
      e.writeBytes(packet.fileEncryptionKey);
      e.writeBytes(packet.fileNonce);
      e.writeString(packet.fileMime);
      e.writeUUID(packet.fileID);
      break;

      case o.SET_LOCKDOWN_LEVEL:
      e.writeUint(packet.level);
      break;

      case o.SET_CONTROL_TABLE:
      e.writeString(packet.tableKey);
      e.writeUint(packet.table.length);
      for (var i = 0; i < packet.table.length; i++) {
        e.writeString(packet.table[i]);
      }
      break;
    }
  }

  return e.finish();
}


Cryptodog.bex.headerBytes = function(bytes) {
  if (bytes[0] == Cryptodog.bex.op.BEX_MAGIC[0] &&
      bytes[1] == Cryptodog.bex.op.BEX_MAGIC[1] && 
      bytes[2] == Cryptodog.bex.op.BEX_MAGIC[2]) return true;
  return false;
}

/**
 * @param  {Uint8Array} bytes 
 * @return {Array}
 */
Cryptodog.bex.deserialize = function (bytes) {
  var b        = new etc.Buffer(bytes);
  var packets  = [];
  var o = Cryptodog.bex.op;

  var packetHeader = b.readBytes(3);

  if (Cryptodog.bex.headerBytes(packetHeader) == false) {
    return [];
  }

  var elements = b.readUint();
  if (elements > 8) return;

  for (var i = 0; i < elements; i++) {
    var pack = {};
    pack.header = b.readUint();

    switch (pack.header) {
      // User color settings
      case o.SET_COLOR:

      // No need for escaping or validation, as any 3-byte array represents a color in hexadecimal
      var colorCodes = b.readBytes(3);
      pack.color     = "#" + etc.Encoding.encodeToHex(colorCodes);
      break;

      case o.PING:
      case o.PONG:
      pack.pingID = b.readUUID();
      break;
  
      case o.FILE_ATTACHMENT:
      pack.prefixSize        = b.readUint();
      pack.fileEncryptionKey = b.readBytes(32);
      pack.fileNonce         = b.readBytes(24);
      pack.fileMime          = b.readString();
      pack.fileID            = b.readUUID();
      break;
  
      case o.SET_STATUS:
      pack.status = b.readString();
      break;
  
      // Headers which have no body
      case o.COMPOSING:
      case o.PAUSED:
      case o.FLAG_ME_AS_BOT:
      break;
  
      case o.MESSAGE:
      pack.message = b.readString();
      break;

      // WebRTC metadata
      case o.RTC_OFFER:
      pack.target = b.readString();
      pack.offerSDP  = b.readString();
      break;

      case o.RTC_ANSWER:
      pack.target = b.readString();
      pack.answerSDP = b.readString();
      break;

      case o.ICE_CANDIDATE:
      pack.target = b.readString();
      pack.candidate = b.readString();
      pack.sdpMLineIndex = b.readUint();
      pack.sdpMid = b.readString();
      break;

      case o.SET_LOCKDOWN_LEVEL:
      pack.level = b.readUint();
      break;

      case o.SET_CONTROL_TABLE:
      pack.tableKey = b.readString();
      pack.table = new Array(b.readUint());
      for (var i = 0; i < pack.table.length; i++) {
        pack.table[i] = b.readString();
      }
      break;
    }

    packets.push(pack);
  }

  return packets;
}

/**
 * Handles BEX data from the group conversation
 * 
 * @param {String}     nickname
 * @param {Uint8Array} data
 */
Cryptodog.bex.onGroup = function (nickname, data) {
  var o = Cryptodog.bex.op;
  var packs = Cryptodog.bex.deserialize(data);

  if (Cryptodog.buddies[nickname] && Cryptodog.buddies[nickname].ignored()) {
    return;
  }

  console.log("BEX data from", nickname, data);

  packs.forEach(function (packet) {
    switch (packet.header) {
      case o.COMPOSING:
      $('#buddy-' + Cryptodog.buddies[nickname].id).addClass('composing');
      break;

      case o.PAUSED:
      $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing');
      break;

      case o.FILE_ATTACHMENT:
      Cryptodog.bex.handleAttachment('groupChat', nickname, packet);
      break;

      case o.FLAG_ME_AS_BOT:
      Cryptodog.buddies[nickname].setBot(true);
      break;

      case o.SET_COLOR:
      if (Cryptodog.buddies[nickname].lastColorChange) {
        // Penalty for repeated quick color changes
        if ((Date.now() - Cryptodog.buddies[nickname].lastColorChange) < 1500) {
          Cryptodog.buddies[nickname].lastColorChange = Date.now();
          return;
        }
      }

      Cryptodog.buddies[nickname].lastColorChange = Date.now();
      Cryptodog.changeBuddyColor(nickname, packet.color);
      break;

      case o.ICE_CANDIDATE:
      if (packet.target === Cryptodog.me.nickname) {
        if (Cryptodog.buddies[nickname] && Cryptodog.bex.rtcEnabled) {
          if (Cryptodog.buddies[nickname].rtc) {
            Cryptodog.buddies[nickname].rtc.rtcConn.addIceCandidate(
              new RTCIceCandidate({
                sdpMLineIndex: packet.sdpMLineIndex,
                sdpMid:        packet.sdpMid,
                candidate:     packet.candidate
              }));
            }
        }
      }
      break;

      case o.RTC_ANSWER:
      if (packet.target === Cryptodog.me.nickname) {
        Cryptodog.bex.handleRTCAnswer(nickname, packet);
      }
      break;

      case o.RTC_OFFER:
      if (packet.target === Cryptodog.me.nickname) {
        Cryptodog.bex.handleRTCOffer(nickname, packet);
        break;
      }
      break;

      case o.SET_LOCKDOWN_LEVEL:
      Cryptodog.bex.handleSetLockdownLevel(nickname, packet);
      break;

      case o.SET_CONTROL_TABLE:
      Cryptodog.bex.handleSetControlTable(nickname, packet);
      break;
    }
  });
}

Cryptodog.bex.lastTransmissionGroup = 0;
Cryptodog.bex.lastTransmissionFrom  = "";

Cryptodog.bex.transmitGroup = function (packets) {
  function timeoutToTransmit() {
    // Timeout to avoid messages being dropped by the serverside rate limiter.
    var sinceLast = (Date.now() - Cryptodog.bex.lastTransmissionGroup);
    if (sinceLast < 1024) {
      var timeout = 1536;
      if (Cryptodog.bex.lastTransmissionFrom === Cryptodog.me.nickname) {
        timeout += 512;
      }
      setTimeout(timeoutToTransmit, timeout);
    } else {
      transmit();
    }
  }

  timeoutToTransmit();

  function transmit() {
    Cryptodog.bex.lastTransmissionGroup = Date.now();
    Cryptodog.bex.lastTransmissionFrom = Cryptodog.me.nickname;
    var data = Cryptodog.bex.serialize(packets);
    var base64 = etc.Encoding.encodeToBase64(data);
    var encrypted = Cryptodog.multiParty.sendMessage(base64, true);

    if (Cryptodog.xmpp.connection === null) {
      return;
    }

    Cryptodog.xmpp.connection.muc.message(
      Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
      null, encrypted, null, 'groupchat', 'active');
  }
}

Cryptodog.bex.transmitPrivateUnreliably = function (nickname, packets) {
  var buffer = Cryptodog.bex.serialize(packets);
  
  var bud = Cryptodog.buddies[nickname];
  if (bud) {
    bud.otr.sendMsg(etc.Encoding.encodeToBase64(buffer));
  } else {
    console.warn("No buddy", nickname);
  }
}

Cryptodog.bex.transmitPrivate = function (nickname, packets) {
  var buffer = Cryptodog.bex.serialize(packets);
  Cryptodog.xmpp.sendReliablePrivateMessage(nickname, buffer);
}

Cryptodog.bex.maxFileSize = 1024 * 1024 * 10;

Cryptodog.bex.mimeExtensions = {
	"application/gz":               "gz",
	"application/zip":              "zip",
	"application/x-zip-compressed": "zip",
	"image/jpeg":                   "jpg",
	"image/png":                    "png",
  "image/gif":                    "gif",
  "video/mp4":                    "mp4",
  "video/webm":                   "webm",
  "audio/ogg":                    "ogg",
  "audio/mp3":                    "mp3"
};

Cryptodog.bex.rtcConstraints = {
  optional: [{
    DtlsSrtpKeyAgreement: true
  }],
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: false
  }
};

if (typeof navigator.mozGetUserMedia !== "undefined") {
  Cryptodog.bex.rtcConstraints.offerToReceiveAudio = true;
  Cryptodog.bex.rtcConstraints.offerToReceiveVideo = false;
}

Cryptodog.bex.handleAttachment = function(id, nickname, data) {
  var okay = Object.keys(Cryptodog.bex.mimeExtensions);
  if (okay.includes(data.fileMime) === false) {
    return;
  }

  Cryptodog.pushAndRedraw(id, {
    type:     "filelink",
    nickname: nickname,
    prefixSize: data.prefixSize,
    nonce:    data.fileNonce,
    key:      data.fileEncryptionKey,
    mime:     data.fileMime,
    fileID:   data.fileID.toString(),
    color:    Cryptodog.getUserColor(nickname)
  });
}


// Detect if this browser has support for WebRTC.
Cryptodog.bex.rtcSupport = function() {
  var acceptedProtocols = [
    "moz-extension:",
    "chrome-extension:",
    "file:",
    "https:"
  ];

  if (acceptedProtocols.includes(window.location.protocol) === false) {
    console.warn(window.location.protocol + " cannot be used with WebRTC");
    return false;
  }

  return typeof window.RTCPeerConnection !== "undefined";
}

/**
 * Handles BEX data from a private conversation
 * 
 * @param {String}     nickname
 * @param {Uint8Array} data
 */
Cryptodog.bex.onPrivate = function (nickname, data) {
  var o     = Cryptodog.bex.op;
  var packs = Cryptodog.bex.deserialize(data);

  if (Cryptodog.buddies[nickname] && Cryptodog.buddies[nickname].ignored()) {
    return;
  }

  packs.forEach(function (packet) {
    switch (packet.header) {
      case o.PING:
      // Prevent latency measurement with random sleeping
      window.setTimeout(function(pack) {
        console.log("Sending pong packet", pack);
        Cryptodog.bex.transmitPrivate(nickname, [
          { header: o.PONG, pingID: pack.pingID }
        ])
      }, etc.RandomInt(500, 1500), packet);
      break;

      case o.PONG:
      var bud = Cryptodog.buddies[nickname]
      if (bud.pingCB && bud.pingID.toString() === packet.pingID.toString()) {
        bud.pingCB(true);
      }
      break;

      case o.COMPOSING:
      $('#buddy-' + Cryptodog.buddies[nickname].id).addClass('composing');
      break;

      case o.PAUSED:
      $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing');
      break;
 
      case o.FILE_ATTACHMENT:
      Cryptodog.bex.handleAttachment(Cryptodog.buddies[nickname].id, nickname, packet);
      break;
    }
  });
}

Cryptodog.bex.voiceChatInitialized = false;

Cryptodog.bex.voiceChat = {};

Cryptodog.bex.server = "https://bex.pg.ikrypto.club/";

Cryptodog.bex.iceCfg = {
  // Force peers to go through TURN server
  // Prevents IP leakage, but at the cost of additional latency :(
  "iceTransportPolicy": "relay",

  "iceServers": [{
    "url":        "turn:" + new etc.URL(Cryptodog.bex.server).hostname + ":3478",
    "username":   "cryptodog",
    "credential": "preventing-ip-leakage"
  }]
};

Cryptodog.bex.strings = {
  noMic:      "No microphone: Click to request microphone permissions.",
  mutedMic:   "Microphone: muted",
  unmutedMic: "Microphone: unmuted",

  voiceConnected:    "Voice chat: connected",
  voiceDisconnected: "Voice chat: disconnected",
}

Cryptodog.bex.disconnectRTCVoiceChat = function() {
  var $this = $("#voiceChatBtn");
  if ($($this).attr("data-utip") == Cryptodog.bex.strings.voiceConnected) {
    Cryptodog.bex.rtcEnabled = false;
    $($this).attr("data-utip", Cryptodog.bex.strings.voiceDisconnected);
    $($this).attr("src", "img/icons/voice-disconnected.svg");
  }

  Cryptodog.bex.micState = "none";
  $this = $("#micToggleBtn")
  $this.attr("data-utip", Cryptodog.bex.strings.noMic);
  $this.attr("src", "img/icons/mic-none.svg");
  Cryptodog.bex.killVoiceStream();

  Object.keys(Cryptodog.buddies).forEach(function(nickname) {
    var buddy = Cryptodog.buddies[nickname];
    if (buddy.rtc && buddy.rtc.rtcConn) {
      buddy.rtc.rtcConn.close();

      buddy.rtc.tracks.forEach(function(track) {
        track.pause();
        track = null;
      });

      buddy.rtc = null;
    }
  });
}

Cryptodog.bex.initRTCVoiceChat = function(stream) {
  Cryptodog.bex.voiceChatInitialized = true;

  Cryptodog.bex.voiceStream = stream;

  Object.keys(Cryptodog.buddies).forEach(function(bd) {
    Cryptodog.bex.connectStreamToPeer(bd, stream);
  });
}

Cryptodog.bex.handleRTCAnswer = function (nickname, packet) {
  if (Cryptodog.bex.voiceChatInitialized && Cryptodog.bex.rtcEnabled) {
    if (Cryptodog.bex.rtcSupport() && typeof Cryptodog.buddies[nickname].rtc !== "undefined") {
      var gcv = Cryptodog.buddies[nickname].rtc;
      gcv.rtcConn.setRemoteDescription(
        new RTCSessionDescription({
          type: "answer",
          sdp:  packet.answerSDP
        }),
        function() {
          console.log("RTC set remote description")
        },
        function(error) {
          console.warn("answer error", error)
        }
      );
    }
  }
}

Cryptodog.bex.checkConnectionChange = function (nickname) {
  if (!Cryptodog.buddies[nickname]) {
    return false;
  }

  var gcv = Cryptodog.buddies[nickname].rtc;
  if (gcv === null) {
    return;
  }

  if (gcv.initialized == true) {
    return false;
  }

  var chk = ["completed", "connected"].includes(gcv.rtcConn.iceConnectionState);
  gcv.initialized = chk;
  return chk;
}

Cryptodog.bex.handleRTCOffer = function (nickname, packet) {
  var o = Cryptodog.bex.op;

  if (Cryptodog.bex.voiceChatInitialized && Cryptodog.bex.rtcEnabled) {
    if (Cryptodog.bex.rtcSupport()) {
      if (typeof Cryptodog.buddies[nickname].rtc !== "undefined") {
        Cryptodog.buddies[nickname].rtc.rtcConn.close();
        Cryptodog.buddies[nickname].rtc = null;
      }

      var gcv = {
        tracks: []
      };

      Cryptodog.buddies[nickname].rtc = gcv;
      gcv.rtcConn = new RTCPeerConnection(Cryptodog.bex.iceCfg);

      gcv.rtcConn.oniceconnectionstatechange = function(ev) {
        if (Cryptodog.bex.checkConnectionChange(nickname)) {
          console.log("Connected to " + nickname + "'s RTCPeerConnection");
        }
      }

      gcv.rtcConn.ontrack = Cryptodog.bex.onVoiceTrack.bind(null, nickname);
      
      gcv.rtcConn.onicecandidate = function(ev) {
        if (ev.candidate) {
          Cryptodog.bex.transmitGroup([
            {header:        o.ICE_CANDIDATE,
             target:        nickname,
             candidate:     ev.candidate.candidate,
             sdpMLineIndex: ev.candidate.sdpMLineIndex,
             sdpMid:        ev.candidate.sdpMid
            }
          ]);
        }
      }

      if (Cryptodog.bex.voiceStream) {
        Cryptodog.bex.voiceStream.getAudioTracks().map(function(mstreamtrack) {
          gcv.rtcConn.addTrack(mstreamtrack, Cryptodog.bex.voiceStream);
        });
      }

      gcv.rtcConn.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp:  packet.offerSDP
        }),
        function() {  
          gcv.rtcConn.createAnswer(function(answer) {
            gcv.rtcConn.setLocalDescription(
              answer,
              function() {
                Cryptodog.bex.transmitGroup([{
                  header:     o.RTC_ANSWER,
                  target:     nickname,
                  answerSDP:  answer.sdp
                }])
              },
              function(error) {
                console.warn(error)
              }
            );
          },
          function(error) {
            console.warn(error)
          },
          Cryptodog.bex.rtcConstraints
        );
        },
        function(error) {
          console.warn(error)
        }
      );
    }
  }
}

window.AudioContext = window.AudioContext || window.webkitAudioContext;

Cryptodog.bex.onVoiceTrack = function(nickname, evt) {
  var track = new Audio();
  track.srcObject = evt.streams[0];
  track.volume = .5;
  track.play();

  var buddy = Cryptodog.buddies[nickname].rtc;

  buddy.tracks.push(track);

  // Setup peer volume meter
  if (buddy.meter) {
    buddy.meterCtx.close()
    buddy.meterCtx = null;
    buddy.meter.stop();
    buddy.meter = null;
  }

  buddy.meterConnected = false;

  buddy.meterCtx = new AudioContext();
  buddy.meter = new SoundMeter(buddy.meterCtx);

  buddy.meter.connectToSource(track.srcObject, function() {
    buddy.meterConnected = true;
  });
}

Cryptodog.bex.connectStreamToPeer = function(peer, stream) {
  var gcv = {
    tracks: []
  };

  Cryptodog.buddies[peer].rtc = gcv;

  gcv.rtcConn = new RTCPeerConnection(Cryptodog.bex.iceCfg);

  gcv.rtcConn.oniceconnectionstatechange = function(ev) {
    if (Cryptodog.bex.checkConnectionChange(peer)) {
    }
  }

  gcv.rtcConn.ontrack = Cryptodog.bex.onVoiceTrack.bind(null, peer);

  gcv.rtcConn.onicecandidate = function(ev) {
    if (ev.candidate) {
      Cryptodog.bex.transmitGroup([
        {header:        Cryptodog.bex.op.ICE_CANDIDATE,
         target:        peer,
         candidate:     ev.candidate.candidate,
         sdpMLineIndex: ev.candidate.sdpMLineIndex,
         sdpMid:        ev.candidate.sdpMid}
      ]);
    }
  }

  if (stream) {
    stream.getAudioTracks().map(function(mstreamtrack) {
      gcv.rtcConn.addTrack(mstreamtrack, stream);
    });
  }

  gcv.rtcConn.createOffer(
    function(localDesc) {
      gcv.rtcConn.setLocalDescription(localDesc, function() {
        Cryptodog.bex.transmitGroup([
          {
            header:     Cryptodog.bex.op.RTC_OFFER,
            target:     peer,
            offerSDP:   localDesc.sdp
          }
        ])
      }, function(setLocalError) {
        console.warn("Failure", setLocalError)
      });
    },

    function(descError) {
      console.warn("Failure", descError)
    },
  
    Cryptodog.bex.rtcConstraints);
}

Cryptodog.bex.killVoiceStream = function() {
  if (Cryptodog.bex.voiceStream) {
    Cryptodog.bex.voiceStream.getTracks().forEach(function(track) {
        track.stop();
    });

    delete Cryptodog.bex.voiceStream;
  }
}

Cryptodog.bex.updateLevelDisplay = function() {
  if (!Cryptodog.bex.rtcEnabled) {
    Object.keys(Cryptodog.buddies)
    .forEach(function(bud) {
      bud = Cryptodog.buddies[bud];
      $('#buddy-' + bud.id).removeClass('speaking');
    });

    return;
  }

  Object.keys(Cryptodog.buddies)
  .forEach(function(bud) {
    bud = Cryptodog.buddies[bud];

    if (bud) {
      if (bud.rtc) {
        if (bud.rtc.meter) {
          var value = bud.rtc.meter.slow;
          if (value >= .001) {
            $('#buddy-' + bud.id).addClass('speaking');
          } else {
            $('#buddy-' + bud.id).removeClass('speaking');
          }
        } 
      }
    }
  });
}

// Ping a user and call back once a session is successfully established that can begin to send messages.
Cryptodog.bex.pingUserPrivate = function(user, cb) {
  var bud = Cryptodog.buddies[user];
  if (!bud) {
    cb(false);
    return;
  }

  if (bud.receivedMessage === true) {
    cb(true);
    return;
  }

  if (bud.pingID) {
    bud.pingResults.push(cb);
    return;
  } else {
    bud.pingID = new etc.UUID();
  } 

  bud.pingResults = [cb];
  bud.pingCB = function(result) {
    if (bud.pingSuccess) {
      return;
    }
    bud.pingSuccess = result;
    bud.pingResults.map(function(result) {
      result(result);
    });
  }

  Cryptodog.bex._ping(user, 0);
}

Cryptodog.bex._ping = function(user, errors) {
  var bud = Cryptodog.buddies[user];

  if (!bud) {
    return;
  }

  if (bud.otr.msgstate === OTR.CONST.MSGSTATE_PLAINTEXT) {
    bud.otr.sendQueryMsg();
  }

  if (errors > 4) {
    bud.pingCB(false);
    return;
  }

  setTimeout(function() {
    if (bud.pingSuccess) {
      return;
    }

    errors++;
    Cryptodog.bex._ping(user, errors);
  }, 256);

  Cryptodog.bex.transmitPrivateUnreliably(user, [
    { header: Cryptodog.bex.op.PING,
      pingID: bud.pingID }]);
}

Cryptodog.bex.ensureOTR = function(user, cb) {
  if (Cryptodog.buddies[user]) {
    if (Cryptodog.buddies[user].pingSuccess) {
      cb();
      return;
    }

    Cryptodog.bex.pingUserPrivate(user, cb);
  }
}

Cryptodog.bex.kick = function(user) {
  if (!Cryptodog.buddies[user]) return;

  Cryptodog.bex.controlTables.keys.push(Cryptodog.buddies[user].mpFingerprint);
  Cryptodog.bex.syncKeysTable();
  Cryptodog.bex.invokeKeysTable();
}

Cryptodog.bex.lockdown = function(l) {
  Cryptodog.bex.lockdownLevel = l;

  Cryptodog.bex.transmitGroup([
    { header: Cryptodog.bex.op.SET_LOCKDOWN_LEVEL,
      level:  Cryptodog.bex.lockdownLevel }
  ]);
}

Cryptodog.bex.syncKeysTable = function() {
  Cryptodog.bex.syncTable("keys");
}

Cryptodog.bex.syncTable = function(key) {
  Cryptodog.bex.transmitGroup([
    { header:   Cryptodog.bex.op.SET_CONTROL_TABLE, 
      tableKey: key,
      table:    Cryptodog.bex.controlTables[key]
    }
  ]);
}