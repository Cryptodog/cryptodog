if (typeof Cryptodog === 'undefined') {
    Cryptodog = function () { };
}

Cryptodog.UI = {
    windowEventBindings: function () {
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
};
