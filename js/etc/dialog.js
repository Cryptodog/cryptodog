const dialog = (function () {
    'use strict';

    function showMyInfo(me) {
        let myInfo = Mustache.render(Cryptodog.templates['myInfo'], {
            nickname: me.nickname,
            groupFingerprint: Cryptodog.locale.chatWindow.groupFingerprint
        });
        showBox(myInfo, {
            height: 250,
            closeable: true
        });
        $('#multiPartyFingerprint').text(formatFingerprint(me.mpFingerprint));
    }

    function showBuddyInfo(buddy) {
        let buddyInfo = Mustache.render(Cryptodog.templates['buddyInfo'], {
            nickname: buddy.nickname,
            authenticated: Cryptodog.locale.auth.authenticated + ':',
            groupFingerprint: Cryptodog.locale.chatWindow.groupFingerprint,
            authenticate: Cryptodog.locale.chatWindow.authenticate,
            verifyUserIdentity: Cryptodog.locale.chatWindow.verifyUserIdentity,
            secretQuestion: Cryptodog.locale.chatWindow.secretQuestion,
            secretAnswer: Cryptodog.locale.chatWindow.secretAnswer,
            ask: Cryptodog.locale.chatWindow.ask,
            identityVerified: Cryptodog.locale.chatWindow.identityVerified
        });

        showBox(buddyInfo, {
            height: 430,
            closeable: true,
        });

        $('#multiPartyFingerprint').text(formatFingerprint(buddy.mpFingerprint));

        if (buddy.authenticated) {
            buddy.updateAuth(true);
        } else {
            buddy.updateAuth(false);
        }

        $('#authenticated').unbind('click').bind('click', function () {
            buddy.updateAuth(true);
        });
        $('#notAuthenticated').unbind('click').bind('click', function () {
            buddy.updateAuth(false);
        });
    }

    function showBox(content, options) {
        if (options.closeable) {
            $('#dialogBoxClose').css('width', 18);
            $('#dialogBoxClose').css('font-size', 12);

            $(document).keydown(function (e) {
                if (e.keyCode === 27) {
                    e.stopPropagation();
                    $('#dialogBoxClose').click();
                    $(document).unbind('keydown');
                }
            });
        }

        if (options.extraClasses) {
            $('#dialogBox').addClass(options.extraClasses);
        }

        $('#dialogBoxContent').html(content);
        $('#dialogBox').css('height', options.height);
        $('#dialogBox').fadeIn(100, function () {
            if (options.onAppear) {
                options.onAppear();
            }
        });

        $('#dialogBoxClose')
            .unbind('click')
            .click(function (e) {
                e.stopPropagation();
                $(this).unbind('click');

                if ($(this).css('width') === 0) {
                    return false;
                }

                $('#dialogBox').fadeOut(100, function () {
                    if (options.extraClasses) {
                        $('#dialogBox').removeClass(options.extraClasses);
                    }
                    $('#dialogBoxContent').empty();
                    $('#dialogBoxClose').css('width', '0');
                    $('#dialogBoxClose').css('font-size', '0');
                    if (options.onClose) {
                        options.onClose();
                    }
                });

                $('#userInputText').focus();
            });
    }

    function formatFingerprint(fingerprint) {
        let formatted = '';
        for (let i in fingerprint) {
            if (fingerprint.hasOwnProperty(i)) {
                if ((i !== 0) && (i % 8) === 0) {
                    formatted += ' ';
                }
                formatted += fingerprint[i];
            }
        }
        return formatted.toUpperCase();
    }

    return {
        showMyInfo,
        showBuddyInfo,
    };
})();
