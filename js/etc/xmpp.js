'use strict';
Cryptodog.xmpp = {};
Cryptodog.xmpp.currentStatus = 'online';
Cryptodog.xmpp.connection = null;

Cryptodog.xmpp.defaultServer = {
    name: 'Cryptodog',
    domain: 'crypto.dog',
    conference: 'conference.crypto.dog',
    relay: 'https://crypto.dog/http-bind'
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
        Cryptodog.me.mpPrivateKey = Cryptodog.multiParty.genPrivateKey();

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
        Cryptodog.me.conversation = Strophe.xmlescape($('#conversationName').val());
        Cryptodog.me.nickname = Strophe.xmlescape($('#nickname').val());

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
        if ($(message).find('composing').length && !body.length) {
            $('#buddy-' + Cryptodog.buddies[nickname].id).addClass('composing');
            return true;
        }

        // Check if message has a 'paused' (stopped writing) notification.
        if ($(message).find('paused').length) {
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

        // Ignore if presence status is coming from myself.
        if (nickname === Cryptodog.me.nickname) {
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
            // Create buddy element if buddy is new
            Cryptodog.addBuddy(nickname, null, 'online');

            for (var i = 0; i < 4000; i += 2000) {
                window.setTimeout(Cryptodog.xmpp.sendPublicKey, i, nickname);
            }

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

    // Send your own multiparty public key to `nickname`, via XMPP-MUC.
    Cryptodog.xmpp.sendPublicKey = function(nickname) {
        Cryptodog.xmpp.connection.muc.message(
            Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
            null,
            Cryptodog.multiParty.sendPublicKey(nickname),
            null,
            'groupchat',
            'active'
        );
    };

    // Request public key from `nickname`
    Cryptodog.xmpp.sendPublicKeyRequest = function(nickname) {
        Cryptodog.xmpp.connection.muc.message(
            Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
            null,
            Cryptodog.multiParty.sendPublicKeyRequest(nickname),
            null,
            'groupchat',
            'active'
        );
    };

    // Send your current status to the XMPP server.
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

    // Executed (manually) after connection.
    var afterConnect = function() {
        $('.conversationName').animate({ 'background-color': '#bb7a20' });

        Cryptodog.xmpp.connection.ibb.addIBBHandler(Cryptodog.otr.ibbHandler);
        Cryptodog.xmpp.connection.si_filetransfer.addFileHandler(Cryptodog.otr.fileHandler);

        Cryptodog.xmpp.sendStatus();
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
