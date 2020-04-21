const dialog = (function () {
    'use strict';

    function showMyInfo(me) {
        let myInfo = Mustache.render(Cryptodog.templates['myInfo'], {
            nickname: me.nickname,
            otrFingerprint: Cryptodog.locale.chatWindow.otrFingerprint,
            groupFingerprint: Cryptodog.locale.chatWindow.groupFingerprint
        });
        showBox(myInfo, {
            height: 250,
            closeable: true
        });
        $('#otrFingerprint').text(formatFingerprint(me.otrKey.fingerprint()));
        $('#multiPartyFingerprint').text(formatFingerprint(me.mpFingerprint));
    }

    function showBuddyInfo(buddy) {
        let buddyInfo = Mustache.render(Cryptodog.templates['buddyInfo'], {
            nickname: buddy.nickname,
            authenticated: Cryptodog.locale.auth.authenticated + ':',
            otrFingerprint: Cryptodog.locale.chatWindow.otrFingerprint,
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

        $('#otrFingerprint').text(formatFingerprint(buddy.fingerprint));
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
        $('#authSubmit').unbind('click').bind('click', function (e) {
            e.preventDefault();
            let question = $('#authQuestion').val();
            let answer = $('#authAnswer').val();
            if (answer.length === 0) {
                return;
            }
            $('#authSubmit').val(Cryptodog.locale.chatWindow.asking);
            $('#authSubmit').unbind('click').bind('click', function (e) {
                e.preventDefault();
            });
            buddy.updateAuth(false);
            answer = Cryptodog.prepareAnswer(answer, true, buddy.mpFingerprint);
            buddy.otr.smpSecret(answer, question);
        });
    }

    function showOTRProgress(start) {
        let progressBar = '<div id="progressBar"><div id="fill"></div></div>';
        showBox(progressBar, {
            height: 250,
            closeable: true,
            onAppear: function () {
                $('#fill').animate({ width: '100%', opacity: '1' }, {
                    duration: 10000, easing: 'linear', start: start
                });
            }
        });
    }

    function hideOTRProgress(state) {
        $('#fill').stop().animate({ width: '100%', opacity: '1' }, 100, 'linear', function () {
            $('#dialogBoxContent').fadeOut(function () {
                $(this)
                    .empty()
                    .show();
                if (state.close) {
                    $('#dialogBoxClose').click();
                }
                state.cb();
            });
        });
    }

    function showSendFile(buddy) {
        let sendFile = Mustache.render(Cryptodog.templates.sendFile, {
            sendEncryptedFile: Cryptodog.locale['chatWindow']['sendEncryptedFile'],
            fileTransferInfo: Cryptodog.locale['chatWindow']['fileTransferInfo']
                .replace('(SIZE)', Cryptodog.otr.maximumFileSize / 1024)
        });

        showBox(sendFile, {
            height: 250,
            closeable: true
        });

        $('#fileSelector').change(function (e) {
            e.stopPropagation();
            if (this.files) {
                let file = this.files[0];
                let filename = CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(16));
                filename += file.name.match(/\.(\w)+$/)[0];
                buddy.otr.sendFile(filename);
                let key = buddy.fileKey[filename];
                Cryptodog.otr.beginSendFile({
                    file: file,
                    filename: filename,
                    to: nickname,
                    key: key
                });
                delete buddy.fileKey[filename];
            }
        });
        $('#fileSelectButton').click(function () {
            $('#fileSelector').click();
        });
    }

    function showSMPQuestion(buddy, question) {
        let smpQuestion = Mustache.render(Cryptodog.templates.authRequest, {
            authenticate: Cryptodog.locale.chatWindow.authenticate,
            authRequest: Cryptodog.locale.chatWindow.authRequest.replace('(NICKNAME)', buddy.nickname),
            answerMustMatch: Cryptodog.locale.chatWindow.answerMustMatch.replace('(NICKNAME)', buddy.nickname),
            question: question,
            answer: Cryptodog.locale.chatWindow.answer
        });

        $('#dialogBoxClose').click();

        showBox(smpQuestion, {
            height: 240,
            closeable: true,

            onAppear: function () {
                $('#authReplySubmit')
                    .unbind('click')
                    .bind('click', function (e) {
                        e.preventDefault();
                        let answer = $('#authReply').val();
                        answer = Cryptodog.prepareAnswer(answer, false, buddy.mpFingerprint);
                        buddy.otr.smpSecret(answer);
                        $('#dialogBox').hide();
                    });
            },

            onClose: function () {
                buddy.otr.smpSecret(CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(16)));
            }
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
        showOTRProgress,
        hideOTRProgress,
        showSendFile,
        showSMPQuestion
    };
})();
