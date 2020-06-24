// Temporary helpers for sending client-to-client protocol metadata.

const meta = function () {
    'use strict';

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
        sendPublicKey,
        requestPublicKey,
        sendComposing,
        sendPaused,
        sendStatus,
    };
}();
