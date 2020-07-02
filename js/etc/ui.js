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
	WINDOW EVENT BINDINGS
	-------------------
    */
    windowEventBindings: function () {
        $(window).ready(function () {
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
