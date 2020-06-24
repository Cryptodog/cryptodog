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

    Cryptodog.multiParty.encrypt = function (plaintext, recipients) {
        // Convert from UTF-8
        plaintext = CryptoJS.enc.Utf8.parse(plaintext);

        // Add 64 bytes of padding
        plaintext.concat(CryptoJS.lib.WordArray.random(64));

        const encrypted = {
            type: 'message',
            text: {}
        };

        const sortedRecipients = [];
        for (let r of recipients) {
            if (r.mpSecretKey) {
                sortedRecipients.push(r);
            }
        }
        sortedRecipients.sort((a, b) => a.nickname.localeCompare(b.nickname));

        const hmacInput = CryptoJS.lib.WordArray.create();

        for (let r of sortedRecipients) {
            const name = r.nickname;

            // Generate a random IV and do not reuse IVs
            let iv = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(12));
            while (usedIVs.indexOf(iv) >= 0) {
                iv = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(12));
            }
            usedIVs.push(iv);

            encrypted.text[name] = {
                message: encryptAES(
                    plaintext,
                    r.mpSecretKey.message,
                    iv
                ),
                iv: iv
            };

            // Build HMAC input
            hmacInput.concat(CryptoJS.enc.Base64.parse(encrypted.text[name].message));
            hmacInput.concat(CryptoJS.enc.Base64.parse(encrypted.text[name].iv));
        }
        const tag = plaintext.clone();

        for (let r of sortedRecipients) {
            const name = r.nickname;

            // Compute the HMAC
            encrypted.text[name].hmac = HMAC(
                hmacInput,
                r.mpSecretKey.hmac
            );
            tag.concat(CryptoJS.enc.Base64.parse(encrypted.text[name].hmac));
        }

        // Compute tag
        encrypted.tag = Cryptodog.multiParty.messageTag(tag);
        return encrypted;
    };

    Cryptodog.multiParty.decryptMessage = function (sender, myName, message) {
        let buddy = Cryptodog.buddies[sender];
        let type = message.type;

        if (type === 'public_key') {
            if (!(buddy.mpPublicKey)) {
                let publicKey = Uint8Array.fromWordArray(CryptoJS.enc.Base64.parse(message.text));
                buddy.updateMpKeys(publicKey);
            }
            return;
        }

        if (type === 'public_key_request') {
            if (!message.text || message.text === myName) {
                meta.sendPublicKey();
            }
            return;
        }

        if (type === 'message') {
            let text = message['text'];
            if (!text[myName] || typeof text[myName] !== 'object') {
                throw 'Message from ' + sender + ' is not encrypted for me';
            }

            if (!(buddy.mpSecretKey)) {
                // We don't have the sender's key - they're "borked".
                // Request their key and warn the user.
                meta.requestPublicKey(sender);
                throw 'Missing public key for ' + sender;
            }

            var recipients = Object.keys(Cryptodog.buddies);
            recipients.push(myName);
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
                throw 'HMAC failure for message from ' + sender;
            }

            // Check IV reuse
            if (usedIVs.indexOf(text[myName]['iv']) >= 0) {
                throw 'IV reuse in message from ' + sender + '; possible replay attack';
            }

            usedIVs.push(text[myName]['iv']);

            if (text[myName]['message'].length > Cryptodog.multiParty.maxMessageLength) {
                throw sender + ' sent too big a message';
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
                throw 'Tag failure for message from ' + sender;
            }

            // Remove padding
            if (plaintext.sigBytes < 64) {
                throw 'Invalid plaintext size for message from ' + sender;
            }

            plaintext = CryptoJS.lib.WordArray.create(plaintext.words, plaintext.sigBytes - 64);
            try {
                plaintext = plaintext.toString(CryptoJS.enc.Utf8);
            } catch (e) {
                return '';
            }

            // Only show "missing recipients" warning if the message is readable
            if (missingRecipients.length) {
                Cryptodog.addToConversation(missingRecipients, sender, 'groupChat', 'missingRecipients');
            }
            return plaintext;
        }
    };

    // Reset everything except my own key pair
    Cryptodog.multiParty.reset = function () {
        usedIVs = [];
    };
})();
