// Implements the client-server network protocol.

const net = function () {
    'use strict';

    // Client-server protocol messages.
    const MessageType = {
        Join: 'j',
        Leave: 'l',
        GroupMessage: 'g',
        PrivateMessage: 'p',
        Roster: 'r',
        Error: 'e'
    };

    const defaultServer = {
        name: 'Cryptodog',
        relay: 'wss://staging.crypto.dog/ws'
    };

    let inRoom = false;
    let joinCallback;

    const connection = new Connection(defaultServer.relay);
    connection.onEvent(Connection.Event.Connected, function () {
        if (inRoom) {
            join(joinCallback);
        }
    });

    connection.onEvent(Connection.Event.Reconnecting, function () {
        $('.conversationName').animate({ 'background-color': '#F00' });
    });

    connection.onMessage(MessageType.Join, onJoin);
    connection.onMessage(MessageType.Roster, onRoster);
    connection.onMessage(MessageType.GroupMessage, onGroupMessage);
    connection.onMessage(MessageType.PrivateMessage, onPrivateMessage);
    connection.onMessage(MessageType.Leave, onLeave);
    connection.onMessage(MessageType.Error, onError);

    connection.connect();

    function join(cb) {
        connection.send(MessageType.Join, {
            name: Cryptodog.me.nickname,
            room: Cryptodog.me.conversation
        });
        joinCallback = cb;
    }

    function sendGroupMessage(text) {
        connection.send(MessageType.GroupMessage, {
            text: text
        });
    }

    function sendPrivateMessage(to, text) {
        connection.send(MessageType.PrivateMessage, {
            to: to,
            text: text
        });
    }

    function leave() {
        connection.send(MessageType.Leave);
        inRoom = false;
    }

    function disconnect() {
        connection.disconnect();
    }

    function onJoin(message) {
        const timestamp = chat.timestamp();
        const nickname = message.name;

        if (nickname == Cryptodog.me.nickname) {
            // We joined the room
            inRoom = true;
            joinCallback();
            return;
        }

        if (!(nickname in Cryptodog.buddies)) {
            // Create buddy element if buddy is new
            let buddy = Cryptodog.addBuddy(nickname);
            chat.addJoin(buddy, timestamp);
        }
    }

    function onRoster(message) {
        const timestamp = chat.timestamp();

        // Add buddies in the roster
        for (let nickname of message.users) {
            if (!Cryptodog.buddies[nickname]) {
                const buddy = Cryptodog.addBuddy(nickname);
                chat.addJoin(buddy, timestamp);
            }
        }

        // Remove buddies if their names do not appear in the roster
        for (let nickname in Cryptodog.buddies) {
            if (!message.users.includes(nickname)) {
                const buddy = Cryptodog.buddies[nickname];
                Cryptodog.removeBuddy(nickname);
                chat.addLeave(buddy, timestamp);
            }
        }
    }

    function onGroupMessage(message) {
        const timestamp = chat.timestamp();
        const from = message.from;

        // If message is from me, ignore
        if (from === Cryptodog.me.nickname) {
            return;
        }

        // If message is from someone not on buddy list, ignore
        if (!Cryptodog.buddies.hasOwnProperty(from)) {
            return;
        }

        const buddy = Cryptodog.buddies[from];
        if (buddy.ignored()) {
            return;
        }

        try {
            var groupMessage = JSON.parse(message.text);
        } catch (e) {
            console.log(e);
            return;
        }

        if (groupMessage.type === 'composing') {
            buddy.setComposing();
        } else if (groupMessage.type === 'paused') {
            buddy.setPaused();
        } else {
            try {
                var decrypted = Cryptodog.multiParty.decryptMessage(from, Cryptodog.me.nickname, groupMessage);
            } catch (e) {
                console.log(e);
                chat.addDecryptError(buddy, timestamp);
                return;
            }
            if (decrypted) {
                chat.addGroupMessage(buddy, timestamp, decrypted);
            }
            buddy.setPaused();
        }
    }

    function onPrivateMessage(message) {
        // If message is from me, ignore
        if (message.from === Cryptodog.me.nickname) {
            return true;
        }

        // If message is from someone not on buddy list, ignore
        if (!Cryptodog.buddies.hasOwnProperty(message.from)) {
            return true;
        }

        const buddy = Cryptodog.buddies[message.from];
        if (buddy.ignored()) {
            return true;
        }

        buddy.setPaused();
        buddy.otr.receiveMsg(message.text);
    }

    function onLeave(message) {
        const timestamp = chat.timestamp();
        const nickname = message.name;
        const buddy = Cryptodog.buddies[nickname];
        Cryptodog.removeBuddy(nickname);
        chat.addLeave(buddy, timestamp);
    }

    function onError(message) {
        console.error('Server error: ' + message.error);
        if (message.error === 'Nickname in use.') {
            Cryptodog.logout();
            Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['nicknameInUse']);
        }
    }

    return {
        join,
        sendGroupMessage,
        sendPrivateMessage,
        leave,
        disconnect
    };
}();
