(function () {
    'use strict';

    Cryptodog.locale = {};
    var languageObject;

    Cryptodog.locale.set = function (locale, refresh) {
        Cryptodog.locale.buildObject(locale, refresh);
    };

    // alternate async JSON-based language object builder
    Cryptodog.locale.buildObject = function (locale, refresh) {
        // make locale lowercase
        locale = locale.toLowerCase();

        // get a list of available languages
        $.getJSON('lang/langlist.json', function (langlist) {
            // handle aliases
            if (langlist['aliases'].hasOwnProperty(locale)) {
                var newlang = langlist['aliases'][locale];
                locale = newlang;
            }

            // make sure language is enabled
            if (langlist['languages'].indexOf(locale) === -1) {
                // language not present, default to en-US
                console.warn("Locale '" + locale + "' was not found, defaulting to en-US.");
                locale = 'en-us';
            }
            $.getJSON('lang/' + locale + '.json', function (data) {
                for (var o in data) {
                    if (data.hasOwnProperty(o)) {
                        Cryptodog.locale[o] = data[o];
                    }
                }
                if (refresh) Cryptodog.locale.refresh(data);
            });
        });
    };

    // Re-render login page with new strings
    Cryptodog.locale.refresh = function (languageObject) {
        var smallType = ['bo', 'ar', 'in'];

        if (smallType.indexOf(languageObject['language']) >= 0) {
            $('body').css({ 'font-size': '13px' });
        } else {
            $('body').css({ 'font-size': '11px' });
        }

        $('body').css('font-family', languageObject['fonts']);
        $('#introHeader').text(languageObject['loginWindow']['introHeader']);
        $('#introParagraph').html(languageObject['loginWindow']['introParagraph']);
        $('#customServer').text(languageObject['loginWindow']['customServer']);
        $('#conversationName').attr('placeholder', languageObject['loginWindow']['conversationName']);
        $('#conversationName').attr('data-utip', languageObject['loginWindow']['conversationNameTooltip']);
        $('#nickname').attr('placeholder', languageObject['loginWindow']['nickname']);
        $('#loginSubmit').val(languageObject['loginWindow']['connect']);
        $('#loginInfo').text(languageObject['loginWindow']['enterConversation']);
        $('#logout').attr('data-utip', languageObject['chatWindow']['logout']);
        $('#audio').attr('data-utip', languageObject['chatWindow']['audioNotificationsOff']);
        $('#notifications').attr('data-utip', languageObject['chatWindow']['desktopNotificationsOff']);
        $('#status').attr('data-utip', languageObject['chatWindow']['statusAvailable']);
        $('#languageSelect').text($('[data-locale=' + languageObject['language'] + ']').text());
        $('[data-login=cryptocat]').text(languageObject.login.groupChat);
        $('[data-utip]').utip();
        $('html').attr('dir', languageObject['direction']);

        if (languageObject['direction'] === 'ltr') {
            $('div#bubble #info li').css('background-position', 'top left');
        } else {
            $('div#bubble #info li').css('background-position', 'top right');
        }

        $('#conversationName').select();
    };

    // Populate language
    if (typeof window !== 'undefined') {
        $(window).ready(function () {
            Cryptodog.locale.set('en-US', true);
        });
    }
})();
