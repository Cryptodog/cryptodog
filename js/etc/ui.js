if (typeof Cryptodog === 'undefined') {
    Cryptodog = function () { };
}

Cryptodog.UI = {
    // Set version number in UI.
    setVersion: function () {
        $('#version').text(Cryptodog.version);
    },

    // Handles login failures.
    loginFail: function (message) {
        $('#loginInfo').text(message);
        $('#bubble')
            .animate({ left: '+=5px' }, 130)
            .animate({ left: '-=10px' }, 130)
            .animate({ left: '+=5px' }, 130);
    },

    logout: function () {
        document.title = 'Cryptodog';

        $('#loginInfo').text(Cryptodog.locale['loginMessage']['thankYouUsing']);
        $('#conversationInfo,#optionButtons').fadeOut();
        $('#header').animate({ 'background-color': 'transparent' });
        $('.logo').animate({ margin: '-5px 5px 0 5px' });
        buddyList.cleanUp();

        $('#userInput').fadeOut(function () {
            $('#logoText').fadeIn();
            $('#footer').animate({ height: 14 });

            $('#conversationWrapper').fadeOut(function () {
                $('#info,#loginOptions,#version,#loginInfo').fadeIn();

                $('#login').fadeIn(200, function () {
                    $('#login').css({ opacity: 1 });
                    $('#conversationName').select();
                    $('#conversationName,#nickname').removeAttr('readonly');
                    $('#loginSubmit').removeAttr('readonly');
                });

                $('#dialogBoxClose').click();
                $('#conversationWindow').html('');
            });
        });
    },

    /*
	-------------------
	USER INTERFACE BINDINGS
	-------------------
    */
    userInterfaceBindings: function () {
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
    },

    /*
	-------------------
	WINDOW EVENT BINDINGS
	-------------------
    */
    windowEventBindings: function () {
        $(window).ready(function () {
            // Load custom servers.
            storage.getItem('customServers', function (servers) {
                if (servers) {
                    $('#customServerSelector').empty();

                    $.each(servers, function (name) {
                        $('#customServerSelector').append(
                            Mustache.render(template['customServer'], {
                                name: name,
                                domain: servers[name]['domain'],
                                xmpp: servers[name]['xmpp'],
                                relay: servers[name]['relay']
                            })
                        );
                    });
                }
            });

            // Load nickname settings.
            storage.getItem('nickname', function (value) {
                if (value) {
                    $('#nickname').animate({ color: 'transparent' }, function () {
                        $(this).val(value);
                        $(this).animate({ color: '#FFF' });
                    });
                }
            });
        });

        // On window focus, select text input field automatically if we are chatting.
        $(window).focus(function () {
            Cryptodog.newMessageCount();

            if (Cryptodog.me.currentBuddy) {
                $('#userInputText').focus();
            }
        });

        // Prevent accidental window close.
        window.addEventListener('beforeunload', (event) => {
            if (Object.keys(Cryptodog.buddies).length) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        // Log out on browser close.
        window.onunload = function () {
            net.disconnect();
        };

        // Determine whether we are showing a top margin
        // Depending on window size
        $(window).resize(function () {
            if ($(window).height() < 650) {
                $('#bubble').css('margin-top', '0');
            } else {
                $('#bubble').css('margin-top', '2%');
            }
        });
        $(window).resize();
    },

    show: function () {
        // Show main window.
        $('#bubble').show();
    }
};
