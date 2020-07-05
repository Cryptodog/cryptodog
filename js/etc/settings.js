window.addEventListener('load', () => {
    $('#buddyWhitelist').click(function () { });

    // Audio notifications toggle button
    $('#audioToggle').click(function () { });

    // Status button.
    $('#status').click(function () {
        var $this = $(this);
        if ($this.attr('src') === 'img/icons/checkmark.svg') {
            $this.attr('src', 'img/icons/cross.svg');
            $this.attr('title', Cryptodog.locale['chatWindow']['statusAway']);
            $this.attr('data-utip', Cryptodog.locale['chatWindow']['statusAway']);
            $this.mouseenter();
            Cryptodog.me.status = 'away';
        } else {
            $this.attr('src', 'img/icons/checkmark.svg');
            $this.attr('title', Cryptodog.locale['chatWindow']['statusAvailable']);
            $this.attr('data-utip', Cryptodog.locale['chatWindow']['statusAvailable']);
            $this.mouseenter();
            Cryptodog.me.status = 'online';
        }
        meta.sendStatus(Cryptodog.me.status);
    });

    // My info button.
    $('#myInfo').click(function () {
        dialog.showMyInfo(Cryptodog.me);
    });

    // Desktop notifications button.
    $('#notifications').click(function () { });

    // Logout button.
    $('#logout').click(function () {
        Cryptodog.logout();
        document.title = 'Cryptodog';

        $('#loginInfo').text(Cryptodog.locale['loginMessage']['thankYouUsing']);
        $('#conversationInfo,#optionButtons').fadeOut();
        $('#header').animate({ 'background-color': 'transparent' });
        $('.logo').animate({ margin: '-5px 5px 0 5px' });

        $('#userInput').fadeOut(function () {
            $('#logoText').fadeIn();
            $('#footer').animate({ height: 14 });

            $('#chatWindowWrapper').fadeOut(function () {
                $('#info,#loginOptions,#version,#loginInfo').fadeIn();

                $('#login').fadeIn(200, function () {
                    $('#login').css({ opacity: 1 });
                    $('#conversationName').select();
                    $('#conversationName,#nickname').removeAttr('readonly');
                    $('#loginSubmit').removeAttr('readonly');
                });

                $('#dialogBoxClose').click();
                chat.reset();
            });
        });
    });

    // Login form.
    $('#conversationName').click(function () {
        $(this).select();
    });
    $('#nickname').click(function () {
        $(this).select();
    });

    $(document).bind('mousedown', function (e) {
        if (!$(e.target).parents('.buddyMenu').length > 0) {
            $('.buddyMenu').hide();
            $('.buddy.active').removeClass('active');
        }
    });
});


