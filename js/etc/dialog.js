const dialog = (function () {
    'use strict';

    function showSafetyNumber(buddy) {
        showBox(Mustache.render(template.buddyInfo, {
            nickname: buddy.nickname,
            safetyNumber: buddy.safetyNumber,
            safetyNumberTitle: Cryptodog.locale.safetyNumber.title,
            safetyNumberExplanation: Cryptodog.locale.safetyNumber.explanation
        }));
    }

    function showBox(content) {
        $(document).keydown(function (e) {
            if (e.keyCode === 27) {
                e.stopPropagation();
                closeBox();
                $(document).unbind('keydown');
            }
        });

        $('#dialogBox').html(content);
        $('#dialogBox').fadeIn(100);
    }

    function closeBox() {
        $('#dialogBox').fadeOut(100, function () {
            $('#dialogBox').empty();
        });
        $('#userInputText').focus();
    }

    return {
        showSafetyNumber,
    };
})();
