const dialog = (function () {
    'use strict';

    function showBuddyInfo(buddy) {
        let buddyInfo = Mustache.render(template.buddyInfo, {
            nickname: buddy.nickname,
            authenticated: Cryptodog.locale.auth.authenticated + ':',
            safetyNumber: buddy.safetyNumber,
        });

        showBox(buddyInfo, {
            height: 430,
            closeable: true,
        });

        buddy.updateAuth(buddy.authenticated);

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

    return {
        showBuddyInfo,
    };
})();
