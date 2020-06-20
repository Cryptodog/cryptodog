Cryptodog.net = {};
Cryptodog.net.currentStatus = 'online';
Cryptodog.net.connection = null;

Cryptodog.net.currentServer = {};

$(window).ready(function() {
  // Load custom server settings
  Cryptodog.storage.getItem('serverName', function(key) {
      Cryptodog.net.currentServer.name = key ? key : Cryptodog.net.defaultServer.name;
  });
  Cryptodog.storage.getItem('relay', function(key) {
      Cryptodog.net.currentServer.relay = key ? key : Cryptodog.net.defaultServer.relay;
  });

  // Prepares necessary encryption key operations before WebSocket connection.
  // Shows a progress bar while doing so.
  Cryptodog.net.showKeyPreparationDialog = function(callback) {
    Cryptodog.storage.getItem('persistenceEnabled', function(key) {
        var key = key || {};    
        if (key.enabled) {
            Cryptodog.me.mpPrivateKey = Uint8Array.fromWordArray(CryptoJS.enc.Base64.parse(key.mp));
            Cryptodog.me.otrKey = DSA.parsePrivate(key.otr);
        } else {
            Cryptodog.me.mpPrivateKey = Cryptodog.multiParty.genPrivateKey();
        }

        Cryptodog.me.mpPublicKey = Cryptodog.multiParty.genPublicKey(Cryptodog.me.mpPrivateKey);
        Cryptodog.me.mpFingerprint = Cryptodog.multiParty.genFingerprint();

        // If we already have keys, just skip to the callback.
        if (Cryptodog.me.otrKey) {
            callback();
            return;
        }

        $('#loginInfo').text(Cryptodog.locale['loginMessage']['generatingKeys']);

        // Add delay to key generation when on the file protocol
        // Since the UI freezes when generating keys without WebWorkers
        if (window.location.protocol === 'file:') {
            setTimeout(function() {
                Cryptodog.net.prepareKeys(callback);
            }, 100);
        } else {
            Cryptodog.net.prepareKeys(callback);
        }
    });
  }

    // See above.
    Cryptodog.net.prepareKeys = function(callback) {
      // Create DSA key for OTR.
      // file protocol doesn't support WebWorkers
      if (window.location.protocol === 'file:') {
          Cryptodog.me.otrKey = new DSA();
          if (callback) {
              callback();
          }
      } else {
          DSA.createInWebWorker(
              { path: './js/lib/otr/dsa-webworker.js' },
              function (key) {
                  Cryptodog.me.otrKey = key;
                  if (callback) {
                      callback();
                  }
              }
          );
      }
  };

  // Connect anonymously and join conversation.
  Cryptodog.net.connect = function() {
      if (Cryptodog.net.connection && Cryptodog.net.connection.isOpen()) {
        // Connection is already open
        Cryptodog.net.connection.send(Connection.Event.Join, {
          name: Cryptodog.me.nickname,
          room: Cryptodog.me.conversation
        });
        Cryptodog.net.onConnected();
      } else {
        Cryptodog.net.connection = new Connection(Cryptodog.net.currentServer.relay);
        Cryptodog.net.connection.on(Connection.Event.Connected, function() {
          Cryptodog.net.connection.send(Connection.Event.Join, {
            name: Cryptodog.me.nickname,
            room: Cryptodog.me.conversation
          });

          Cryptodog.net.onConnected();
        });
        Cryptodog.net.connection.on(Connection.Event.GroupMessage, Cryptodog.net.onGroupMessage);
        Cryptodog.net.connection.on(Connection.Event.PrivateMessage, Cryptodog.net.onPrivateMessage);
        Cryptodog.net.connection.on(Connection.Event.Join, Cryptodog.net.onJoin);
        Cryptodog.net.connection.on(Connection.Event.Error, Cryptodog.net.onServerError);
        Cryptodog.net.connection.connect();
      }
  };

  // Executes on successfully completed XMPP connection.
  Cryptodog.net.onConnected = function() {
      afterConnect();

      $('#loginInfo').text('✓');
      $('#status').attr('src', 'img/icons/checkmark.svg');
      $('#fill')
          .stop()
          .animate(
              {
                  width: '100%',
                  opacity: '1'
              },
              250,
              'linear'
          );

      window.setTimeout(function() {
          $('#dialogBoxClose').click();
      }, 400);

      window.setTimeout(function() {
          $('#loginOptions,#languages,#customServerDialog').fadeOut(200);
          $('#version,#logoText,#loginInfo,#info').fadeOut(200);
          $('#header').animate({ 'background-color': '#444' });
          $('.logo').animate({ margin: '-11px 5px 0 0' });

          $('#login').fadeOut(200, function() {
              $('#conversationInfo').fadeIn();
              $('#conversationWrapper').fadeIn();
              $('#optionButtons').fadeIn();

              $('#footer')
                  .delay(200)
                  .animate({ height: 60 }, function() {
                      $('#userInput').fadeIn(200, function() {
                          $('#userInputText').focus();
                      });
                  });
              
              buddyList.initialize();
          });
      }, 800);

      Cryptodog.loginError = true;

      document.title = Cryptodog.me.nickname + '@' + Cryptodog.me.conversation;
      $('.conversationName').text(document.title);

      Cryptodog.storage.setItem('nickname', Cryptodog.me.nickname);
  };

  // Handle incoming private messages from the server.
  Cryptodog.net.onPrivateMessage = function(message) {
    const timestamp = chat.timestampString();
    const nickname = message.from;

    var body = message.text;

    // If message is from me, ignore.
    if (nickname === Cryptodog.me.nickname) {
        return true;
    }

    // If message is from someone not on buddy list, ignore.
    if (!Cryptodog.buddies.hasOwnProperty(nickname)) {
        return true;
    }

    const buddy = Cryptodog.buddies[nickname];
    if (buddy.ignored()) {
        return true;
    }

    // Check if this is a private OTR message.
    $('#buddy-' + buddy.id).removeClass('composing');

    if (body.length > Cryptodog.otr.maxMessageLength) {
        console.log('net: refusing to decrypt large OTR message (' + body.length + ' bytes) from ' + nickname);
        return true;
    }

    buddy.otr.receiveMsg(body);
  }

  // Handle incoming group messages from the server.
  Cryptodog.net.onGroupMessage = function(message) {
      const timestamp = chat.timestampString();
      const nickname = message.from;

      var body = message.text;

      // If message is from me, ignore.
      if (nickname === Cryptodog.me.nickname) {
          return true;
      }

      // If message is from someone not on buddy list, ignore.
      if (!Cryptodog.buddies.hasOwnProperty(nickname)) {
          return true;
      }

      const buddy = Cryptodog.buddies[nickname];
      if (buddy.ignored()) {
          return true;
      }

      if (body.length > Cryptodog.multiParty.maxMessageLength) {
        return true;
      }

      // Check if message is a group chat message.
      $('#buddy-' + buddy.id).removeClass('composing');

      try {
          body = Cryptodog.multiParty.decryptMessage(nickname, Cryptodog.me.nickname, body);
      } catch (e) {
          console.log(e);
          chat.addDecryptError(buddy, timestamp);
          return true;
      }
      if (body) {
          chat.addGroupMessage(buddy, timestamp, body);
      }

      return true;
  };

  Cryptodog.net.onServerError = function(message) {
    if (message.error == "Nickname in use.") {
      window.setTimeout(function() {
        Cryptodog.logout();
        Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['nicknameInUse']);
      }, 3000);
      return;
    }
  }

  // Handle incoming user notifications from the server.
  Cryptodog.net.onJoin = function(message) {
      const timestamp = chat.timestampString();
      const nickname = message.from;

      if (!Cryptodog.buddies.hasOwnProperty(nickname)) {
        // Create buddy element if buddy is new
        Cryptodog.addBuddy(nickname);
        chat.addJoin(Cryptodog.buddies[nickname], timestamp);
        
        // Propagate away status to newcomers.
        Cryptodog.net.sendStatus();
      }

      Cryptodog.buddies[nickname].setStatus("online");
  };

  Cryptodog.net.onLeave = function(message) {
    const timestamp = chat.timestampString();
    const nickname = message.from;
    const buddy = Cryptodog.buddies[nickname];
    if (buddy) {
        chat.addLeave(buddy, timestamp);
    }
    Cryptodog.removeBuddy(nickname);
    return true;
  }

  /* Send our multiparty public key to all room occupants. */
  Cryptodog.net.sendPublicKey = function() {
      Cryptodog.net.connection.muc.message(
          Cryptodog.me.conversation + '@' + Cryptodog.net.currentServer.conference,
          null,
          JSON.stringify(new Cryptodog.multiParty.PublicKey(Cryptodog.me.mpPublicKey)),
          null,
          'groupchat',
          'active'
      );
  };

  /* Request public key from `nickname`.
    If `nickname` is omitted, request from all room occupants. */
  Cryptodog.net.requestPublicKey = function(nickname) {
      Cryptodog.net.connection.muc.message(
          Cryptodog.me.conversation + '@' + Cryptodog.net.currentServer.conference,
          null,
          JSON.stringify(new Cryptodog.multiParty.PublicKeyRequest(nickname)),
          null,
          'groupchat',
          'active'
      );
  };

  // Send our current status to the XMPP server.
  Cryptodog.net.sendStatus = function() {
    var status = '';

    if (Cryptodog.net.currentStatus === 'away') {
        status = 'away';
    }
  };

  // Send a pencil notification to the group, or to nickname
  Cryptodog.net.sendComposing = function(nickname) {

  }

  Cryptodog.net.sendPaused = function(nickname) {

  }

  var autoIgnore;

  // Executed (manually) after connection.
  var afterConnect = function() {
      $('.conversationName').animate({ 'background-color': '#0087AF' });

      Cryptodog.net.sendStatus();
      Cryptodog.net.sendPublicKey();
      Cryptodog.net.requestPublicKey();

      clearInterval(autoIgnore);

      autoIgnore = setInterval(function() {
          for (var nickname in Cryptodog.buddies) {
              var buddy = Cryptodog.buddies[nickname];
              
              if (Cryptodog.autoIgnore && buddy.messageCount > Cryptodog.maxMessageCount) {
                  buddy.toggleIgnored();
                  console.log('Automatically ignored ' + nickname);
              }

              buddy.messageCount = 0;
          }
      }, Cryptodog.maxMessageInterval);
  };
});