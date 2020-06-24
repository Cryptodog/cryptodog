class Buddy {
    constructor(nickname) {
        this.nickname = nickname;
        this.id = CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(16));
        this.status = 'online';
        this.otr = Cryptodog.otr.add(nickname);
        this.color = Cryptodog.color.pop();
        // Regularly reset at the interval defined by Cryptodog.maxMessageInterval.
        this.messageCount = 0;
        if (Cryptodog.isFiltered(this.nickname) && !this.ignored()) {
            console.log("Filtering user '" + this.nickname + "', as isFiltered() returned true.");
            this.toggleIgnored();
        }
    }

    setStatus(status) {
        this.status = status;
        $('#buddy-' + this.id).attr('status', status);
    }

    setComposing() {
        $('#buddy-' + this.id).addClass('composing');
    }

    setPaused() {
        $('#buddy-' + this.id).removeClass('composing');
    }

    ensureOTR(close, cb) {
        if (this.fingerprint) {
            return cb(this.fingerprint);
        }
        let buddy = this;
        dialog.showOTRProgress(function () {
            buddy.genFingerState = { close: close, cb: cb };
            buddy.otr.sendQueryMsg();
        });
    }

    ignored() {
        return Cryptodog.ignoredNicknames.indexOf(this.nickname) !== -1;
    }

    toggleIgnored() {
        if (this.ignored()) {
            Cryptodog.ignoredNicknames.splice(Cryptodog.ignoredNicknames.indexOf(this.nickname), 1);
            $('#buddy-' + this.id).removeClass('ignored');
        }
        else {
            Cryptodog.ignoredNicknames.push(this.nickname);
            $('#buddy-' + this.id).addClass('ignored');
        }
    }

    updateMpKeys(publicKey) {
        this.mpPublicKey = publicKey;
        this.mpFingerprint = Cryptodog.multiParty.genFingerprint(this.nickname);
        this.mpSecretKey = Cryptodog.multiParty.genSharedSecret(this.nickname);
    }

    updateAuth(auth) {
        this.authenticated = auth;
        if (auth) {
            $('#authenticated').attr('data-active', true);
            $('#notAuthenticated').attr('data-active', false);
        }
        else {
            $('#authenticated').attr('data-active', false);
            $('#notAuthenticated').attr('data-active', true);
        }

        $.each($('span').filterByData('sender', this.nickname),
            function (index, value) {
                $(value).find('.authStatus').attr('data-auth', auth);
            }
        );
        var authStatusBuffers = [
            'groupChat',
            this.id
        ];

        $.each(authStatusBuffers, function (i, thisBuffer) {
            var buffer = $(Cryptodog.conversationBuffers[thisBuffer]);
            $.each(buffer.find('span').filterByData('sender', this.nickname),
                function (index, value) {
                    $(value).find('.authStatus').attr('data-auth', auth);
                }
            );
            Cryptodog.conversationBuffers[thisBuffer] = $('<div>').append(
                buffer.clone()
            ).html();
        });
    }
}
