Cryptodog.multiParty = function () { };

(function () {
    'use strict';

    /*  We need the following two conversion functions because Crypto-JS operates on the WordArray type,
        but we use Uint8Array for compatibility with NaCl.
        TODO: Remove these functions once we replace Crypto-JS with NaCl entirely.
    */
    Uint8Array.prototype.toWordArray = function () {
        var wa = [], i;
        for (i = 0; i < this.length; i++) {
            wa[(i / 4) | 0] |= this[i] << (24 - 8 * i);
        }
        return CryptoJS.lib.WordArray.create(wa, this.length);
    };

    Uint8Array.fromWordArray = function (wordArray) {
        var len = wordArray.words.length,
            u8_array = new Uint8Array(len << 2),
            offset = 0, word, i;

        for (i = 0; i < len; i++) {
            word = wordArray.words[i];
            u8_array[offset++] = word >> 24;
            u8_array[offset++] = (word >> 16) & 0xff;
            u8_array[offset++] = (word >> 8) & 0xff;
            u8_array[offset++] = word & 0xff;
        }
        return u8_array;
    };

    var usedIVs = [];

    var correctIvLength = function (iv) {
        var ivAsWordArray = CryptoJS.enc.Base64.parse(iv);
        var ivAsArray = ivAsWordArray.words;

        // Adds 0 as the 4th element, causing the equivalent
        // bytestring to have a length of 16 bytes, with
        // \x00\x00\x00\x00 at the end.
        // Without this, crypto-js will take in a counter of
        // 12 bytes, and the first 2 counter iterations will
        // use 0, instead of 0 and then 1.
        // See https://github.com/cryptocat/cryptocat/issues/258
        ivAsArray.push(0);

        return CryptoJS.lib.WordArray.create(ivAsArray);
    };

    // AES-CTR-256 encryption
    // No padding, starting IV of 0
    // Input: WordArray, Output: Base64
    // Key input: WordArray
    var encryptAES = function (msg, c, iv) {
        var opts = {
            mode: CryptoJS.mode.CTR,
            iv: correctIvLength(iv),
            padding: CryptoJS.pad.NoPadding
        };
        var aesctr = CryptoJS.AES.encrypt(msg, c, opts);
        return aesctr.toString();
    };

    // AES-CTR-256 decryption
    // No padding, starting IV of 0
    // Input: Base64, Output: WordArray
    // Key input: WordArray
    var decryptAES = function (msg, c, iv) {
        var opts = {
            mode: CryptoJS.mode.CTR,
            iv: correctIvLength(iv),
            padding: CryptoJS.pad.NoPadding
        };
        var aesctr = CryptoJS.AES.decrypt(msg, c, opts);
        return aesctr;
    };

    // HMAC-SHA512
    // Output: Base64
    // Key input: WordArray
    var HMAC = function (msg, key) {
        return CryptoJS.HmacSHA512(msg, key).toString(CryptoJS.enc.Base64);
    };

    Cryptodog.multiParty.maxMessageLength = 5000;

    Cryptodog.multiParty.genPrivateKey = function () {
        let privateKey = new Uint8Array(32);
        return window.crypto.getRandomValues(privateKey);
    };

    Cryptodog.multiParty.genPublicKey = function (privateKey) {
        return nacl.scalarMult.base(privateKey);
    };

    // Generate shared secrets
    // First 256 bytes are for encryption, last 256 bytes are for HMAC.
    // Represented as WordArrays
    Cryptodog.multiParty.genSharedSecret = function (nickname) {
        let sharedSecret = CryptoJS.SHA512(nacl.scalarMult(Cryptodog.me.mpPrivateKey,
            Cryptodog.buddies[nickname].mpPublicKey).toWordArray());
        return {
            message: CryptoJS.lib.WordArray.create(sharedSecret.words.slice(0, 8)),
            hmac: CryptoJS.lib.WordArray.create(sharedSecret.words.slice(8, 16))
        };
    };

    // Get fingerprint
    // If nickname is null, returns own fingerprint
    Cryptodog.multiParty.genFingerprint = function (nickname) {
        var key = Cryptodog.me.mpPublicKey;
        if (nickname) {
            key = Cryptodog.buddies[nickname].mpPublicKey;
        }
        return CryptoJS.SHA512(key.toWordArray()).toString().substring(0, 40).toUpperCase();
    };

    Cryptodog.multiParty.PublicKey = function (key) {
        this.type = 'public_key';
        this.text = CryptoJS.enc.Base64.stringify(key.toWordArray());
    };

    Cryptodog.multiParty.PublicKeyRequest = function (name) {
        this.type = 'public_key_request';
        if (name) {
            this.text = name;
        } else {
            this.text = '';
        }
    };

    // Issue a warning for decryption failure to the main conversation window
    Cryptodog.multiParty.messageWarning = function (sender) {
        var messageWarning = Cryptodog.locale['warnings']['messageWarning'].replace('(NICKNAME)', sender);
        Cryptodog.addToConversation(messageWarning, sender, 'groupChat', 'warning');
    };

    // Generate message tag. 8 rounds of SHA512
    // Input: WordArray
    // Output: Base64
    Cryptodog.multiParty.messageTag = function (message) {
        for (var i = 0; i < 8; i++) {
            message = CryptoJS.SHA512(message);
        }

        return message.toString(CryptoJS.enc.Base64);
    };

    Cryptodog.multiParty.sendMessage = function (message) {
        // Convert from UTF8
        message = CryptoJS.enc.Utf8.parse(message);

        // Add 64 bytes of padding
        message.concat(CryptoJS.lib.WordArray.random(64));

        var encrypted = {
            text: {},
            type: 'message'
        };

        var sortedRecipients = [];
        for (var b in Cryptodog.buddies) {
            if (Cryptodog.buddies[b].mpSecretKey) {
                sortedRecipients.push(b);
            }
        }

        sortedRecipients.sort();

        var hmac = CryptoJS.lib.WordArray.create();

        for (var i = 0; i < sortedRecipients.length; i++) {
            // Generate a random IV
            var iv = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(12));

            // Do not reuse IVs
            while (usedIVs.indexOf(iv) >= 0) {
                iv = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(12));
            }

            usedIVs.push(iv);

            // Encrypt the message
            encrypted['text'][sortedRecipients[i]] = {};

            encrypted['text'][sortedRecipients[i]]['message'] = encryptAES(
                message,
                Cryptodog.buddies[sortedRecipients[i]].mpSecretKey['message'],
                iv
            );

            encrypted['text'][sortedRecipients[i]]['iv'] = iv;

            // Append to HMAC
            hmac.concat(CryptoJS.enc.Base64.parse(encrypted['text'][sortedRecipients[i]]['message']));
            hmac.concat(CryptoJS.enc.Base64.parse(encrypted['text'][sortedRecipients[i]]['iv']));
        }

        encrypted['tag'] = message.clone();

        for (var i = 0; i < sortedRecipients.length; i++) {
            // Compute the HMAC
            encrypted['text'][sortedRecipients[i]]['hmac'] = HMAC(
                hmac,
                Cryptodog.buddies[sortedRecipients[i]].mpSecretKey['hmac']
            );

            // Append to tag
            encrypted['tag'].concat(CryptoJS.enc.Base64.parse(encrypted['text'][sortedRecipients[i]]['hmac']));
        }

        // Compute tag
        encrypted['tag'] = Cryptodog.multiParty.messageTag(encrypted['tag']);
        return JSON.stringify(encrypted);
    };

    Cryptodog.multiParty.receiveMessage = function (sender, myName, message) {
        var buddy = Cryptodog.buddies[sender];

        try {
            message = JSON.parse(message);
        } catch (err) {
            console.log('multiParty: failed to parse message object');
            return false;
        }

        var type = message.type;

        if (type === 'public_key') {
            if (typeof message.text !== 'string') {
                console.log('multiParty: invalid public key from ' + sender);
                return false;
            }

            var publicKey = Uint8Array.fromWordArray(CryptoJS.enc.Base64.parse(message.text));
            if (buddy.mpPublicKey) {
                throw 'Already have public key for ' + sender;
            }
            buddy.updateMpKeys(publicKey);
        } else if (type === 'public_key_request') {
            if (!message.text || message.text === Cryptodog.me.nickname) {
                Cryptodog.xmpp.sendPublicKey();
            }
        } else if (type === 'message') {
            var text = message['text'];

            if (!text || typeof text !== 'object') {
                return false;
            }

            if (!text[myName] || typeof text[myName] !== 'object') {
                console.log('multiParty: invalid message from ' + sender);
                Cryptodog.multiParty.messageWarning(sender);
                return false;
            } else {
                if (!(buddy.mpSecretKey)) {
                    // We don't have the sender's key - they're "borked".
                    // Request their key and warn the user.
                    console.log('Requesting public key from ' + sender);
                    Cryptodog.xmpp.requestPublicKey(sender);
                    Cryptodog.multiParty.messageWarning(sender);
                    return false;
                }

                var recipients = Object.keys(Cryptodog.buddies);
                recipients.push(Cryptodog.me.nickname);
                recipients.splice(recipients.indexOf(sender), 1);

                // Find missing recipients: those for whom the message isn't encrypted
                var missingRecipients = [];

                for (var i = 0; i < recipients.length; i++) {
                    try {
                        if (typeof text[recipients[i]] === 'object') {
                            var noMessage = typeof text[recipients[i]]['message'] !== 'string';
                            var noIV = typeof text[recipients[i]]['iv'] !== 'string';
                            var noHMAC = typeof text[recipients[i]]['hmac'] !== 'string';

                            if (noMessage || noIV || noHMAC) {
                                missingRecipients.push(recipients[i]);
                            }
                        } else {
                            missingRecipients.push(recipients[i]);
                        }
                    } catch (err) {
                        missingRecipients.push(recipients[i]);
                    }
                }

                // Sort recipients
                var sortedRecipients = Object.keys(text).sort();

                // Check HMAC
                var hmac = CryptoJS.lib.WordArray.create();

                for (var i = 0; i < sortedRecipients.length; i++) {
                    if (missingRecipients.indexOf(sortedRecipients[i]) < 0) {
                        hmac.concat(CryptoJS.enc.Base64.parse(text[sortedRecipients[i]]['message']));
                        hmac.concat(CryptoJS.enc.Base64.parse(text[sortedRecipients[i]]['iv']));
                    }
                }

                if (!OTR.HLP.compare(text[myName]['hmac'], HMAC(hmac, buddy.mpSecretKey['hmac']))) {
                    console.log('multiParty: HMAC failure');
                    Cryptodog.multiParty.messageWarning(sender);
                    return false;
                }

                // Check IV reuse
                if (usedIVs.indexOf(text[myName]['iv']) >= 0) {
                    console.log('multiParty: IV reuse detected, possible replay attack');
                    Cryptodog.multiParty.messageWarning(sender);
                    return false;
                }

                usedIVs.push(text[myName]['iv']);

                if (text[myName]['message'].length > Cryptodog.multiParty.maxMessageLength) {
                    Cryptodog.multiParty.messageWarning(sender);
                    console.log('multiParty: refusing to decrypt large message (' + text[myName]['message'].length + ' bytes) from ' + sender);
                    return false;
                }

                // Decrypt
                var plaintext = decryptAES(
                    text[myName]['message'],
                    buddy.mpSecretKey['message'],
                    text[myName]['iv']
                );

                // Check tag
                var messageTag = plaintext.clone();
                for (var i = 0; i < sortedRecipients.length; i++) {
                    messageTag.concat(CryptoJS.enc.Base64.parse(text[sortedRecipients[i]]['hmac']));
                }

                if (Cryptodog.multiParty.messageTag(messageTag) !== message['tag']) {
                    console.log('multiParty: message tag failure');
                    Cryptodog.multiParty.messageWarning(sender);
                    return false;
                }

                // Remove padding
                if (plaintext.sigBytes < 64) {
                    console.log('multiParty: invalid plaintext size');
                    Cryptodog.multiParty.messageWarning(sender);
                    return false;
                }

                plaintext = CryptoJS.lib.WordArray.create(plaintext.words, plaintext.sigBytes - 64);

                try {
                    plaintext = plaintext.toString(CryptoJS.enc.Utf8);
                } catch (e) {
                    return false;
                }

                // Only show "missing recipients" warning if the message is readable
                if (missingRecipients.length) {
                    Cryptodog.addToConversation(missingRecipients, sender, 'groupChat', 'missingRecipients');
                }

                return plaintext;
            }
        } else {
            console.log('multiParty: unknown message type "' + type + '" from ' + sender);
        }

        return false;
    };

    // Reset everything except my own key pair
    Cryptodog.multiParty.reset = function () {
        usedIVs = [];
    };
})();
