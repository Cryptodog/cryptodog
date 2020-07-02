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

    // Default emoticons (Unicode) - also in lang/emojis/unicode.json
    emoticons: [
        {
            data: '😢',
            regex: /(\s|^)(:|(=))-?\&apos;\((?=(\s|$))/gi
        }, // :'( - Cry
        {
            data: '😕',
            regex: /(\s|^)(:|(=))-?(\/|s)(?=(\s|$))/gi
        }, // :/ - Unsure
        {
            data: '🐱',
            regex: /(\s|^)(:|(=))-?3(?=(\s|$))/gi
        }, // :3 - Cat face
        {
            data: '😮',
            regex: /(\s|^)(:|(=))-?o(?=(\s|$))/gi
        }, // :O - Shock
        {
            data: '😄',
            regex: /(\s|^)(:|(=))-?D(?=(\s|$))/gi
        }, // :D - Grin
        {
            data: '☹',
            regex: /(\s|^)(:|(=))-?\((?=(\s|$))/gi
        }, // :( - Sad
        {
            data: '😊',
            regex: /(\s|^)(:|(=))-?\)(?=(\s|$))/gi
        }, // :) - Happy
        {
            data: '😛',
            regex: /(\s|^)(:|(=))-?p(?=(\s|$))/gi
        }, // :P - Tongue
        {
            data: '😶',
            regex: /(\s|^)(:|(=))-?x\b(?=(\s|$))/gi
        }, // :x - Shut
        {
            data: '😉',
            regex: /(\s|^);-?\)(?=(\s|$))/gi
        }, // ;) - Wink
        {
            data: '😜',
            regex: /(\s|^);-?\p(?=(\s|$))/gi
        }, // ;P - Winky Tongue
        {
            data: '❤️',
            regex: /(\s|^)\&lt\;3\b(?=(\s|$))/g
        } // <3 - Heart
    ],

    // Convert text emoticons to graphical emoticons.
    addEmoticons: function (message) {
        for (var i = 0; i < Cryptodog.UI.emoticons.length; i++) {
            var e = Cryptodog.UI.emoticons[i];
            message = message.replace(e.regex, ' <span class="monospace">' + e.data + '</span>');
        }
        return message;
    },

    setEmoticonPack: function (packId) {
        $.getJSON('lang/emojis/' + packId + '.json', function (emojiJSON) {
            console.log("Loaded emoji pack '" + emojiJSON.name + "'");

            if (emojiJSON.type !== 'text') {
                console.error('Non-text emoji sets are not supported right now.');
                return;
            }

            Cryptodog.UI.emoticons = [];
            emojiJSON.data.forEach(function (emoji) {
                console.log('Started loading ' + emoji.name);
                var regex = new RegExp(emoji.regex, emoji.regexflags);
                Cryptodog.UI.emoticons.push({ data: emoji.data, regex: regex });
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
