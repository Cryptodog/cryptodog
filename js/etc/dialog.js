const dialog = (function () {
    'use strict';

    const dialogBoxId = '#dialogBox';

    function showSafetyNumber(buddy) {
        showBox(Mustache.render(template.buddyInfo, {
            nickname: buddy.nickname,
            safetyNumber: buddy.safetyNumber,
            safetyNumberTitle: Cryptodog.locale.safetyNumber.title,
            safetyNumberExplanation: Cryptodog.locale.safetyNumber.explanation
        }));
    }

    function showBox(content) {
        $(document).on('keydown.escDialogBox', function (e) {
            if (e.key === 'Escape') {
                $(document).off('keydown.escDialogBox');
                closeBox();
            }
        });

        $(document).on('click.outsideDialogBox', function (e) {
            if (!$(dialogBoxId).is(e.target) && !$(dialogBoxId).has(e.target).length) {
                $(document).off('click.outsideDialogBox');
                closeBox();
            }
        });

        $(dialogBoxId).html(content);
        $(dialogBoxId).fadeIn(100);
    }

    function closeBox() {
        $(dialogBoxId).fadeOut(100, function () {
            $(dialogBoxId).empty();
        });
    }

    return {
        showSafetyNumber,
    };
})();
