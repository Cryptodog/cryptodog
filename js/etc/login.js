window.addEventListener('load', () => {
    // Load nickname settings.
    storage.getItem('nickname', function (value) {
        if (value) {
            $('#nickname').animate({ color: 'transparent' }, function () {
                $(this).val(value);
                $(this).animate({ color: '#FFF' });
            });
        }
    });

    // Login form.
    $('#conversationName').click(function () {
        $(this).select();
    });
    $('#nickname').click(function () {
        $(this).select();
    });
    $('#login').submit(function () {
        // Don't submit if form is already being processed.
        if (($('#loginSubmit').attr('readonly') === 'readonly')) {
            return false;
        }

        $('#conversationName').val($.trim($('#conversationName').val().toLowerCase()));
        $('#nickname').val($.trim($('#nickname').val()));

        if ($('#conversationName').val() === '') {
            loginFail(Cryptodog.locale['loginMessage']['enterConversation']);
            $('#conversationName').select();
        } else if ($('#nickname').val() === '') {
            loginFail(Cryptodog.locale['loginMessage']['enterNickname']);
            $('#nickname').select();
        }

        // Prepare keys and connect
        else {
            $('#loginSubmit,#conversationName,#nickname').attr('readonly', 'readonly');
            Cryptodog.me.conversation = $('#conversationName').val();
            Cryptodog.me.nickname = $('#nickname').val();

            Cryptodog.me.mpPrivateKey = multiparty.newPrivateKey();
            Cryptodog.me.mpPublicKey = multiparty.publicKeyFromPrivate(Cryptodog.me.mpPrivateKey);
            Cryptodog.me.mpFingerprint = multiparty.fingerprint(Cryptodog.me.mpPublicKey.raw);

            Cryptodog.me.color = Cryptodog.color.pop();
            $('#loginInfo').text(Cryptodog.locale['loginMessage']['connecting']);

            net.join(function () {
                // Success callback.
                $('.conversationName').animate({ 'background-color': '#0087AF' });

                meta.sendPublicKey(Cryptodog.me.mpPublicKey.encoded);
                meta.requestPublicKey();

                $('#loginInfo').text('✓');
                $('#status').attr('src', 'img/icons/checkmark.svg');

                $('#login, #version, #logoText').fadeOut(200, function () {
                    $('#header').animate({ 'background-color': '#444' });
                    $('.logo').animate({ margin: '-11px 5px 0 0' });
                    $('#conversationInfo, #chatWindow, #optionButtons').fadeIn();

                    $('#footer')
                        .animate({ height: 60 }, function () {
                            $('#userInput').fadeIn(200, function () {
                                $('#userInputText').focus();
                            });
                        });

                    buddyList.initialize();
                });

                document.title = Cryptodog.me.nickname + '@' + Cryptodog.me.conversation;
                $('.conversationName').text(document.title);

                storage.setItem('nickname', Cryptodog.me.nickname);
            }, function (errorMessage) {
                // Failure callback.
                Cryptodog.logout();
                $('#nickname').select();
                $('#conversationName,#nickname').removeAttr('readonly');
                $('#loginSubmit').removeAttr('readonly');
                loginFail(errorMessage);
            });
        }
        return false;
    });

    function loginFail(message) {
        $('#loginInfo').text(message);
        $('#bubble')
            .animate({ left: '+=5px' }, 130)
            .animate({ left: '-=10px' }, 130)
            .animate({ left: '+=5px' }, 130);
    }
});
