/* Temporary helpers for sending and receiving client-to-client protocol metadata.
   To be eventually superseded by BEX protocol. */

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
            case 'away':
                buddy.setStatus('away');
                break;
            case 'online':
                buddy.setStatus('online');
                break;
            case 'composing':
                buddy.setComposing();
                break;
            case 'paused':
                buddy.setPaused();
                break;
            case 'public_key':
                if (!buddy.mpPublicKey) {
                    try {
                        const publicKey = multiparty.parsePublicKey(groupMessage.text);
                        buddy.setKeys(publicKey, multiparty.sharedSecret(Cryptodog.me.mpPrivateKey, publicKey));
                    } catch (e) {
                        console.log(e);
                    }
                }
                break;
            case 'public_key_request':
                if (!groupMessage.text || groupMessage.text === Cryptodog.me.nickname) {
                    sendPublicKey(Cryptodog.me.mpPublicKey.encoded);
                }
                break;
            case 'message':
                const timestamp = chat.timestamp();
                try {
                    var decrypted = multiparty.decrypt(groupMessage, buddy);
                } catch (e) {
                    console.log(e);
                    chat.addDecryptError(buddy, timestamp);
                    return;
                }

                if (decrypted.missingRecipients.length) {
                    chat.addMissingRecipients(decrypted.missingRecipients);
                }
                if (decrypted.plaintext) {
                    chat.addGroupMessage(buddy, timestamp, decrypted.plaintext);
                }

                buddy.setPaused();
                break;
            default:
                console.log('Unknown group message type: ' + groupMessage.type);
        }
    }

    function handlePrivateMessage(message) {
        // If message is from someone not on buddy list, ignore
        if (!(message.from in Cryptodog.buddies)) {
            return;
        }

        const buddy = Cryptodog.buddies[message.from];
        if (buddy.ignored()) {
            return;
        }

        try {
            var privateMessage = JSON.parse(message.text);
        } catch (e) {
            console.log(e);
            return;
        }

        switch (privateMessage.type) {
            case 'composing':
                buddy.setComposing();
                break;
            case 'paused':
                buddy.setPaused();
                break;
            case 'message':
                const timestamp = chat.timestamp();
                try {
                    var decrypted = multiparty.decrypt(privateMessage, buddy);
                } catch (e) {
                    console.log(e);
                    chat.addDecryptError(buddy, timestamp);
                    return;
                }

                if (decrypted.plaintext) {
                    chat.addPrivateMessage(buddy, buddy, timestamp, decrypted.plaintext);
                }

                buddy.setPaused();
                break;
            default:
                console.log('Unknown private message type: ' + privateMessage.type);
        }
    }

    function sendPublicKey(encodedPublicKey) {
        net.sendGroupMessage(JSON.stringify({
            type: 'public_key',
            text: encodedPublicKey
        }));
    };

    function requestPublicKey(nickname) {
        const publicKeyRequest = {
            type: 'public_key_request'
        };
        if (nickname) {
            publicKeyRequest.text = nickname;
        }
        net.sendGroupMessage(JSON.stringify(publicKeyRequest));
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

    function sendStatus(status) {
        net.sendGroupMessage(JSON.stringify({
            type: status
        }));
    }

    return {
        handleGroupMessage,
        handlePrivateMessage,
        sendPublicKey,
        requestPublicKey,
        sendComposing,
        sendPaused,
        sendStatus,
    };
}();
