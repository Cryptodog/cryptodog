'use strict';
localforage.config({name: 'Cryptodog'});

// Functions for interfacing with localforage
Cryptodog.storage = {
    setItem: function(key, value){
        localforage.setItem(key, value, function(err, value){
            if (err){
                console.error(err);
            } else {
                log('Set (' + key + ', ' + value + ') in storage');
            }
        });
    },
    getItem: function(key, callback){
        localforage.getItem(key, function(err, value){
            if (err){
                console.error(err);
            } else {
                log('Read (' + key + ', ' + value + ') from storage');
            }
            callback(value);
        });
    },
    removeItem: function(key) {
        localforage.removeItem(key, function(key, err){
            if (err){
                console.error(err);
            }
            else {
                log('Removed ' + key + ' from storage');
            }
        });
    }
};

// Load custom server settings
Cryptodog.storage.getItem('serverName', function(key){
    if (key){
        Cryptodog.serverName = key;
    }
});
Cryptodog.storage.getItem('domain', function(key){
    if (key){
        Cryptodog.xmpp.domain = key;
    }
});
Cryptodog.storage.getItem('conferenceServer', function(key){
    if (key){
        Cryptodog.xmpp.conferenceServer = key;
    }
});
Cryptodog.storage.getItem('relay', function(key){
    if (key){
        Cryptodog.xmpp.relay = key;
    }
});
