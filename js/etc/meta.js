// Temporary helpers for sending and receiving client-to-client protocol metadata.

const meta = function () {
    'use strict';

    function handleGroupMessage(message) {
        // If message is from me, ignore
        if (message.from === Cryptodog.me.nickname) {
            return;
        }

        // If message is from someone not on buddy list, ignore
        if (!(message.from in Cryptodog.buddies)) {
            return;
        }

        const buddy = Cryptodog.buddies[message.from];
        if (buddy.ignored()) {
            return;
        }

        try {
            var groupMessage = JSON.parse(message.text);
        } catch (e) {
            console.log(e);
            return;
        }

        switch (groupMessage.type) {
            case 'composing':
                buddy.setComposing();
                break;
            case 'paused':
                buddy.setPaused();
                break;
            case 'public_key':
            case 'public_key_request':
            case 'message':
                const timestamp = chat.timestamp();
                try {
                    var decrypted = Cryptodog.multiParty.decryptMessage(message.from, Cryptodog.me.nickname, groupMessage);
                } catch (e) {
                    console.log(e);
                    chat.addDecryptError(buddy, timestamp);
                    return;
                }
                if (decrypted) {
                    chat.addGroupMessage(buddy, timestamp, decrypted);
                }
                buddy.setPaused();
                break;
            default:
                console.log('Unknown group message type: ' + groupMessage.type);
        }
    }

    function sendPublicKey() {
        net.sendGroupMessage(JSON.stringify(new Cryptodog.multiParty.PublicKey(Cryptodog.me.mpPublicKey)));
    };

    // If nickname is omitted, request from all room occupants
    function requestPublicKey(nickname) {
        net.sendGroupMessage(JSON.stringify(new Cryptodog.multiParty.PublicKeyRequest(nickname)));
    };

    function sendComposing(nickname) {
        const composing = JSON.stringify({
            type: 'composing'
        });

        if (nickname) {
            net.sendPrivateMessage(nickname, composing);
        } else {
            net.sendGroupMessage(composing);
        }
    };

    function sendPaused(nickname) {
        const paused = JSON.stringify({
            type: 'paused'
        });

        if (nickname) {
            net.sendPrivateMessage(nickname, paused);
        } else {
            net.sendGroupMessage(paused);
        }
    }

    // TODO: implement
    function sendStatus() { }

    return {
        handleGroupMessage,
        sendPublicKey,
        requestPublicKey,
        sendComposing,
        sendPaused,
        sendStatus,
    };
}();
