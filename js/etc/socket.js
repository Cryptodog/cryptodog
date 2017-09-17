'use strict';

Cryptodog.socket = {};

Cryptodog.socket.currentStatus = 'online';
Cryptodog.socket.connection = null;
Cryptodog.socket.timeout = 2500;
Cryptodog.socket.erroring = false;
Cryptodog.socket.loggedOut = false;

Cryptodog.socket.defaultServer = {
    name: 'Internet Krypto Klub',
    domain: 'anon.ikrypto.club',
    conference: 'conference.ikrypto.club',
    relay: 'wss://ikrypto.club/phoxy/backend'
};

if (window.location.hostname === "localhost") {
    Cryptodog.socket.defaultServer.relay = "ws://" + window.location.host + "/backend";
};

Cryptodog.socket.currentServer = Cryptodog.socket.defaultServer;

$(window).ready(function () {
    Cryptodog.storage.removeItem('serverName');
    Cryptodog.storage.removeItem('domain');
    Cryptodog.storage.removeItem('conferenceServer');
    Cryptodog.storage.removeItem('relay');

    // Load custom server settings
    Cryptodog.storage.getItem('serverName', function (key) {
        Cryptodog.socket.currentServer.name = key ? key : Cryptodog.socket.defaultServer.name;
    });
    Cryptodog.storage.getItem('domain', function (key) {
        Cryptodog.socket.currentServer.domain = key ? key : Cryptodog.socket.defaultServer.domain;
    });
    Cryptodog.storage.getItem('conferenceServer', function (key) {
        Cryptodog.socket.currentServer.conference = key ? key : Cryptodog.socket.defaultServer.conference;
    });
    Cryptodog.storage.getItem('relay', function (key) {
        Cryptodog.socket.currentServer.relay = key ? key : Cryptodog.socket.defaultServer.relay;
    });

    Cryptodog.socket.send = function (object) {
        var str = JSON.stringify(object);
        Cryptodog.socket.conn.send(str);
    };

    // Prepares necessary encryption key operations before XMPP connection.
    // Shows a progress bar while doing so.
    Cryptodog.socket.showKeyPreparationDialog = function (callback) {
        // Key storage currently disabled as we are not yet sure if this is safe to do.
        // Cryptodog.storage.setItem('multiPartyKey', Cryptodog.multiParty.genPrivateKey())
        //else {
        Cryptodog.me.mpPrivateKey = Cryptodog.multiParty.genPrivateKey()
        //}
        Cryptodog.me.mpPublicKey = Cryptodog.multiParty.genPublicKey(
            Cryptodog.me.mpPrivateKey
        )
        Cryptodog.me.mpFingerprint = Cryptodog.multiParty.genFingerprint()
        // If we already have keys, just skip to the callback.
        if (Cryptodog.me.otrKey) {
            callback()
            return
        }
        $('#loginInfo').text(Cryptodog.locale['loginMessage']['generatingKeys'])

        // Add delay to key generation when on the file protocol
        // Since the UI freezes when generating keys without WebWorkers
        if (window.location.protocol === 'file:') {
            setTimeout(function () { Cryptodog.socket.prepareKeys(callback) }, 100)
        }
        else {
            Cryptodog.socket.prepareKeys(callback)
        }
    }

    // See above.
    Cryptodog.socket.prepareKeys = function (callback) {
        // Create DSA key for OTR.
        // file protocol doesn't support WebWorkers
        if (window.location.protocol === 'file:') {
            Cryptodog.me.otrKey = new DSA()
            if (callback) { callback() }
        }
        else {
            DSA.createInWebWorker({
                path: 'js/workers/dsa.js',
                seed: Cryptodog.random.generateSeed
            }, function (key) {
                Cryptodog.me.otrKey = key
                // Key storage currently disabled as we are not yet sure if this is safe to do.
                //	Cryptodog.storage.setItem('myKey', JSON.stringify(Cryptodog.me.otrKey))
                if (callback) { callback() }
            })
        }

    }

    Cryptodog.socket.joinMUC = function () {
        Cryptodog.socket.send({
            type: "join_chat",
            chatroom: Cryptodog.me.conversation,
            nickname: Cryptodog.me.nickname,
        });
    }

    // Connect anonymously and join conversation.
    Cryptodog.socket.connect = function () {
        if (!Cryptodog.socket.errct) {
            Cryptodog.socket.errct = 0;
        }

        Cryptodog.kommy.verifyURL(Cryptodog.socket.currentServer.relay, function (u) {
            Cryptodog.socket.verifiedSocket = u;
            if (typeof Cryptodog.socket.currentServer.cleanRelay === "undefined") {
                Cryptodog.socket.currentServer.cleanRelay = Cryptodog.socket.currentServer.relay;
            }

            Cryptodog.me.conversation = escapeHtml($('#conversationName').val())
            Cryptodog.me.nickname = escapeHtml(Cryptodog.me.nickname)
            try {
                var cnn = new WebSocket(Cryptodog.socket.verifiedSocket);
                Cryptodog.socket.conn = cnn;
                Cryptodog.socket.setFuncs();
            } catch (e) {
                console.warn(e.message);
            }
        });
    }
});


function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

Cryptodog.socket.setFuncs = function () {
    Cryptodog.socket.conn.onopen = function () {
        Cryptodog.socket.joinMUC();

        document.title = Cryptodog.me.nickname + '@' + Cryptodog.me.conversation
        $('.conversationName').text(document.title)
        Cryptodog.storage.setItem('nickname', Cryptodog.me.nickname)

        if (!Cryptodog.socket.started) {
            Cryptodog.socket.onConnected()
        }
    }

    Cryptodog.socket.conn.onmessage = function (evt) {
        var msg = evt.data;
        var msgo = JSON.parse(msg);

        Cryptodog.socket.onMessage(msgo);
    }

    var errorFunc = function (color) {
        if (Cryptodog.socket.erroring == false) {
            Cryptodog.socket.erroring = true;
            $('.conversationName').animate({ 'background-color': color })

            window.setTimeout(Cryptodog.socket.reconnect, Cryptodog.socket.timeout);
        }
    }

    Cryptodog.socket.conn.onerror = function () {
        Cryptodog.socket.errct++;

        if (Cryptodog.socket.errct > 20) {
            window.setTimeout(function () {
                Cryptodog.logout()
                Cryptodog.UI.loginFail(Cryptodog.locale["loginMessage"]["connectionFailed"]);
            });
        }
    }

    Cryptodog.socket.conn.onclose = function () {
        if (Cryptodog.socket.loggedOut == false) {
            errorFunc('#4B0082');
        }
    }
}

// Executes on successfully completed XMPP connection.
Cryptodog.socket.onConnected = function () {
    Cryptodog.socket.loggedOut = false;
    Cryptodog.socket.timeout = 500;
    afterConnect()
    $('#loginInfo').text('✓')
    $('#status').attr('src', 'img/icons/checkmark.svg');
    $('#buddy-groupChat,#status').show()
    $('#buddy-groupChat').insertBefore('#buddiesOnline')
    $('#fill').stop().animate({
        'width': '100%', 'opacity': '1'
    }, 250, 'linear')
    window.setTimeout(function () {
        $('#dialogBoxClose').click()
    }, 400)
    window.setTimeout(function () {
        $('#loginOptions,#languages,#customServerDialog').fadeOut(200)
        $('#version,#logoText,#loginInfo,#info').fadeOut(200)
        $('#header').animate({ 'background-color': '#444' })
        $('.logo').animate({ 'margin': '-11px 5px 0 0' })
        $('#login').fadeOut(200, function () {
            $('#conversationInfo').fadeIn()
            $('#buddy-groupChat').click(function () {
                Cryptodog.onBuddyClick($(this))
            })
            $('#buddy-groupChat').click()
            $('#conversationWrapper').fadeIn()
            $('#optionButtons').fadeIn()
            $('#footer').delay(200).animate({ 'height': 60 }, function () {
                $('#userInput').fadeIn(200, function () {
                    $('#userInputText').focus()
                })
            })
            $('#buddyWrapper').slideDown()
        })
    }, 800)
    Cryptodog.loginError = true
}

// Reconnect to the same chatroom, on accidental connection loss.
Cryptodog.socket.reconnect = function () {
    Cryptodog.socket.erroring = false;
    if (Cryptodog.socket.loggedOut == true) {
        return;
    }

    if (Cryptodog.socket.conn) {
        Cryptodog.socket.conn.close();
        Cryptodog.socket.conn = null;
    }

    window.setTimeout(function () {
        try {
            Cryptodog.socket.conn = new WebSocket(Cryptodog.socket.verifiedSocket);
            Cryptodog.socket.setFuncs();
        } catch (e) {
            console.warn(e.message);
        }
    }, Cryptodog.socket.timeout);
}

Cryptodog.socket.quit = function () {
    Cryptodog.socket.conn.close();
}

Cryptodog.socket.sendColor = function () {
    Cryptodog.socket.send({
        type: "groupchat",
        chatroom: Cryptodog.me.conversation,
        object: JSON.parse(Cryptodog.multiParty.sendMessage(JSON.stringify(
            { type: "change_color", value: Cryptodog.me.color }, true
        )))
    });
}
// Handle incoming messages from the XMPP server.
Cryptodog.socket.onMessage = function (message) {
    var nickname = cleanNickname(message['nickname'])
    var obj = message["object"];
    var type = message['type'];

    if (type === "ping") {
        Cryptodog.socket.send({
            type: "pong"
        });
        return;
    }

    if (type === "lockdown_started") {
        Cryptodog.addToConversation("```** This conversation has been placed on lockdown. No unregistered users may join during this time.**", "PHOXY-SERVER", "groupChat", "message");
        return;
    }

    if (type === "lockdown_concluded") {
        Cryptodog.addToConversation("```** This conversation has been lifted from lockdown. **", "PHOXY-SERVER", "groupChat", "message");
        return;
    }

    if (type === "syncstate") {
        Object.keys(Cryptodog.buddies).forEach(function(bud) {
            if(!message["state"].includes(bud)) {
                log("Removing desynced buddy "+ bud);
                Cryptodog.removeBuddy(bud);
            }
        });
        return; 
    }

    if (type === "srvmsg") {
        Cryptodog.addToConversation(message["reason"], "PHOXY-SERVER", "groupChat", "message");
        return;
    }

    if (type === "banned") {
        window.setTimeout(function () {
            Cryptodog.logout()
            Cryptodog.UI.loginFail(message['reason']);
        }, 3000)
        return false
    }

    if (type === "nicknameInUse") {
        // Delay logout in order to avoid race condition with window animation
        window.setTimeout(function () {
            Cryptodog.logout()
            Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['nicknameInUse'])
        }, 3000)
        return false
    }

    // If archived message, ignore.
    // if ($(message).find('delay').length !== 0) {
    // 	return true
    // }

    //If message is from me, ignore.
    if (nickname === Cryptodog.me.nickname) {
        return true
    }

    if (nickname === undefined) {
        return false;
    }

    if (!Cryptodog.buddies.hasOwnProperty(nickname)) {
        Cryptodog.addBuddy(nickname, null, 'online')
        for (var u = 0; u < 4000; u += 2000) {
            window.setTimeout(Cryptodog.socket.sendPublicKey, u, nickname)
        }
        window.setTimeout(Cryptodog.socket.sendColor, 6000);
        Cryptodog.socket.sendStatus(); // Propagate away status to newcomers.
    }

    if (message["type"] === "unavailable") {
        Cryptodog.removeBuddy(nickname);
        return;
    }



    // If message is from someone not on buddy list, ignore.
    if (!Cryptodog.buddies.hasOwnProperty(nickname)) {
        return true
    }

    var body;
    if (typeof obj !== "undefined") {
        // Check if message has a 'composing' notification.
        if (obj["type"] == "composing") {
            $('#buddy-' + Cryptodog.buddies[nickname].id).addClass('composing')
            return true
        }

        // Check if message has a 'paused' (stopped writing) notification.
        if (obj["type"] === "paused") {
            $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing')
        }

        if (obj["type"] == "away") {
            Cryptodog.buddyStatus(nickname, "away")
        }

        if (obj["type"] == "online") {
            Cryptodog.buddyStatus(nickname, "online")
        }

        if (obj["type"] == "publicKey") {
            Cryptodog.multiParty.receiveMessage(nickname, Cryptodog.me.nickname, JSON.stringify(obj))
        }
    }


    // Check if message is a group chat message.
    if (type === 'groupchat') {
        $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing')
        if (obj["type"] == "message") {
            var data = Cryptodog.multiParty.receiveMessage(nickname, Cryptodog.me.nickname, JSON.stringify(obj))
            var dat = JSON.parse(data);
            body = dat["body"];

            if (dat["type"] === "change_color") {
                if (Cryptodog.UI.validHexcode(dat["value"])) {
                    Cryptodog.UI.changeColor(nickname, dat["value"]);
                }

                return;
            }

            if (dat["type"] === "file") {
                Cryptodog.addToConversation(btoa(JSON.stringify({
                    object: dat, nick: nickname, win: "groupChat"
                })), nickname, "groupChat", 'file')
                return;
            }

            if (dat["type"] === "message") {
                if (body.length > 2000) {
                    return true;
                }
                if (typeof (body) === 'string') {
                    Cryptodog.addToConversation(body, nickname, 'groupChat', 'message')
                }
            }
        }
    }
    // Check if this is a private OTR message.
    else if (type === 'chat') {
        var body = obj["body"];
        if (body !== undefined) {
            $('#buddy-' + Cryptodog.buddies[nickname].id).removeClass('composing')
            Cryptodog.buddies[nickname].otr.receiveMsg(body)
        }
    }
    return true
}

Cryptodog.socket.downloaded = {};
Cryptodog.socket.handleDownloadLink = function (tis, str) {
    var data = JSON.parse(atob(str));

    var dld = Cryptodog.socket.downloaded[data["object"]["filename"]]
    if (dld !== undefined) {
        Cryptodog.socket.fileURL = dld;
        return;
    }

    Cryptodog.socket.handleFile(tis.id, data["nick"], data["win"], data["object"]);
}

Cryptodog.socket.handleFile = function (id, nickname, win, dat) {
    var h = new Cryptodog.kommy.http.client();
    var url = Cryptodog.kommy.httpit(Cryptodog.socket.currentServer.relay).replace("backend", "files/") + dat["filename"];

    h.getBuffer(url).then(function (resp) {
        var iv = Cryptodog.kommy.utils.atob(dat["iv"])
        var keyData = Cryptodog.kommy.utils.atob(dat["key"])

        var wc = window.crypto;
        var cipher = "AES-CBC";
        wc.subtle.importKey(
            "raw",
            keyData.buffer,
            {
                name: cipher,
                length: 256
            },

            true,
            ["encrypt", "decrypt"]).then(function (key) {
                wc.subtle.decrypt(
                    {
                        name: cipher,
                        iv: iv.buffer
                    },

                    key,
                    resp.buffer
                )
                    .then(function (ptext) {
                        var mime = "application/octet-stream";
                        switch (dat["extension"]) {
                            case "jpg":
                                mime = "image/jpeg";
                                break;
                            case "jpeg":
                                mime = "image/jpeg";
                                break;
                            case "gif":
                                mime = "image/gif";
                                break;
                            case "png":
                                mime = "image/png";
                                break;
                            case "txt":
                                mime = "text/plain"
                                break;
                        }

                        var blob = new Blob([ptext], { type: mime });
                        var url = window.URL.createObjectURL(blob);
                        Cryptodog.socket.downloaded[dat["filename"]] = url;
                        $("#" + id).attr("href", url);
                    }).catch(function (err) {
                        console.warn("File downloading error", err)
                    });
            });
    });
}



// Send your own multiparty public key to `nickname`, via XMPP-MUC.
Cryptodog.socket.sendPublicKey = function (nickname) {
    Cryptodog.socket.send({
        type: "groupchat",
        object: JSON.parse(Cryptodog.multiParty.sendPublicKey(nickname))
    });
}

// Send your current status to the XMPP server.
Cryptodog.socket.sendStatus = function () {
    var status = 'online'
    if (Cryptodog.socket.currentStatus === 'away') {
        status = 'away'
    }

    Cryptodog.socket.send({
        type: "groupchat",
        chatroom: Cryptodog.me.conversation,
        object: {
            type: status
        }
    });
}

var afterConnect = function () {
    $('.conversationName').animate({ 'background-color': '#0087AF' })
    // Cryptodog.socket.connection.ibb.addIBBHandler(Cryptodog.otr.ibbHandler)
    // /* jshint -W106 */
    // Cryptodog.socket.connection.si_filetransfer.addFileHandler(Cryptodog.otr.fileHandler)
    // /* jshint +W106 */

    // Send status upon (re)connect.
    Cryptodog.socket.sendStatus();
}

// Clean nickname so that it's safe to use.
var cleanNickname = function (nickname) {
    return nickname;
}

