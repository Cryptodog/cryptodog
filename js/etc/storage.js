'use strict';
localforage.config();

Cryptodog.storage = {
    setItem: function(key, val) {
        localforage.setItem(key, val, function(err, result) {
            if (err) {
                console.error("error when setting item in localForage");
            } else {
                log("wrote key '" + key + "' to storage.");
            }
        });
    },
    getItem: function(key, callback) {
        return localforage.getItem(key, function (err, val) {
            if (err) {
                console.error("An error occurred during localStorage read.");
                return null;
            } else {
                log("read key '" + key + "' from storage.");
            }
            callback(val);
        });
    },
    removeItem: function(key) {
        localforage.removeItem(key, function(thing) {
            log("removed item from storage");
        });
    }
}

$(window).ready(function () {
    // Initialize language settings.
    Cryptodog.storage.getItem('language', function (key) {
        if (key) {
            Cryptodog.locale.set(key, true)
        }
        else {
            Cryptodog.locale.set(window.navigator.language.toLowerCase())
        }
    })

    // Load custom server settings
    Cryptodog.storage.getItem('serverName', function (key) {
        if (key) { Cryptodog.serverName = key }
    })
    Cryptodog.storage.getItem('domain', function (key) {
        if (key) { Cryptodog.xmpp.domain = key }
    })
    Cryptodog.storage.getItem('conferenceServer', function (key) {
        if (key) { Cryptodog.xmpp.conferenceServer = key }
    })
    Cryptodog.storage.getItem('relay', function (key) {
        if (key) { Cryptodog.xmpp.relay = key }
    })
    Cryptodog.storage.getItem('customServers', function (key) {
        if (key) {
            $('#customServerSelector').empty()
            var servers = $.parseJSON(key)
            $.each(servers, function (name) {
                $('#customServerSelector').append(
                    Mustache.render(Cryptodog.templates['customServer'], {
                        name: name,
                        domain: servers[name]['domain'],
                        xmpp: servers[name]['xmpp'],
                        relay: servers[name]['relay']
                    })
                )
            })
        }
    })

    // Load nickname settings.
    Cryptodog.storage.getItem('nickname', function (key) {
        if (key) {
            $('#nickname').animate({ 'color': 'transparent' }, function () {
                $(this).val(key)
                $(this).animate({ 'color': '#FFF' })
            })
        }
    })

    // Load notification settings.
    window.setTimeout(function () {
        Cryptodog.storage.getItem('desktopNotifications', function (key) {
            if (key === 'true') {
                $('#notifications').click()
                $('#utip').hide()
            }
        })
        Cryptodog.storage.getItem('audioNotifications', function (key) {
            if ((key === 'true') || !key) {
                $('#audio').click()
                $('#utip').hide()
            }
        })
    }, 800)

})
