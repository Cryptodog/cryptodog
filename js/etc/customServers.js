$(window).ready(function() {
'use strict';

var updateCustomServers = function() {
	var customServers = {}
	$('#customServerSelector option').each(function() {
		var name = $(this).val()
		customServers[name] = {}
		customServers[name].domain = $(this).attr('data-domain')
		customServers[name].xmpp = $(this).attr('data-xmpp')
		customServers[name].relay = $(this).attr('data-relay')
	})
	Cryptodog.storage.setItem('customServers', JSON.stringify(customServers))
}

$('#customServer').click(function() {
	if (!document.getElementById('customServerSelector').firstChild) {
		$('#customServerSelector').append(
			Mustache.render(Cryptodog.templates['customServer'], {
				name: 'Cryptodog',
				domain: Cryptodog.xmpp.defaultDomain,
				XMPP: Cryptodog.xmpp.defaultConferenceServer,
				Relay: Cryptodog.xmpp.defaultRelay
			})
		)

		 $('#customServerSelector').append(
                        Mustache.render(Cryptodog.templates['customServer'], {
                                name: 'Cryptocrap (Alternate Server)',
                                domain: 'cryptocrap.xyz',
                                XMPP: 'conference.cryptocrap.xyz',
                                Relay: 'https://cryptocrap.xyz/http-bind'
                        })
                )
	}
	$('#languages').hide()
	$('#footer').animate({'height': 220}, function() {
		$('#customServerDialog').fadeIn()
		$('#customName').val(Cryptodog.serverName)
		$('#customDomain').val(Cryptodog.xmpp.domain)
		$('#customConferenceServer').val(Cryptodog.xmpp.conferenceServer)
		$('#customRelay').val(Cryptodog.xmpp.relay)
		$('#customServerReset').val(Cryptodog.locale['loginWindow']['reset']).click(function() {
			$('#customName').val('Cryptodog')
			$('#customDomain').val(Cryptodog.xmpp.defaultDomain)
			$('#customConferenceServer').val(Cryptodog.xmpp.defaultConferenceServer)
			$('#customRelay').val(Cryptodog.xmpp.defaultRelay)
			Cryptodog.storage.removeItem('serverName')
			Cryptodog.storage.removeItem('domain')
			Cryptodog.storage.removeItem('conferenceServer')
			Cryptodog.storage.removeItem('relay')
		})
		$('#customServerSubmit').val(Cryptodog.locale['chatWindow']['cont']).click(function() {
			$('#customServerDialog').fadeOut(200, function() {
				$('#footer').animate({'height': 14})
			})
			Cryptodog.serverName = $('#customName').val()
			Cryptodog.xmpp.domain = $('#customDomain').val()
			Cryptodog.xmpp.conferenceServer = $('#customConferenceServer').val()
			Cryptodog.xmpp.relay = $('#customRelay').val()
			Cryptodog.storage.setItem('serverName', Cryptodog.serverName)
			Cryptodog.storage.setItem('domain', Cryptodog.xmpp.domain)
			Cryptodog.storage.setItem('conferenceServer', Cryptodog.xmpp.conferenceServer)
			Cryptodog.storage.setItem('relay', Cryptodog.xmpp.relay)
		})
		$('#customDomain').select()
	})
})

$('#customServerSave').click(function() {
	$('#customServerDelete').val('Delete')
		.attr('data-deleteconfirm', '0')
		.removeClass('confirm')
	if ($('#customDomain').val() === Cryptodog.xmpp.defaultDomain) {
		return // Cannot overwrite the default domain
	}
	var serverIsInList = false
	$('#customServerSelector').children().each(function() {
		if ($('#customName').val() === $(this).val()) {
			serverIsInList = true
			if ($('#customServerSave').attr('data-saveconfirm') !== '1') {
				$('#customServerSave').val('Overwrite?').attr('data-saveconfirm', '1').addClass('confirm')
				return
			}
			else {
				$('#customServerSave').val('Save').attr('data-saveconfirm', '0').removeClass('confirm')
			}
		}
	})
	if (!serverIsInList) {
		$('#customServerSelector').append(
			Mustache.render(Cryptodog.templates['customServer'], {
				name: $('#customName').val(),
				domain: $('#customDomain').val(),
				XMPP: $('#customConferenceServer').val(),
				Relay: $('#customRelay').val()
			})
		)
	}
	else {
		$.each($('#customServerSelector option'), function(index, value) {
			if ($(value).val() === $('#customName').val()) {
				$(value).attr('data-domain', $('#customDomain').val())
				$(value).attr('data-relay', $('#customRelay').val())
				$(value).attr('data-xmpp', $('#customConferenceServer').val())
			}
		})
	}
	updateCustomServers()
})

$('#customServerDelete').click(function() {
	$('#customServerSave').val('Save').attr('data-saveconfirm', '0').removeClass('confirm')
	if ($('#customServerDelete').attr('data-deleteconfirm') === '1') {
		$.each($('#customServerSelector option'), function(index, value) {
			if ($(value).val() === $('#customName').val()) {
				$(value).remove()
			}
		})
		updateCustomServers()
		$('#customServerDelete').val('Delete').attr('data-deleteconfirm', '0').removeClass('confirm')
	}
	else {
		$('#customServerDelete').val('Are you sure?').attr('data-deleteconfirm', '1').addClass('confirm')
	}
})

$('#customServerSelector').change(function() {
	$('#customServerDelete').val('Delete')
		.attr('data-deleteconfirm', '0')
		.removeClass('confirm')
		.removeAttr('disabled')
		.removeClass('disabled')
	$('#customServerSave').val('Save')
		.attr('data-saveconfirm', '0')
		.removeClass('confirm')
	var selectedOption = $(this).find(':selected')
	if ($(selectedOption).attr('data-domain') === Cryptodog.xmpp.defaultDomain) {
		$('#customServerDelete').attr('disabled', 'disabled').addClass('disabled')
	}
	$('#customName').val($(selectedOption).val())
	$('#customDomain').val($(selectedOption).attr('data-domain'))
	$('#customConferenceServer').val($(selectedOption).attr('data-xmpp'))
	$('#customRelay').val($(selectedOption).attr('data-relay'))
})

})
