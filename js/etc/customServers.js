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
				name: 'Internet Krypto Klub',
				domain: 'ikrypto.club',
				xmpp: 'conference.ikrypto.club',
				relay: 'wss://ikrypto.club/socket'
			})
		)

		$('#customServerSelector').append(
			Mustache.render(Cryptodog.templates['customServer'], {
				name: 'Cryptodog',
				domain: 'crypto.dog',
				xmpp: 'conference.crypto.dog',
				relay: 'https://crypto.dog/http-bind'
			})
		)

		$('#customServerSelector').append(
			Mustache.render(Cryptodog.templates['customServer'], {
				name: 'Cryptodog (Tor Hidden Service)',
				domain: 'crypto.dog',
				xmpp: 'conference.crypto.dog',
				relay: 'http://doggyfipznipbaia.onion/http-bind'
			})
		)

		$('#customServerSelector').append(
			Mustache.render(Cryptodog.templates['customServer'], {
				name: 'Cryptocrap',
				domain: 'cryptocrap.xyz',
				xmpp: 'conference.cryptocrap.xyz',
				relay: 'https://cryptocrap.xyz/http-bind'
			})
		)
	}
	$('#languages').hide()
	$('#footer').animate({'height': 220}, function() {
		$('#customServerDialog').fadeIn()
		$('#customName').val(Cryptodog.xmpp.currentServer.name)
		$('#customDomain').val(Cryptodog.xmpp.currentServer.domain)
		$('#customConferenceServer').val(Cryptodog.xmpp.currentServer.conference)
		$('#customRelay').val(Cryptodog.xmpp.currentServer.relay)
		$('#customServerReset').val(Cryptodog.locale['loginWindow']['reset']).click(function() {
			$('#customName').val('Cryptodog')
			$('#customDomain').val(Cryptodog.xmpp.defaultServer.domain)
			$('#customConferenceServer').val(Cryptodog.xmpp.defaultServer.conference)
			$('#customRelay').val(Cryptodog.xmpp.defaultServer.relay)
			Cryptodog.storage.removeItem('serverName')
			Cryptodog.storage.removeItem('domain')
			Cryptodog.storage.removeItem('conferenceServer')
			Cryptodog.storage.removeItem('relay')
		})
		$('#customServerSubmit').val(Cryptodog.locale['chatWindow']['cont']).click(function() {
			$('#customServerDialog').fadeOut(200, function() {
				$('#footer').animate({'height': 14})
			})
			Cryptodog.xmpp.currentServer.name = $('#customName').val()
			Cryptodog.xmpp.currentServer.domain = $('#customDomain').val()
			Cryptodog.xmpp.currentServer.conference = $('#customConferenceServer').val()
			Cryptodog.xmpp.currentServer.relay = $('#customRelay').val()
			Cryptodog.storage.setItem('serverName', Cryptodog.xmpp.currentServer.name)
			Cryptodog.storage.setItem('domain', Cryptodog.xmpp.currentServer.domain)
			Cryptodog.storage.setItem('conferenceServer', Cryptodog.xmpp.currentServer.conference)
			Cryptodog.storage.setItem('relay', Cryptodog.xmpp.currentServer.relay)
		})
		$('#customDomain').select()
	})
})

$('#customServerSave').click(function() {
	$('#customServerDelete').val('Delete')
		.attr('data-deleteconfirm', '0')
		.removeClass('confirm')
	if ($('#customDomain').val() === Cryptodog.xmpp.defaultServer.domain) {
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
				xmpp: $('#customConferenceServer').val(),
				relay: $('#customRelay').val()
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
	if ($(selectedOption).attr('data-domain') === Cryptodog.xmpp.defaultServer.domain) {
		$('#customServerDelete').attr('disabled', 'disabled').addClass('disabled')
	}
	$('#customName').val($(selectedOption).val())
	$('#customDomain').val($(selectedOption).attr('data-domain'))
	$('#customConferenceServer').val($(selectedOption).attr('data-xmpp'))
	$('#customRelay').val($(selectedOption).attr('data-relay'))
})

})
