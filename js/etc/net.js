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
    let joinSuccessCallback, joinFailCallback;

    const connection = new Connection(defaultServer.relay);
    connection.onEvent(Connection.Event.Connected, function () {
        if (inRoom) {
            join(joinSuccessCallback, joinFailCallback);
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

    function join(successCallback, failCallback) {
        connection.send(MessageType.Join, {
            name: Cryptodog.me.nickname,
            room: Cryptodog.me.conversation
        });
        joinSuccessCallback = successCallback;
        joinFailCallback = failCallback;
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

    function onJoin(message) {
        const timestamp = chat.timestamp();
        const nickname = message.name;

        if (nickname == Cryptodog.me.nickname) {
            // We joined the room
            inRoom = true;
            joinSuccessCallback();
            return;
        }

        if (!Cryptodog.hasUser(nickname)) {
            // Create buddy element if buddy is new
            let buddy = Cryptodog.addUser(nickname);
            chat.addJoin(buddy, timestamp);

            // Propagate away status to newcomers
            // XXX: 500 ms is an arbitrary amount of time to wait before keys are established
            setTimeout(meta.sendStatus, 500, Cryptodog.me.status);
        }
    }

    function onRoster(message) {
        const timestamp = chat.timestamp();

        // Add buddies in the roster
        for (const nickname of message.users) {
            if (!Cryptodog.hasUser(nickname)) {
                const buddy = Cryptodog.addUser(nickname);
                chat.addJoin(buddy, timestamp);
            }
        }

        // Remove buddies if their names do not appear in the roster
        for (const user of Cryptodog.allUsers()) {
            if (!message.users.includes(user.nickname)) {
                Cryptodog.removeUser(user.nickname);
                chat.addLeave(user, timestamp);
            }
        }
    }

    function onGroupMessage(message) {
        meta.handleGroupMessage(message);
    }

    function onPrivateMessage(message) {
        meta.handlePrivateMessage(message);
    }

    function onLeave(message) {
        const timestamp = chat.timestamp();
        const nickname = message.name;
        const buddy = Cryptodog.getUser(nickname);
        Cryptodog.removeUser(nickname);
        chat.addLeave(buddy, timestamp);
    }

    function onError(message) {
        console.error('Server error: ' + message.error);
        if (message.error === 'Nickname in use.') {
            joinFailCallback(message.error);
        }
    }

    window.addEventListener('unload', () => connection.disconnect());

    return {
        join,
        sendGroupMessage,
        sendPrivateMessage,
        leave,
    };
}();
