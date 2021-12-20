importScripts('../lib/crypto-js.js', '../lib/bigint.mod.js', '../lib/elliptic.js');

onmessage = function (event) {
    let sharedSecret = genSharedSecret(event.data.theirPublicKey, event.data.ourPrivateKey);
    postMessage({ theirName: event.data.theirName, secretKey: sharedSecret });
};

// Generate shared secrets
// First 256 bytes are for encryption, last 256 bytes are for HMAC.
// Represented as WordArrays
function genSharedSecret(theirPublicKey, ourPrivateKey) {
    // I need to convert the BigInt to WordArray here. I do it using the Base64 representation.
    var sharedSecret = CryptoJS.SHA512(
        CryptoJS.enc.Base64.parse(
            BigInt.bigInt2base64(
                Curve25519.ecDH(ourPrivateKey, theirPublicKey),
                32
            )
        )
    );

    return {
        message: sharedSecret.words.slice(0, 8),
        hmac: sharedSecret.words.slice(8, 16)
    };
};