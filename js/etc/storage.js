const storage = function () {
    'use strict';

    localforage.config({
        name: 'Cryptodog'
    });

    function setItem(key, value) {
        localforage.setItem(key, value, function (err) {
            if (err) {
                console.error(err);
            }
        });
    }

    function getItem(key, successCallback) {
        localforage.getItem(key, function (err, value) {
            if (err) {
                console.error(err);
            } else {
                successCallback(value);
            }
        });
    }

    function removeItem(key) {
        localforage.removeItem(key, function (err) {
            if (err) {
                console.error(err);
            }
        });
    }

    return {
        setItem,
        getItem,
        removeItem,
    };
}();

