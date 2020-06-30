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

                // Parse Wrap frames in group message.
                try {
                    var envelope = wrap.Envelope.parse(decrypted.plaintext);
                } catch (e) {
                    console.log(e);
                    return;
                }

                console.log(envelope);

                for (let frame of envelope.frames) {
                    switch (frame.constructor) {
                        case wrap.Composing:
                            buddy.setComposing();
                            break;
                        case wrap.Paused:
                            buddy.setPaused();
                            break;
                        case wrap.Online:
                            buddy.setStatus('online');
                            break;
                        case wrap.Away:
                            buddy.setStatus('away');
                            break;
                        case wrap.TextMessage:
                            if (decrypted.missingRecipients.length) {
                                chat.addMissingRecipients(decrypted.missingRecipients);
                            }
                            if (decrypted.plaintext) {
                                chat.addGroupMessage(buddy, timestamp, frame.text);
                            }

                            buddy.setPaused();
                            break;
                        default:
                            console.log('unhandled frame:', frame.constructor);
                            break;
                    }
                }
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
                    try {
                        var envelope = wrap.Envelope.parse(decrypted.plaintext);
                    } catch (e) {
                        console.log(e);
                        return;
                    }

                    for (let frame of envelope.frames) {
                        switch (frame.constructor) {
                            case wrap.TextMessage:
                                chat.addPrivateMessage(buddy, buddy, timestamp, frame.text);
                                break;
                            case wrap.Composing:
                                buddy.setComposing();
                                break;
                            case wrap.Paused:
                                buddy.setPaused();
                                break;
                        }
                    }
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
        const composing = new wrap.Envelope();
        composing.add(new wrap.Composing());

        if (nickname) {
            sendPrivateWrap(nickname, composing);
        } else {
            sendGroupWrap(composing);
        }
    };

    function sendPaused(nickname) {
        const paused = new wrap.Envelope();
        paused.add(new wrap.Paused());

        if (nickname) {
            sendPrivateWrap(nickname, paused);
        } else {
            sendGroupWrap(paused);
        }
    }

    function sendStatus(status) {
        const envelope = new wrap.Envelope();
        if (status === 'away') {
            envelope.add(new wrap.Away());
        } else if (status === 'online') {
            envelope.add(new wrap.Online());
        }
        sendGroupWrap(envelope);
    }

    function sendGroupWrap(envelope) {
        const ciphertext = multiparty.encrypt(envelope.encode(), Object.values(Cryptodog.buddies));
        net.sendGroupMessage(JSON.stringify(ciphertext));
    }

    function sendPrivateWrap(nickname, envelope) {
        const buddy = Cryptodog.buddies[nickname];
        const ciphertext = multiparty.encrypt(envelope.encode(), [buddy]);
        net.sendPrivateMessage(nickname, JSON.stringify(ciphertext));
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
