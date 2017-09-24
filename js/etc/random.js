if (typeof Cryptodog === 'undefined') {
    Cryptodog = function() {};
}

(function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory({}, require('../lib/salsa20.js'), true);
    } else {
        if (typeof root.Cryptodog === 'undefined') {
            root.Cryptodog = function() {};
        }
        factory(root.Cryptodog, root.Salsa20, false);
    }
})(this, function(Cryptodog, Salsa20, node) {
    'use strict';

    Cryptodog.random = {};

    var state;

    Cryptodog.random.generateSeed = function() {
        var buffer, crypto;
        // Node.js ... for tests
        if (typeof window === 'undefined' && typeof require !== 'undefined') {
            crypto = require('crypto');
            try {
                buffer = crypto.randomBytes(40);
            } catch (e) {
                throw e;
            }
        } else {
            buffer = new Uint8Array(40);
            window.crypto.getRandomValues(buffer);
        }
        return buffer;
    };

    Cryptodog.random.setSeed = function(s) {
        if (!s) {
            return false;
        }
        state = new Salsa20(
            [
                s[0],
                s[1],
                s[2],
                s[3],
                s[4],
                s[5],
                s[6],
                s[7],
                s[8],
                s[9],
                s[10],
                s[11],
                s[12],
                s[13],
                s[14],
                s[15],
                s[16],
                s[17],
                s[18],
                s[19],
                s[20],
                s[21],
                s[22],
                s[23],
                s[24],
                s[25],
                s[26],
                s[27],
                s[28],
                s[29],
                s[30],
                s[31]
            ],
            [s[32], s[33], s[34], s[35], s[36], s[37], s[38], s[39]]
        );
    };

    Cryptodog.random.getBytes = function(i) {
        if (i.constructor !== Number || i < 1) {
            throw new Error('Expecting a number greater than 0.');
        }
        return state.getBytes(i);
    };

    Cryptodog.random.bitInt = function(k) {
        if (k > 31) {
            throw new Error("That's more than JS can handle.");
        }
        var i = 0,
            r = 0;
        var b = Math.floor(k / 8);
        var mask = (1 << (k % 8)) - 1;
        if (mask) {
            r = Cryptodog.random.getBytes(1)[0] & mask;
        }
        for (; i < b; i++) {
            r = 256 * r + Cryptodog.random.getBytes(1)[0];
        }
        return r;
    };

    Cryptodog.random.decimal = function() {
        var r = 250;
        while (r > 249) {
            r = Cryptodog.random.getBytes(1)[0];
        }
        return r % 10;
    };

    Cryptodog.random.rawBytes = function(bytes) {
        var sa = String.fromCharCode.apply(null, Cryptodog.random.getBytes(bytes));
        return CryptoJS.enc.Latin1.parse(sa);
    };

    Cryptodog.random.encodedBytes = function(bytes, encoding) {
        return Cryptodog.random.rawBytes(bytes).toString(encoding);
    };

    if (node) {
        // Seed RNG in tests.
        Cryptodog.random.setSeed(Cryptodog.random.generateSeed());
    }

    return Cryptodog;
});
