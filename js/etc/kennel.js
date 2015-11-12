Cryptodog.storage = {};

$(window).ready(function() {
    'use strict';

    localforage.config();

    // Cryptodog Storage API
    // This API exists as a shim between Cryptodog and localForage

    // How to use:
    // Cryptodog.storage.setItem(itemName, itemValue)
    // Sets itemName's value to itemValue.

    // Cryptodog.storage.getItem(itemName, callbackFunction(result))
    // Gets itemName's value from local storage, and passes it to
    // the callback function as result.

    // Cryptodog.storage.removeItem(itemName)
    // Removes itemName and its value from local storage.
    Cryptodog.storage = (function() {
        // let localForage handle browser detection, etc
        return {
            setItem: function(key, val) {
                localforage.setItem(key, val, function(err, result) {
                    if (err) {
                        console.error("error when setting item in localForage");
                    } else {
                        console.log("wrote key '" + key + "' to storage.");
                    }
                });
            },
            getItem: function(key, callback) {
                return localforage.getItem(key, function(err, val) {
                    if (err) {
                        console.error("An error occurred during localStorage read.");
                        return null;
                    } else {
                        console.log("read key '" + key + "' from storage.");
                    }
                    callback(val);
                });
            },
            removeItem: function(key) {
                localforage.removeItem(key, function(item) {
                    console.log("removed item from storage");
                });
            }
        };
    })();

    // Initialize language settings.
    Cryptodog.storage.getItem('language', function(key) {
        if (key) {
            Cryptodog.locale.set(key, true);
        } else {
            Cryptodog.locale.set(window.navigator.language.toLowerCase());
        }
    });

    // Load custom server settings object
    Cryptodog.storage.getItem('server', function(value) {
        if (value !== null) {
            Cryptodog.serverName = value.key;
            Cryptodog.xmpp.domain = value.domain;
            Cryptodog.xmpp.conferenceServer = value.conferenceServer;
            Cryptodog.xmpp.relay = value.relay;
        }
    });

    // Load custom server settings
    //Cryptodog.storage.getItem('serverName', function(key) {
    //    if (key) {
    //        Cryptodog.serverName = key;
    //    }
    //});
    //Cryptodog.storage.getItem('domain', function(key) {
    //    if (key) {
    //        Cryptodog.xmpp.domain = key;
    //    }
    //});
    //Cryptodog.storage.getItem('conferenceServer', function(key) {
    //    if (key) {
    //        Cryptodog.xmpp.conferenceServer = key;
    //    }
    //});
    //Cryptodog.storage.getItem('relay', function(key) {
    //    if (key) {
    //        Cryptodog.xmpp.relay = key;
    //    }
    //});
    Cryptodog.storage.getItem('customServers', function(key) {
        if (key) {
            console.log("Populating server list");
            $('#customServerSelector').empty();
            
            key.forEach(function(item) {
                $('#customServerSelector').append(
                    Mustache.render(Cryptodog.templates.customServer, {
                        name: item.name,
                        domain: item.domain,
                        XMPP: item.xmpp,
                        Relay: item.relay
                    })
                );
            })
        }
    });

    // Load nickname settings.
    Cryptodog.storage.getItem('myNickname', function(key) {
        if (key) {
            $('#nickname').animate({ 'color': 'transparent' }, function() {
                $(this).val(key);
                $(this).animate({ 'color': '#FFF' });
            });
        }
    });

    // Load notification settings.
    window.setTimeout(function() {
        Cryptodog.storage.getItem('desktopNotifications', function(key) {
            if (typeof (key) === "boolean" && key) {
                $('#notifications').click();
                $('#utip').hide();
            }
        });
        Cryptodog.storage.getItem('audioNotifications', function(key) {
            if ((key === 'true') || !key) {
                $('#audio').click();
                $('#utip').hide();
            }
        });
    }, 800);

});
