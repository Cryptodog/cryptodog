Cryptodog.net = {};
Cryptodog.net.currentStatus = 'online';
Cryptodog.net.defaultServer = {
    name: 'Cryptodog',
    relay: 'ws://staging.crypto.dog:8009/ws',
};

Cryptodog.net.currentServer = Object.assign({}, Cryptodog.net.defaultServer);

$(window).ready(function () {
    let defaultServer = Cryptodog.net.defaultServer;

    let currentServer = {};
    let connection = null;

    // Load custom server settings
    Cryptodog.storage.getItem('serverName', function (key) {
        currentServer.name = key ? key : defaultServer.name;
    });
    Cryptodog.storage.getItem('relay', function (key) {
        currentServer.relay = key ? key : defaultServer.relay;
    });

    // Prepares necessary encryption key operations before WebSocket connection.
    // Shows a progress bar while doing so.
    Cryptodog.net.showKeyPreparationDialog = function (callback) {
        Cryptodog.storage.getItem('persistenceEnabled', function (key) {
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
                setTimeout(function () {
                    Cryptodog.net.prepareKeys(callback);
                }, 100);
            } else {
                Cryptodog.net.prepareKeys(callback);
            }
        });
    };

    // See above.
    Cryptodog.net.prepareKeys = function (callback) {
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
    Cryptodog.net.connect = function () {
        if (connection && connection.isOpen()) {
            // Connection is already open
            connection.send(Connection.Event.Join, {
                name: Cryptodog.me.nickname,
                room: Cryptodog.me.conversation
            });
            Cryptodog.net.onConnected();
        } else {
            connection = new Connection(currentServer.relay);

            connection.on(Connection.Event.Connected, function () {
                connection.send(Connection.Event.Join, {
                    name: Cryptodog.me.nickname,
                    room: Cryptodog.me.conversation
                });
                Cryptodog.net.onConnected();
            });
            connection.on(Connection.Event.Join, Cryptodog.net.onJoin);
            connection.on(Connection.Event.Roster, Cryptodog.net.onRoster);
            connection.on(Connection.Event.GroupMessage, Cryptodog.net.onGroupMessage);
            connection.on(Connection.Event.PrivateMessage, Cryptodog.net.onPrivateMessage);
            connection.on(Connection.Event.Leave, Cryptodog.net.onLeave);
            connection.on(Connection.Event.Error, Cryptodog.net.onError);

            connection.connect();
        }
    };

    // Executes on successfully completed XMPP connection.
    Cryptodog.net.onConnected = function () {
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

        window.setTimeout(function () {
            $('#dialogBoxClose').click();
        }, 400);

        window.setTimeout(function () {
            $('#loginOptions,#languages,#customServerDialog').fadeOut(200);
            $('#version,#logoText,#loginInfo,#info').fadeOut(200);
            $('#header').animate({ 'background-color': '#444' });
            $('.logo').animate({ margin: '-11px 5px 0 0' });

            $('#login').fadeOut(200, function () {
                $('#conversationInfo').fadeIn();
                $('#conversationWrapper').fadeIn();
                $('#optionButtons').fadeIn();

                $('#footer')
                    .delay(200)
                    .animate({ height: 60 }, function () {
                        $('#userInput').fadeIn(200, function () {
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
    Cryptodog.net.onPrivateMessage = function (message) {
        const timestamp = chat.timestamp();

        // If message is from me, ignore.
        if (message.from === Cryptodog.me.nickname) {
            return true;
        }

        // If message is from someone not on buddy list, ignore.
        if (!Cryptodog.buddies.hasOwnProperty(message.from)) {
            return true;
        }

        const buddy = Cryptodog.buddies[message.from];
        if (buddy.ignored()) {
            return true;
        }

        // Check if this is a private OTR message.
        $('#buddy-' + buddy.id).removeClass('composing');

        if (message.text.length > Cryptodog.otr.maxMessageLength) {
            console.log('net: refusing to decrypt large OTR message (' + message.text.length + ' bytes) from ' + message.from);
            return true;
        }

        buddy.otr.receiveMsg(message.text);
    };

    // Handle incoming group messages from the server.
    Cryptodog.net.onGroupMessage = function (message) {
        const timestamp = chat.timestamp();
        const from = message.from;

        // If message is from me, ignore.
        if (from === Cryptodog.me.nickname) {
            return true;
        }

        // If message is from someone not on buddy list, ignore.
        if (!Cryptodog.buddies.hasOwnProperty(from)) {
            return true;
        }

        const buddy = Cryptodog.buddies[from];
        if (buddy.ignored()) {
            return true;
        }

        if (message.text.length > Cryptodog.multiParty.maxMessageLength) {
            return true;
        }

        try {
            var groupMessage = JSON.parse(message.text);
        } catch (e) {
            console.log(e);
            return true;
        }

        if (groupMessage.type === 'composing') {
            $('#buddy-' + buddy.id).addClass('composing');
        } else if (groupMessage.type === 'paused') {
            $('#buddy-' + buddy.id).removeClass('composing');
        } else {
            try {
                var decrypted = Cryptodog.multiParty.decryptMessage(from, Cryptodog.me.nickname, groupMessage);
            } catch (e) {
                console.log(e);
                chat.addDecryptError(buddy, timestamp);
                return true;
            }
            if (decrypted) {
                chat.addGroupMessage(buddy, timestamp, decrypted);
            }
            $('#buddy-' + buddy.id).removeClass('composing');
        }
        return true;
    };

    Cryptodog.net.onError = function (message) {
        if (message.error == "Nickname in use.") {
            window.setTimeout(function () {
                Cryptodog.logout();
                Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['nicknameInUse']);
            }, 3000);
            return;
        } else {
            console.error('Server error: ' + message.error);
        }
    };

    Cryptodog.net.onRoster = function (message) {
        // Add buddies in the roster
        for (let buddyNickname of message.users) {
            if (!Cryptodog.buddies[buddyNickname]) {
                let buddy = Cryptodog.addBuddy(buddyNickname);
                chat.addJoin(buddy, chat.timestamp());
            }
        }

        // Remove buddies if their names do not appear in the roster
        for (let buddyNickname in Cryptodog.buddies) {
            if (!message.users.includes(buddyNickname)) {
                let buddy = Cryptodog.buddies[buddyNickname];
                if (buddy) {
                    chat.addLeave(buddy, chat.timestamp());
                }
                Cryptodog.removeBuddy(buddyNickname);
            }
        }
    };

    Cryptodog.net.onJoin = function (message) {
        const timestamp = chat.timestamp();
        const nickname = message.name;
        if (nickname == Cryptodog.me.nickname) {
            return;
        }

        if (!(nickname in Cryptodog.buddies)) {
            // Create buddy element if buddy is new
            let buddy = Cryptodog.addBuddy(nickname);
            chat.addJoin(buddy, timestamp);

            // Propagate away status to newcomers
            Cryptodog.net.sendStatus();
        }
    };

    Cryptodog.net.onLeave = function (message) {
        const timestamp = chat.timestamp();
        const nickname = message.name;
        const buddy = Cryptodog.buddies[nickname];
        if (buddy) {
            chat.addLeave(buddy, timestamp);
        }
        Cryptodog.removeBuddy(nickname);
    };

    Cryptodog.net.sendGroupMessage = function (text) {
        connection.send(Connection.Event.GroupMessage, {
            text: text
        });
    };

    Cryptodog.net.sendPrivateMessage = function (to, text) {
        connection.send(Connection.Event.PrivateMessage, {
            to: to,
            text: text
        });
    };

    /* Send our multiparty public key to all room occupants. */
    Cryptodog.net.sendPublicKey = function () {
        connection.send(Connection.Event.GroupMessage, {
            text: JSON.stringify(new Cryptodog.multiParty.PublicKey(Cryptodog.me.mpPublicKey))
        });
    };

    /* Request public key from `nickname`.
      If `nickname` is omitted, request from all room occupants. */
    Cryptodog.net.requestPublicKey = function (nickname) {
        connection.send(Connection.Event.GroupMessage, {
            text: JSON.stringify(new Cryptodog.multiParty.PublicKeyRequest(nickname))
        });
    };

    Cryptodog.net.leave = function () {
        connection.send(Connection.Event.Leave);
    };

    // TODO: implement
    Cryptodog.net.sendStatus = function () { };

    Cryptodog.net.sendComposing = function (nickname) {
        let composing = JSON.stringify({
            type: 'composing'
        });
        if (nickname) {
            Cryptodog.net.sendPrivateMessage(nickname, composing);
        } else {
            Cryptodog.net.sendGroupMessage(composing);
        }
    };

    Cryptodog.net.sendPaused = function (nickname) {
        let paused = JSON.stringify({
            type: 'paused'
        });
        if (nickname) {
            Cryptodog.net.sendPrivateMessage(nickname, paused);
        } else {
            Cryptodog.net.sendGroupMessage(paused);
        }
    };

    Cryptodog.net.disconnect = function () {
        if (connection) {
            connection.disconnect();
        }
    };

    var autoIgnore;

    // Executed (manually) after connection.
    var afterConnect = function () {
        $('.conversationName').animate({ 'background-color': '#0087AF' });

        Cryptodog.net.sendStatus();
        Cryptodog.net.sendPublicKey();
        Cryptodog.net.requestPublicKey();

        clearInterval(autoIgnore);

        autoIgnore = setInterval(function () {
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
