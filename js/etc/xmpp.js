'use strict';
Cryptodog.xmpp = {};
Cryptodog.xmpp.currentStatus = 'online';
Cryptodog.xmpp.connection = null;

Cryptodog.loadConfig()
.then(function() {

Cryptodog.xmpp.defaultServer = Cryptodog.config.customServers[0] || {
    name: 'Cryptodog',
    domain: 'crypto.dog',
    conference: 'conference.crypto.dog',
    relay: 'wss://crypto.dog/websocket'
};

Cryptodog.xmpp.currentServer = {};

$(window).ready(function() {
    // Load custom server settings
    Cryptodog.storage.getItem('serverName', function(key) {
        Cryptodog.xmpp.currentServer.name = key ? key : Cryptodog.xmpp.defaultServer.name;
    });
    Cryptodog.storage.getItem('domain', function(key) {
        Cryptodog.xmpp.currentServer.domain = key ? key : Cryptodog.xmpp.defaultServer.domain;
    });
    Cryptodog.storage.getItem('conferenceServer', function(key) {
        Cryptodog.xmpp.currentServer.conference = key ? key : Cryptodog.xmpp.defaultServer.conference;
    });
    Cryptodog.storage.getItem('relay', function(key) {
        Cryptodog.xmpp.currentServer.relay = key ? key : Cryptodog.xmpp.defaultServer.relay;
    });


    // Prepares necessary encryption key operations before XMPP connection.
    // Shows a progress bar while doing so.
    Cryptodog.xmpp.showKeyPreparationDialog = function(callback) {
        Cryptodog.storage.getItem('persistenceEnabled', function(key) {
            var key = key || {};    
            if (key.enabled) {
                Cryptodog.me.mpPrivateKey = BigInt.base642bigInt(key.mp);
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
                    Cryptodog.xmpp.prepareKeys(callback);
                }, 100);
            } else {
                Cryptodog.xmpp.prepareKeys(callback);
            }
        });
    };

    // See above.
    Cryptodog.xmpp.prepareKeys = function(callback) {
        // Create DSA key for OTR.
        // file protocol doesn't support WebWorkers
        if (window.location.protocol === 'file:') {
            Cryptodog.me.otrKey = new DSA();

            if (callback) {
                callback();
            }
        } else {
            DSA.createInWebWorker(
                {
                    path: 'js/workers/dsa.js',
                    seed: Cryptodog.random.generateSeed
                },
                function(key) {
                    Cryptodog.me.otrKey = key;

                    if (callback) {
                        callback();
                    }
                }
            );
        }
    };

    // Connect anonymously and join conversation.
    Cryptodog.xmpp.connect = function() {
        Cryptodog.xmpp.connectionIntroductionSent = false;
        Cryptodog.xmpp.connectionStart = Date.now();

        Cryptodog.xmpp.connection = new Strophe.Connection(Cryptodog.xmpp.currentServer.relay);

        Cryptodog.xmpp.connection.connect(Cryptodog.xmpp.currentServer.domain, null, function(status) {
            if (status === Strophe.Status.CONNECTING) {
                $('#loginInfo').text(Cryptodog.locale['loginMessage']['connecting']);
            } else if (status === Strophe.Status.CONNECTED) {
                Cryptodog.xmpp.connection.muc.join(
                    Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
                    Cryptodog.me.nickname,
                    function(message) {
                        if (Cryptodog.xmpp.onMessage(message)) {
                            return true;
                        }
                    },
                    function(presence) {
                        if (Cryptodog.xmpp.onPresence(presence)) {
                            return true;
                        }
                    }
                );
                Cryptodog.xmpp.onConnected();

                document.title = Cryptodog.me.nickname + '@' + Cryptodog.me.conversation;
                $('.conversationName').text(document.title);

                Cryptodog.storage.setItem('nickname', Cryptodog.me.nickname);
            } else if (status === Strophe.Status.CONNFAIL || status === Strophe.Status.DISCONNECTED) {
                if (Cryptodog.loginError) {
                    Cryptodog.xmpp.reconnect();
                }
            }
        });
    };

    // Executes on successfully completed XMPP connection.
    Cryptodog.xmpp.onConnected = function() {
        afterConnect();

        $('#loginInfo').text('✓');
        $('#status').attr('src', 'img/icons/checkmark.svg');
        $('#buddy-groupChat,#status').show();
        $('#buddy-groupChat').insertBefore('#buddiesOnline');
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
            $('.logo').animate({ margin: '-11px 10px 0 0' });

            $('#login').fadeOut(200, function() {
                $('#conversationInfo').fadeIn();

                $('#buddy-groupChat').click(function() {
                    Cryptodog.onBuddyClick($(this));
                });

                $('#buddy-groupChat').click();
                $('#conversationWrapper').fadeIn();
                $('#optionButtons').fadeIn();

                $('#userInput').css("display", "flex");
                $('#userInputText').focus();

                $('#buddyWrapper').slideDown();
            });
        }, 200);

        Cryptodog.loginError = true;
    };

    // Reconnect to the same chatroom, on accidental connection loss.
    Cryptodog.xmpp.reconnect = function() {
        if (Cryptodog.xmpp.connection) {
            Cryptodog.xmpp.connection.reset();
        }

        Cryptodog.xmpp.connection = new Strophe.Connection(Cryptodog.xmpp.currentServer.relay);

        Cryptodog.xmpp.connection.connect(Cryptodog.xmpp.currentServer.domain, null, function(status) {
            if (status === Strophe.Status.CONNECTING) {
                $('.conversationName').animate({ 'background-color': '#F00' });
            } else if (status === Strophe.Status.CONNECTED) {
                afterConnect();

                Cryptodog.xmpp.connection.muc.join(
                    Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
                    Cryptodog.me.nickname
                );
            } else if (status === Strophe.Status.CONNFAIL || status === Strophe.Status.DISCONNECTED) {
                if (Cryptodog.loginError) {
                    window.setTimeout(function() {
                        Cryptodog.xmpp.reconnect();
                    }, 5000);
                }
            }
        });
    };

    Cryptodog.bex.base64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    // Handle incoming messages from the XMPP server.
    Cryptodog.xmpp.onMessage = function(message) {
        var nickname = extractNickname($(message).attr('from'));

        var body = $(message)
            .find('body')
            .text();

        var type = $(message).attr('type');

        // If archived message, ignore.
        if ($(message).find('delay').length !== 0) {
            return true;
        }

        // If message is from me, ignore.
        if (nickname === Cryptodog.me.nickname) {
            return true;
        }

        // If message is from someone not on buddy list, ignore.
        if (!Cryptodog.buddies.hasOwnProperty(nickname)) {
            return true;
        }

        // Check if message has a 'composing' notification.
        if ($(message).attr('id') === 'composing' && !body.length) {
            return true;
        }

        // Check if message has a 'paused' (stopped writing) notification.
        if ($(message).attr('id') === 'paused') {
        } else if (type === 'groupchat' && body.length) {
            // Check if message is a group chat message.
            $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing');

            Cryptodog.bex.lastTransmissionFrom = nickname;

            if (Cryptodog.menuActive(nickname) === true) {
                body = Cryptodog.multiParty.receiveMessage(nickname, Cryptodog.me.nickname, body);

                if (typeof body === 'string') {
                    Cryptodog.addToConversation(body, nickname, 'groupChat', 'message');
                }
            }
        } else if (type === 'chat') {
            // Check if this is a private OTR message.
            $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing');

            if (body.length > Cryptodog.otr.maxMessageLength) {
                console.log('xmpp: refusing to decrypt large OTR message (' + body.length + ' bytes) from ' + nickname);
                return true;
            }

            Cryptodog.buddies[nickname].otr.receiveMsg(body);
        }
        return true;
    };

    // Handle incoming presence updates from the XMPP server.
    Cryptodog.xmpp.onPresence = function(presence) {
        var status;
        var nickname = extractNickname($(presence).attr('from'));

        // If invalid nickname, do not process.
        if ($(presence).attr('type') === 'error') {
            if (
                $(presence)
                    .find('error')
                    .attr('code') === '409'
            ) {
                // Delay logout in order to avoid race condition with window animation.
                window.setTimeout(function() {
                    Cryptodog.logout();
                    Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['nicknameInUse']);
                }, 3000);

                return false;
            }
            return true;
        }

        if (nickname === Cryptodog.me.nickname) {
            // Unavailable presence from us: we've been kicked, so try to reconnect.
            if ($(presence).attr('type') === 'unavailable') {
                Cryptodog.xmpp.reconnect();
            }

            // Ignore if presence status is coming from myself.
            return true;
        }

        // Detect nickname change (which may be done by non-Cryptodog XMPP clients).
        if (
            $(presence)
                .find('status')
                .attr('code') === '303'
        ) {
            Cryptodog.removeBuddy(nickname);
            return true;
        }

        // Detect buddy going offline.
        if ($(presence).attr('type') === 'unavailable') {
            Cryptodog.removeBuddy(nickname);
            return true;
        } else if (!Cryptodog.buddies.hasOwnProperty(nickname)) {
            if (Cryptodog.bex.isRestrictedNickname(nickname)) {
                return true;
            }

            if (Cryptodog.bex.lockdownLevel === 1) {
                if (typeof Cryptodog.authList[nickname] === "undefined") {
                    return true;
                }
            }

            // Create buddy object without a corresponding UI element.
            // Without knowing this buddy's key, we can't know if they are authenticated.
            Cryptodog.buddies[nickname] = new Cryptodog.Buddy(nickname, Cryptodog.getUniqueBuddyID(), status);
            Cryptodog.buddies[nickname].visible = false;

            var since = Date.now() - Cryptodog.xmpp.connectionStart;

            // Propagate away status to newcomers.
            Cryptodog.xmpp.sendStatus();

            Cryptodog.buddies[nickname].onConnect(function() {
                if (!Cryptodog.buddies[nickname]) {
                    return true;
                }

                if (Cryptodog.bex.controlTables.keys.includes(Cryptodog.buddies[nickname].mpFingerprint)) {
                    Cryptodog.removeBuddy(nickname);
                    return true;
                }

                if (Cryptodog.bex.lockdownLevel === 1) {
                    if (!Cryptodog.authList[nickname]) return;
                    if (Cryptodog.buddies[nickname].mpFingerprint !== Cryptodog.authList[nickname].mp) {
                        console.log(nickname, "has failed lockdown verification procedure.");
                        Cryptodog.removeBuddy(nickname);
                        return true;
                    } else {
                        Cryptodog.addBuddy(nickname, Cryptodog.buddies[nickname].id, 'online');
                        Cryptodog.buddies[nickname].updateAuth(Cryptodog.authList[nickname].level);
                    }
                } else {
                    Cryptodog.addBuddy(nickname, Cryptodog.buddies[nickname].id, 'online');
                }

                // config.json
                if (Cryptodog.config.mods.includes(Cryptodog.buddies[nickname].mpFingerprint)) {
                    Cryptodog.buddies[nickname].updateAuth(2);
                }

                if (Cryptodog.bex.controlTables.keys.includes(Cryptodog.buddies[nickname].mpFingerprint)) {
                    Cryptodog.removeBuddy(nickname);
                    return true;
                }

                // Avoid repeated propagation of introductory packet immediately after connecting.
                if (since < 4000) {
                    if (!Cryptodog.xmpp.connectionIntroductionSent) {
                        Cryptodog.xmpp.connectionIntroductionSent = true;
                    } else {
                        return;
                    }
                }

                Cryptodog.bex.sendIntro();
                return true;
            });
        } else if (
            $(presence)
                .find('show')
                .text() === '' ||
            $(presence)
                .find('show')
                .text() === 'chat'
        ) {
            status = 'online';
        } else {
            status = 'away';
        }

        Cryptodog.buddyStatus(nickname, status);
        return true;
    };

    Cryptodog.xmpp.sendReliablePrivateMessage = function(nickname, message) {
        Cryptodog.bex.ensureOTR(nickname, function () {
            var buddy = Cryptodog.buddies[nickname];
            if (buddy) {
                buddy.otr.sendMsg(etc.Encoding.encodeToBase64(message));
            }
        });
    }

    /* Send our multiparty public key to all room occupants. */
    Cryptodog.xmpp.sendPublicKey = function() {
        Cryptodog.xmpp.connection.muc.message(
            Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
            null,
            JSON.stringify(new Cryptodog.multiParty.PublicKey(Cryptodog.me.mpPublicKey)),
            null,
            'groupchat',
            'active'
        );

        window.setTimeout(function() {
            Object.keys(Cryptodog.buddies).map(function(nickname) {
                var buddy = Cryptodog.buddies[nickname];
                buddy._sentPublicKey = true;
                if (buddy.mpSecretKey !== null) {
                    buddy.dispatchConnect();
                }
            });
        }, 1000);
    };

    /* Request public key from `nickname`.
       If `nickname` is omitted, request from all room occupants. */
    Cryptodog.xmpp.requestPublicKey = function(nickname) {
        Cryptodog.xmpp.connection.muc.message(
            Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
            null,
            JSON.stringify(new Cryptodog.multiParty.PublicKeyRequest(nickname)),
            null,
            'groupchat',
            'active'
        );
    };

    // Send our current status to the XMPP server.
    Cryptodog.xmpp.sendStatus = function() {
        var status = '';

        if (Cryptodog.xmpp.currentStatus === 'away') {
            status = 'away';
        }

        Cryptodog.xmpp.connection.muc.setStatus(
            Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
            Cryptodog.me.nickname,
            status,
            status
        );
    };

    var autoIgnore;

    // Executed (manually) after connection.
    var afterConnect = function() {
        Cryptodog.storage.getItem("color", function(item) {
            if (item) {
                Cryptodog.me.color = item;
                document.querySelector("#changeColorBtn").value = item;
            }

            $('.conversationName').addClass("themePrimary");

            Cryptodog.xmpp.sendPublicKey();
            Cryptodog.xmpp.requestPublicKey();
            Cryptodog.xmpp.sendStatus();

            setTimeout(function() {
                // wait for session to initialize
                Cryptodog.transmitMyColor();
            }, 3000);

            clearInterval(autoIgnore);

            autoIgnore = setInterval(function() {
                for (var nickname in Cryptodog.buddies) {
                    var buddy = Cryptodog.buddies[nickname];
                    
                    if (Cryptodog.autoIgnore && buddy.messageCount > Cryptodog.maxMessageCount) {
                        if (buddy.ignored() === false) {
                            console.log('Automatically ignored ' + nickname);
                            buddy.toggleIgnored();
                        }
                    }

                    buddy.messageCount = 0;
                }
            }, Cryptodog.maxMessageInterval);
        });
    };

    // Extract nickname (part after forward slash) from JID
    var extractNickname = function(from) {
        var name = from.match(/\/([\s\S]+)/);

        if (name) {
            return name[1];
        }
        return false;
    };
});
});