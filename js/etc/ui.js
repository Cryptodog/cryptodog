﻿if (typeof Cryptodog === 'undefined') {
    Cryptodog = function() {};
}

Cryptodog.UI = {
    // Set version number in UI.
    setVersion: function() {
        $('#version').text(Cryptodog.version);
    },

    // Signal a file transfer error in the UI.
    fileTransferError: function(sid, nickname) {
        $('.fileProgressBar')
            .filterByData('file', sid)
            .filterByData('id', Cryptodog.buddies[nickname].id)
            .animate({ borderColor: '#F00' });
        $('.fileProgressBarFill')
            .filterByData('file', sid)
            .filterByData('id', Cryptodog.buddies[nickname].id)
            .animate({ 'background-color': '#F00' });
    },

    // Handles login failures.
    loginFail: function(message) {
        $('#loginInfo').text(message);
        $('#bubble')
            .animate({ left: '+=5px' }, 130)
            .animate({ left: '-=10px' }, 130)
            .animate({ left: '+=5px' }, 130);
    },

    // Handle detected new keys.
    removeAuthAndWarn: function(nickname) {
        var buddy = Cryptodog.buddies[nickname];
        buddy.updateAuth(false);
        dialog.showErrorAKE(nickname);
    },

    logout: function() {
        document.title = 'Cryptodog';

        $('#loginInfo').text(Cryptodog.locale['loginMessage']['thankYouUsing']);
        $('#conversationInfo,#optionButtons').fadeOut();
        $('#header').animate({ 'background-color': 'transparent' });
        $('.logo').animate({ margin: '-5px 5px 0 5px' });
        $('#buddyWrapper').slideUp();
        $('.buddy').unbind('click');
        $('.buddyMenu').unbind('click');
        $('#buddy-groupChat').insertAfter('#buddiesOnline');

        $('#userInput').fadeOut(function() {
            $('#logoText').fadeIn();
            $('#footer').animate({ height: 14 });

            $('#conversationWrapper').fadeOut(function() {
                $('#info,#loginOptions,#version,#loginInfo').fadeIn();

                $('#login').fadeIn(200, function() {
                    $('#login').css({ opacity: 1 });
                    $('#conversationName').select();
                    $('#conversationName,#nickname').removeAttr('readonly');
                    $('#loginSubmit').removeAttr('readonly');
                });

                $('#dialogBoxClose').click();

                $('#buddyList div').each(function() {
                    if ($(this).attr('id') !== 'buddy-groupChat') {
                        $(this).remove();
                    }
                });

                $('#conversationWindow').html('');
            });
        });
    },

    // Open base64 Data URI in new window.
    openDataInNewWindow: function(url) {
        var win = window.open();
        var image = new Image();
        image.src = url;
        win.document.write(image.outerHTML);
        win.focus();
    },

    addDataLinks: function(message) {
        // Make sure the string is a legitimate data URI, and is of an accepted image format.
        var re = /data:image\/(png|jpeg|gif);(charset=[\w-]+|base64)?,\S+/gi;
        return message.replace(re, '<a data-uri-data="$&" class="data-uri-clickable" href="#">[Embedded image]</a>');
    },

    // Convert message URLs to links. Used internally.
    addLinks: function(message) {
        // Handle image data URIs gracefully:
        message = Cryptodog.UI.addDataLinks(message);
        return message.autoLink();
    },

    // Simple text formatting
    stylizeText: function(text) {
        // Disable text formatting in messages that contain links to avoid interference
        let linkPattern = /(https?|ftps?):\/\//gi;

        if (text.match(linkPattern) === null) {
            // Swap ***.+*** for strong and italic text
            let strongItalicPattern = /\*\*\*((?!\s).+)\*\*\*/gi;
            text = text.replace(strongItalicPattern, "<strong><i>$1</i></strong>");

            // Swap **.+** for strong text
            let strongPattern = /\*\*((?!\s).+)\*\*/gi;
            text = text.replace(strongPattern, "<strong>$1</strong>");

            // Swap *.+* for italics
            let italicPattern = /\*((?!\s).+)\*/gi;
            text = text.replace(italicPattern, "<i>$1</i>");
        }
        return text;
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
    addEmoticons: function(message) {
        for (var i = 0; i < Cryptodog.UI.emoticons.length; i++) {
            var e = Cryptodog.UI.emoticons[i];
            message = message.replace(e.regex, ' <span class="monospace">' + e.data + '</span>');
        }
        return message;
    },

    setEmoticonPack: function(packId) {
        $.getJSON('lang/emojis/' + packId + '.json', function(emojiJSON) {
            console.log("Loaded emoji pack '" + emojiJSON.name + "'");

            if (emojiJSON.type !== 'text') {
                console.error('Non-text emoji sets are not supported right now.');
                return;
            }

            Cryptodog.UI.emoticons = [];
            emojiJSON.data.forEach(function(emoji) {
                console.log('Started loading ' + emoji.name);
                var regex = new RegExp(emoji.regex, emoji.regexflags);
                Cryptodog.UI.emoticons.push({ data: emoji.data, regex: regex });
            });
        });
    },

    bindSenderElement: function(senderElement) {
        if (!senderElement) {
            senderElement = $('.sender');
        }

        senderElement.unbind('mouseenter,mouseleave,click');

        // Show timestamp when mouse enters sender element.
        senderElement.mouseenter(function() {
            $(this).find('.nickname').text($(this).attr('data-timestamp'));
        });

        senderElement.mouseleave(function() {
            $(this).find('.nickname').text($(this).attr('data-sender'));
        });
    },

    // Scrolls down the chat window to the bottom in a smooth animation.
    // 'speed' is animation speed in milliseconds.
    // If `threshold` is true, we won't scroll down if the user
    // appears to be scrolling up to read messages.
    scrollDownConversation: function(speed, threshold) {
        var scrollPosition = $('#conversationWindow')[0].scrollHeight;
        scrollPosition -= $('#conversationWindow').scrollTop();

        if (scrollPosition < 700 || !threshold) {
            $('#conversationWindow')
                .stop()
                .animate(
                    {
                        scrollTop: $('#conversationWindow')[0].scrollHeight + 20
                    },
                    speed
                );
        }
    },

    /*
	-------------------
	USER INTERFACE BINDINGS
	-------------------
    */
    userInterfaceBindings: function() {
        $('#buddyWhitelist').click(function() {
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
        $('#audioToggle').click(function() {
            if (Cryptodog.allowSoundNotifications) {
                Cryptodog.allowSoundNotifications = false;
                Cryptodog.storage.setItem('audioNotifications', 'false');
                $('#audioToggle').attr('data-utip', 'Audio notifications: off');
                $('#audioToggle').attr('src', 'img/icons/volume-mute.svg');
            } else {
                Cryptodog.allowSoundNotifications = true;
                Cryptodog.storage.setItem('audioNotifications', 'true');
                $('#audioToggle').attr('data-utip', 'Audio notifications: on');
                $('#audioToggle').attr('src', 'img/icons/volume-medium.svg');
            }

            $('#audioToggle').mouseenter();
        });

        // Status button.
        $('#status').click(function() {
            var $this = $(this);
            if ($this.attr('src') === 'img/icons/checkmark.svg') {
                $this.attr('src', 'img/icons/cross.svg');
                $this.attr('title', Cryptodog.locale['chatWindow']['statusAway']);
                $this.attr('data-utip', Cryptodog.locale['chatWindow']['statusAway']);
                $this.mouseenter();
                Cryptodog.changeStatus('away');
            } else {
                $this.attr('src', 'img/icons/checkmark.svg');
                $this.attr('title', Cryptodog.locale['chatWindow']['statusAvailable']);
                $this.attr('data-utip', Cryptodog.locale['chatWindow']['statusAvailable']);
                $this.mouseenter();
                Cryptodog.changeStatus('online');
            }
        });

        // My info button.
        $('#myInfo').click(function() {
            Cryptodog.displayInfo(Cryptodog.me.nickname);
        });

        // Desktop notifications button.
        $('#notifications').click(function() {
            var $this = $(this);

            if ($this.attr('src') === 'img/icons/bubble2.svg') {
                $this.attr('src', 'img/icons/bubble.svg');
                $this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOn']);
                $this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOn']);
                $this.mouseenter();

                Cryptodog.desktopNotifications = true;
                Cryptodog.storage.setItem('desktopNotifications', 'true');

                var notifStatus = Notification.permission;
                if (notifStatus == 'denied') {
                    // notifications supported but not enabled
                    Notification.requestPermission();

                    // check if user actually accepted
                    if (Notification.permission == 'denied') {
                        Cryptodog.desktopNotifications = false;
                        Cryptodog.storage.setItem('desktopNotifications', 'false');
                    }
                } else if (notifStatus == 'unknown') {
                    // browser doesn't support desktop notifications
                    alert("It looks like your browser doesn't support desktop notifications.");

                    $this.attr('src', 'img/icons/bubble2.svg');
                    $this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOff']);
                    $this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOff']);
                    $this.mouseenter();

                    Cryptodog.desktopNotifications = false;
                    Cryptodog.storage.setItem('desktopNotifications', 'false');
                }
            } else {
                $this.attr('src', 'img/icons/bubble2.svg');
                $this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOff']);
                $this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOff']);
                $this.mouseenter();

                Cryptodog.desktopNotifications = false;
                Cryptodog.storage.setItem('desktopNotifications', 'false');
            }
        });

        // Logout button.
        $('#logout').click(function() {
            Cryptodog.logout();
        });

        $('#userInputText').keyup(function(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
            }
        });

        $('#userInputSubmit').click(function() {
            $('#userInput').submit();
            $('#userInputText').select();
        });

        // Language selector.
        $('#languageSelect').click(function() {
            $('#customServerDialog').hide();
            $('#languages li').css({ color: '#FFF', 'font-weight': 'normal' });

            $('[data-locale=' + Cryptodog.locale['language'] + ']').css({
                color: '#CCC',
                'font-weight': 'bold'
            });

            $('#footer').animate({ height: 190 }, function() {
                $('#languages').fadeIn();
            });

            $('#languages li').click(function() {
                var lang = $(this).attr('data-locale');
                $('#languages').fadeOut(200, function() {
                    Cryptodog.locale.set(lang, true);
                    Cryptodog.storage.setItem('language', lang);
                    $('#footer').animate({ height: 14 });
                });
            });
        });

        // Login form.
        $('#conversationName').click(function() {
            $(this).select();
        });
        $('#nickname').click(function() {
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
    windowEventBindings: function() {
        $(window).ready(function() {
            // Initialize language settings.
            Cryptodog.storage.getItem('language', function(key) {
                if (key) {
                    Cryptodog.locale.set(key, true);
                } else {
                    Cryptodog.locale.set(window.navigator.language.toLowerCase());
                }
            });

            // Load custom servers.
            Cryptodog.storage.getItem('customServers', function(key) {
                if (key) {
                    $('#customServerSelector').empty();
                    var servers = $.parseJSON(key);

                    $.each(servers, function(name) {
                        $('#customServerSelector').append(
                            Mustache.render(Cryptodog.templates['customServer'], {
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
            Cryptodog.storage.getItem('nickname', function(key) {
                if (key) {
                    $('#nickname').animate({ color: 'transparent' }, function() {
                        $(this).val(key);
                        $(this).animate({ color: '#FFF' });
                    });
                }
            });

            // Load notification settings.
            window.setTimeout(function() {
                Cryptodog.storage.getItem('desktopNotifications', function(key) {
                    if (key === 'true') {
                        $('#notifications').click();
                        $('#utip').hide();
                    }
                });
                Cryptodog.storage.getItem('audioNotifications', function(key) {
                    if (key === 'true') {
                        $('#audioToggle').click();
                    }
                });
            }, 800);
        });

        // When the window/tab is not selected, set `windowFocus` to false.
        // `windowFocus` is used to know when to show desktop notifications.
        $(window).blur(function() {
            Cryptodog.me.windowFocus = false;
        });

        // On window focus, select text input field automatically if we are chatting.
        // Also set `windowFocus` to true.
        $(window).focus(function() {
            Cryptodog.me.windowFocus = true;
            Cryptodog.newMessageCount();

            if (Cryptodog.me.currentBuddy) {
                $('#userInputText').focus();
            }
        });

        // Prevent accidental window close.
        $(window).bind('beforeunload', function() {
            if (Object.keys(Cryptodog.buddies).length > 1) {
                return Cryptodog.locale['loginMessage']['thankYouUsing'];
            }
        });

        // Logout on browser close.
        window.onunload = function() {
            if (Cryptodog.xmpp.connection !== null) {
                Cryptodog.xmpp.connection.disconnect();
            }
        };

        // Determine whether we are showing a top margin
        // Depending on window size
        $(window).resize(function() {
            if ($(window).height() < 650) {
                $('#bubble').css('margin-top', '0');
            } else {
                $('#bubble').css('margin-top', '2%');
            }
        });
        $(window).resize();
    },

    show: function() {
        // Show main window.
        $('#bubble').show();
    }
};
