class Buddy {
    constructor(nickname) {
        this.id = CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(16));
        this.status = 'online';
        this.fingerprint = null;
        this.authenticated = false;
        this.fileKey = null;
        this.mpPublicKey = null;
        this.mpFingerprint = null;
        this.mpSecretKey = null;
        this.nickname = nickname;
        this.genFingerState = null;
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
        let buddyElement = $('#buddy-' + this.id);
        var placement = this.determinePlacement(nickname, this.id, status);
        if (buddyElement.attr('status') !== status) {
            buddyElement.attr('status', status);
            buddyElement.insertAfter(placement).slideDown(200);
        }
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

    // Determine alphabetical placement of buddy.
    determinePlacement() {
        var buddies = [{
            nickname: this.nickname,
            id: this.id
        }];
        for (var i in Cryptodog.buddies) {
            if (Cryptodog.buddies[i].status === this.status) {
                buddies.push({
                    nickname: i,
                    id: Cryptodog.buddies[i].id
                });
            }
        }
        buddies.sort(function (a, b) {
            var nameA = a.nickname.toLowerCase();
            var nameB = b.nickname.toLowerCase();
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            return 0;
        });
        var rightBefore;
        for (var o = 0; o < buddies.length; o++) {
            if (buddies[o].id === this.id) {
                if (o === 0) {
                    if (this.status === 'online') {
                        rightBefore = '#buddiesOnline';
                    }
                    if (this.status === 'away') {
                        rightBefore = '#buddiesAway';
                    }
                }
                else {
                    rightBefore = '[data-id=' + buddies[o - 1].id + ']';
                }
                break;
            }
        }
        return rightBefore;
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
