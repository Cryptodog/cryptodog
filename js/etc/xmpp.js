'use strict';
Cryptodog.xmpp = {};
Cryptodog.xmpp.currentStatus = 'online';
Cryptodog.xmpp.connection = null;

Cryptodog.xmpp.defaultServer = {
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
                Cryptodog.me.mpPrivateKey = CryptoJS.enc.Base64.parse(key.mp);
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
            $('.logo').animate({ margin: '-11px 5px 0 0' });

            $('#login').fadeOut(200, function() {
                $('#conversationInfo').fadeIn();

                $('#buddy-groupChat').click(function() {
                    Cryptodog.onBuddyClick($(this));
                });

                $('#buddy-groupChat').click();
                $('#conversationWrapper').fadeIn();
                $('#optionButtons').fadeIn();

                $('#footer')
                    .delay(200)
                    .animate({ height: 60 }, function() {
                        $('#userInput').fadeIn(200, function() {
                            $('#userInputText').focus();
                        });
                    });

                $('#buddyWrapper').slideDown();
            });
        }, 800);

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
            $('#buddy-' + Cryptodog.buddies[nickname].id).addClass('composing');
            return true;
        }

        // Check if message has a 'paused' (stopped writing) notification.
        if ($(message).attr('id') === 'paused') {
            $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing');
        } else if (type === 'groupchat' && body.length) {
            // Check if message is a group chat message.
            $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing');

            body = Cryptodog.multiParty.receiveMessage(nickname, Cryptodog.me.nickname, body);

            if (typeof body === 'string') {
                Cryptodog.addToConversation(body, nickname, 'groupChat', 'message');
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
            // Don't render user join if it violates mutelist rules.
            if (Cryptodog.isMutelisted(nickname)) {
                log("Silently filtered " + nickname);
                return true;
            }

            // Create buddy element if buddy is new
            Cryptodog.addBuddy(nickname, null, 'online');
            
            // Propagate away status to newcomers.
            Cryptodog.xmpp.sendStatus();
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
        $('.conversationName').animate({ 'background-color': '#bb7a20' });

        Cryptodog.xmpp.connection.ibb.addIBBHandler(Cryptodog.otr.ibbHandler);
        Cryptodog.xmpp.connection.si_filetransfer.addFileHandler(Cryptodog.otr.fileHandler);

        Cryptodog.xmpp.sendStatus();
        Cryptodog.xmpp.sendPublicKey();
        Cryptodog.xmpp.requestPublicKey();

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

    // Extract nickname (part after forward slash) from JID
    var extractNickname = function(from) {
        var name = from.match(/\/([\s\S]+)/);

        if (name) {
            return name[1];
        }
        return false;
    };
});
