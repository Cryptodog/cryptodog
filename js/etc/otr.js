(function () {
    'use strict';

    // Cryptodog OTR functions and callbacks.
    Cryptodog.otr = {};

    Cryptodog.otr.maxMessageLength = 5000;

    // Construct a new OTR conversation
    Cryptodog.otr.add = function (nickname) {
        // file protocol doesn't support WebWorkers
        if (window.location.protocol === 'file:') {
            var otr = new OTR({
                priv: Cryptodog.me.otrKey
            });
        } else {
            var otr = new OTR({
                priv: Cryptodog.me.otrKey,
                smw: { path: 'js/lib/otr/sm-webworker.js' }
            });
        }

        otr.REQUIRE_ENCRYPTION = true;
        otr.on('ui', onIncoming.bind(null, nickname));
        otr.on('io', onOutgoing.bind(null, nickname));
        otr.on('smp', onSMPAnswer.bind(null, nickname));
        otr.on('status', onStatusChange.bind(null, nickname));
        return otr;
    };

    // Handle incoming messages.
    var onIncoming = function (nickname, msg, encrypted) {
        // Drop unencrypted messages.
        if (!encrypted) {
            return;
        }
        const timestamp = chat.timestamp();
        const buddy = Cryptodog.buddies[nickname];
        chat.addPrivateMessage(buddy, buddy, timestamp, msg);
    };

    // Handle outgoing messages depending on connection type.
    var onOutgoing = function (nickname, message) {
        Cryptodog.net.sendPrivateMessage(nickname, message);
    };

    // Handle otr state changes.
    var onStatusChange = function (nickname, state) {
        /*jshint camelcase:false */
        var buddy = Cryptodog.buddies[nickname];

        if (state === OTR.CONST.STATUS_AKE_SUCCESS) {
            var fingerprint = buddy.otr.their_priv_pk.fingerprint();

            if (!(buddy.fingerprint)) {
                buddy.fingerprint = fingerprint;
                let state = buddy.genFingerState;
                buddy.genFingerState = null;
                if (!state) {
                    return;
                }
                if (state.noAnimation) {
                    state.cb();
                } else {
                    dialog.hideOTRProgress(state);
                }
            } else if (buddy.fingerprint !== fingerprint) {
                // re-aked with a different key
                buddy.fingerprint = fingerprint;
                Cryptodog.UI.removeAuthAndWarn(nickname);
            }
        }
    };

    // Receive an SMP question
    var onSMPQuestion = function (nickname, question) {
        let buddy = Cryptodog.buddies[nickname];
        if (buddy.ignored()) {
            buddy.otr.smpSecret(CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(16)));
            return;
        }
        dialog.showSMPQuestion(buddy, question);
    };

    // Handle SMP callback
    var onSMPAnswer = function (nickname, type, data, act) {
        var chatWindow = Cryptodog.locale.chatWindow,
            buddy = Cryptodog.buddies[nickname];

        switch (type) {
            case 'question':
                onSMPQuestion(nickname, data);
                break;

            case 'trust':
                if (act === 'asked') {
                    // Set authentication result
                    buddy.updateAuth(data);
                    if ($('.authSMP').length) {
                        if (buddy.authenticated) {
                            $('#authSubmit').val(chatWindow.identityVerified);
                            $('#authenticated').click();
                        } else {
                            $('#authSubmit')
                                .val(chatWindow.failed)
                                .animate({ 'background-color': '#F00' });
                        }
                    }
                }
                break;

            case 'abort':
                if ($('.authSMP').length) {
                    $('#authSubmit')
                        .val(chatWindow.failed)
                        .animate({ 'background-color': '#F00' });
                }
                break;
        }
    };
})();
