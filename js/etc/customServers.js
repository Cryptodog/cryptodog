$(window).ready(function () {
    'use strict';

    var updateCustomServers = function () {
        var customServers = {};
        $('#customServerSelector option').each(function () {
            var name = $(this).val();
            customServers[name] = {};
            customServers[name].domain = $(this).attr('data-domain');
            customServers[name].xmpp = $(this).attr('data-xmpp');
            customServers[name].relay = $(this).attr('data-relay');
        });
        storage.setItem('customServers', customServers);
    };

    $('#customServer').click(function () {
        if (!document.getElementById('customServerSelector').firstChild) {
            $('#customServerSelector').append(
                Mustache.render(Cryptodog.templates['customServer'], {
                    name: 'Cryptodog',
                    relay: 'wss://crypto.dog/ws'
                })
            );

            $('#customServerSelector').append(
                Mustache.render(Cryptodog.templates['customServer'], {
                    name: 'Cryptodog (Tor Hidden Service)',
                    relay: 'ws://doggyfipznipbaia.onion/ws'
                })
            );
        }

        $('#languages').hide();
        $('#footer').animate({ height: 220 }, function () {
            $('#customServerDialog').fadeIn();
            $('#customName').val(Cryptodog.net.currentServer.name);
            $('#customRelay').val(Cryptodog.net.currentServer.relay);

            $('#customServerReset')
                .val(Cryptodog.locale['loginWindow']['reset'])
                .click(function () {
                    $('#customName').val('Cryptodog');
                    $('#customRelay').val(Cryptodog.net.defaultServer.relay);

                    storage.removeItem('serverName');
                    storage.removeItem('domain');
                    storage.removeItem('conferenceServer');
                    storage.removeItem('relay');
                });

            $('#customServerSubmit')
                .val(Cryptodog.locale['chatWindow']['cont'])
                .click(function () {
                    $('#customServerDialog').fadeOut(200, function () {
                        $('#footer').animate({ height: 14 });
                    });

                    Cryptodog.net.currentServer.name = $('#customName').val();
                    Cryptodog.net.currentServer.relay = $('#customRelay').val();
                    storage.setItem('serverName', Cryptodog.net.currentServer.name);
                    storage.setItem('relay', Cryptodog.net.currentServer.relay);
                });
            $('#customDomain').select();
        });
    });

    $('#customServerSave').click(function () {
        $('#customServerDelete')
            .val('Delete')
            .attr('data-deleteconfirm', '0')
            .removeClass('confirm');

        if ($('#customDomain').val() === Cryptodog.net.defaultServer.domain) {
            return; // Cannot overwrite the default domain
        }

        var serverIsInList = false;
        $('#customServerSelector')
            .children()
            .each(function () {
                if ($('#customName').val() === $(this).val()) {
                    serverIsInList = true;

                    if ($('#customServerSave').attr('data-saveconfirm') !== '1') {
                        $('#customServerSave')
                            .val('Overwrite?')
                            .attr('data-saveconfirm', '1')
                            .addClass('confirm');
                        return;
                    } else {
                        $('#customServerSave')
                            .val('Save')
                            .attr('data-saveconfirm', '0')
                            .removeClass('confirm');
                    }
                }
            });

        if (!serverIsInList) {
            $('#customServerSelector').append(
                Mustache.render(Cryptodog.templates['customServer'], {
                    name: $('#customName').val(),
                    domain: $('#customDomain').val(),
                    xmpp: $('#customConferenceServer').val(),
                    relay: $('#customRelay').val()
                })
            );
        } else {
            $.each($('#customServerSelector option'), function (index, value) {
                if ($(value).val() === $('#customName').val()) {
                    $(value).attr('data-domain', $('#customDomain').val());
                    $(value).attr('data-relay', $('#customRelay').val());
                    $(value).attr('data-xmpp', $('#customConferenceServer').val());
                }
            });
        }
        updateCustomServers();
    });

    $('#customServerDelete').click(function () {
        $('#customServerSave')
            .val('Save')
            .attr('data-saveconfirm', '0')
            .removeClass('confirm');

        if ($('#customServerDelete').attr('data-deleteconfirm') === '1') {
            $.each($('#customServerSelector option'), function (index, value) {
                if ($(value).val() === $('#customName').val()) {
                    $(value).remove();
                }
            });
            updateCustomServers();
            $('#customServerDelete')
                .val('Delete')
                .attr('data-deleteconfirm', '0')
                .removeClass('confirm');
        } else {
            $('#customServerDelete')
                .val('Are you sure?')
                .attr('data-deleteconfirm', '1')
                .addClass('confirm');
        }
    });

    $('#customServerSelector').change(function () {
        $('#customServerDelete')
            .val('Delete')
            .attr('data-deleteconfirm', '0')
            .removeClass('confirm')
            .removeAttr('disabled')
            .removeClass('disabled');

        $('#customServerSave')
            .val('Save')
            .attr('data-saveconfirm', '0')
            .removeClass('confirm');

        var selectedOption = $(this).find(':selected');
        if ($(selectedOption).attr('data-domain') === Cryptodog.net.defaultServer.domain) {
            $('#customServerDelete')
                .attr('disabled', 'disabled')
                .addClass('disabled');
        }

        $('#customName').val($(selectedOption).val());
        $('#customDomain').val($(selectedOption).attr('data-domain'));
        $('#customConferenceServer').val($(selectedOption).attr('data-xmpp'));
        $('#customRelay').val($(selectedOption).attr('data-relay'));
    });
});
