window.addEventListener('load', () => {
    $('#buddyWhitelist').click(function () {
        if (Cryptodog.buddyWhitelistEnabled) {
            $(this).attr('src', 'img/icons/users.svg');
            $(this).attr('data-utip', 'Buddy whitelist: off');
        } else {
            $(this).attr('src', 'img/icons/lock.svg');
            $(this).attr('data-utip', 'Buddy whitelist: on');
        }

        $(this).mouseenter();
        Cryptodog.toggleBuddyWhitelist();
    });

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


