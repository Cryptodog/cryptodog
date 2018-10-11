'use strict';
localforage.config({ name: 'Cryptodog' });

// Functions for interfacing with localforage
Cryptodog.storage = {
    setItem: function(key, value) {
        localforage.setItem(key, value, function(err, value) {
            if (err) {
                console.error(err);
            } else {
                log('Set (' + key + ', ' + value + ') in storage');
            }
        });
    },
    
    getItem: function(key, callback) {
        localforage.getItem(key, function(err, value) {
            if (err) {
                console.error(err);
            } else {
                log('Read (' + key + ', ' + value + ') from storage');
            }
            callback(value);
        });
    },
    
    removeItem: function(key) {
        localforage.removeItem(key, function(key, err) {
            if (err) {
                console.error(err);
            } else {
                log('Removed ' + key + ' from storage');
            }
        });
    },

    clear: function() {
        localforage.clear();
    }
};
