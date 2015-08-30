// Cryptocat XMPP functions and callbacks.

Cryptocat.xmpp = {}
Cryptocat.xmpp.currentStatus = 'online'
Cryptocat.xmpp.connection = null

// Default connection settings.
Cryptocat.xmpp.defaultDomain = 'crypto.cat'
Cryptocat.xmpp.defaultConferenceServer = 'conference.crypto.cat'
Cryptocat.xmpp.defaultRelay = 'https://crypto.cat/http-bind'

Cryptocat.xmpp.domain = Cryptocat.xmpp.defaultDomain
Cryptocat.xmpp.conferenceServer = Cryptocat.xmpp.defaultConferenceServer
Cryptocat.xmpp.relay = Cryptocat.xmpp.defaultRelay

$(window).ready(function() {
'use strict';

// Prepares necessary encryption key operations before XMPP connection.
// Shows a progress bar (and cute cat facts!) while doing so.
Cryptocat.xmpp.showKeyPreparationDialog = function(callback) {
	// Key storage currently disabled as we are not yet sure if this is safe to do.
	// Cryptocat.storage.setItem('multiPartyKey', Cryptocat.multiParty.genPrivateKey())
	//else {
	Cryptocat.me.mpPrivateKey = Cryptocat.multiParty.genPrivateKey()
	//}
	Cryptocat.me.mpPublicKey = Cryptocat.multiParty.genPublicKey(
		Cryptocat.me.mpPrivateKey
	)
	Cryptocat.me.mpFingerprint = Cryptocat.multiParty.genFingerprint()
	// If we already have keys, just skip to the callback.
	if (Cryptocat.me.otrKey) {
		callback()
		return
	}
	var progressForm = Mustache.render(Cryptocat.templates.generatingKeys, {
		text: Cryptocat.locale['loginMessage']['generatingKeys']
	})
	if (Cryptocat.audioNotifications) { Cryptocat.sounds.keygenStart.play() }
	Cryptocat.dialogBox(progressForm, {
		height: 250,
		closeable: false,
		onAppear: Cryptocat.xmpp.prepareKeys(callback)
	})
	if (Cryptocat.locale['language'] === 'en') {
		$('#progressInfo').append(
			Mustache.render(Cryptocat.templates.catFact, {
				catFact: CatFacts.getFact()
			})
		)
	}
	$('#progressInfo').append(
		'<div id="progressBar"><div id="fill"></div></div>'
	)
	CatFacts.interval = window.setInterval(function() {
		$('#interestingFact').fadeOut(function() {
			$(this).text(CatFacts.getFact()).fadeIn()
		})
	}, 9000)
	$('#fill').animate({'width': '100%', 'opacity': '1'}, 14000, 'linear')
}

// See above.
Cryptocat.xmpp.prepareKeys = function(callback) {
	if (Cryptocat.audioNotifications) {
		window.setTimeout(function() {
			Cryptocat.sounds.keygenLoop.loop = true
			Cryptocat.sounds.keygenLoop.play()
		}, 800)
	}
	// Create DSA key for OTR.
	DSA.createInWebWorker({
		path: 'js/workers/dsa.js',
		seed: Cryptocat.random.generateSeed
	}, function(key) {
		Cryptocat.me.otrKey = key
		// Key storage currently disabled as we are not yet sure if this is safe to do.
		//	Cryptocat.storage.setItem('myKey', JSON.stringify(Cryptocat.me.otrKey))
		if (callback) { callback() }
	})
}

// Connect anonymously and join conversation.
Cryptocat.xmpp.connect = function() {
	Cryptocat.me.conversation = Strophe.xmlescape($('#conversationName').val())
	Cryptocat.me.nickname = Strophe.xmlescape($('#nickname').val())
	Cryptocat.xmpp.connection = new Strophe.Connection(Cryptocat.xmpp.relay)
	Cryptocat.xmpp.connection.connect(Cryptocat.xmpp.domain, null, function(status) {
		if (
			(status === Strophe.Status.CONNECTING) &&
			(Cryptocat.me.login === 'cryptocat')
		) {
			$('#loginInfo').animate({'background-color': '#97CEEC'}, 200)
			$('#loginInfo').text(Cryptocat.locale['loginMessage']['connecting'])
		}
		else if (status === Strophe.Status.CONNECTED) {
			Cryptocat.xmpp.connection.muc.join(
				Cryptocat.me.conversation + '@' + Cryptocat.xmpp.conferenceServer,
				Cryptocat.me.nickname,
				function(message) {
					if (Cryptocat.xmpp.onMessage(message)) { return true }
				},
				function(presence) {
					if (Cryptocat.xmpp.onPresence(presence)) { return true }
				}
			)
			Cryptocat.xmpp.onConnected()
			document.title = Cryptocat.me.nickname + '@' + Cryptocat.me.conversation
			$('.conversationName').text(document.title)
			Cryptocat.storage.setItem('myNickname', Cryptocat.me.nickname)
		}
		else if ((status === Strophe.Status.CONNFAIL) || (status === Strophe.Status.DISCONNECTED)) {
			if (Cryptocat.loginError) {
				Cryptocat.xmpp.reconnect()
			}
		}
	})
}

// Executes on successfully completed XMPP connection.
Cryptocat.xmpp.onConnected = function() {
	afterConnect()
	clearInterval(CatFacts.interval)
	if (Cryptocat.me.login === 'cryptocat') {
		$('#loginInfo').text('✓')
		$('#buddy-groupChat,#status').show()
		$('#buddy-groupChat').insertBefore('#buddiesOnline')
	}
	else {
		$('#buddy-groupChat,#status').hide()
	}
	$('#fill').stop().animate({
		'width': '100%', 'opacity': '1'
	}, 250, 'linear')
	window.setTimeout(function() {
		$('#dialogBoxClose').click()
	}, 400)
	window.setTimeout(function() {
		$('#loginOptions,#languages,#customServerDialog').fadeOut(200)
		$('#version,#logoText,#loginInfo,#info').fadeOut(200)
		$('#header').animate({'background-color': '#303040'})
		$('.logo').animate({'margin': '-11px 5px 0 0'})
		$('#login').fadeOut(200, function() {
			$('#conversationInfo').fadeIn()
			if (Cryptocat.me.login === 'cryptocat') {
				$('#buddy-groupChat').click(function() {
					Cryptocat.onBuddyClick($(this))
				})
				$('#buddy-groupChat').click()
			}
			$('#conversationWrapper').fadeIn()
			$('#optionButtons').fadeIn()
			$('#footer').delay(200).animate({'height': 60}, function() {
				$('#userInput').fadeIn(200, function() {
					$('#userInputText').focus()
				})
			})
			$('#buddyWrapper').slideDown()
		})
	}, 800)
	Cryptocat.loginError = true
}

// Reconnect to the same chatroom, on accidental connection loss.
Cryptocat.xmpp.reconnect = function() {
	if (Cryptocat.xmpp.connection) {
	    Cryptocat.xmpp.connection.reset()
	}
	Cryptocat.xmpp.connection = new Strophe.Connection(Cryptocat.xmpp.relay)
	Cryptocat.xmpp.connection.connect(Cryptocat.xmpp.domain, null, function(status) {
		if (status === Strophe.Status.CONNECTING) {
			$('.conversationName').animate({'background-color': '#F00'})
		}
		else if (status === Strophe.Status.CONNECTED) {
			afterConnect()
			if (Cryptocat.me.login === 'cryptocat') {
				Cryptocat.xmpp.connection.muc.join(
					Cryptocat.me.conversation + '@' + Cryptocat.xmpp.conferenceServer,
					Cryptocat.me.nickname
				)
			}
		}
		else if ((status === Strophe.Status.CONNFAIL) || (status === Strophe.Status.DISCONNECTED)) {
			if (Cryptocat.loginError) {
				window.setTimeout(function() {
					Cryptocat.xmpp.reconnect()
				}, 5000)
			}
		}
	})
}

// Handle incoming messages from the XMPP server.
Cryptocat.xmpp.onMessage = function(message) {
	var nickname = cleanNickname($(message).attr('from'))
	var body = $(message).find('body').text()
	var type = $(message).attr('type')
	// If archived message, ignore.
	if ($(message).find('delay').length !== 0) {
		return true
	}
	//If message is from me, ignore.
	if (nickname === Cryptocat.me.nickname) {
		return true
	}
	// If message is from someone not on buddy list, ignore.
	if (!Cryptocat.buddies.hasOwnProperty(nickname)) {
		return true
	}
	// Check if message has a 'composing' notification.
	if ($(message).find('composing').length && !body.length) {
		$('#buddy-' + Cryptocat.buddies[nickname].id).addClass('composing')
		return true
	}
	// Check if message has a 'paused' (stopped writing) notification.
	if ($(message).find('paused').length) {
		$('#buddy-' + Cryptocat.buddies[nickname].id).removeClass('composing')
	}
	// Check if message is a group chat message.
	else if (type === 'groupchat' && body.length) {
		$('#buddy-' + Cryptocat.buddies[nickname].id).removeClass('composing')
		body = Cryptocat.multiParty.receiveMessage(nickname, Cryptocat.me.nickname, body)
		if (typeof(body) === 'string') {
			Cryptocat.addToConversation(body, nickname, 'groupChat', 'message')
		}
	}
	// Check if this is a private OTR message.
	else if (type === 'chat') {
		$('#buddy-' + Cryptocat.buddies[nickname].id).removeClass('composing')
		Cryptocat.buddies[nickname].otr.receiveMsg(body)
	}
	return true
}

// Handle incoming presence updates from the XMPP server.
Cryptocat.xmpp.onPresence = function(presence) {
	var status
	var nickname = cleanNickname($(presence).attr('from'))
	// If invalid nickname, do not process
	if ($(presence).attr('type') === 'error') {
		if ($(presence).find('error').attr('code') === '409') {
			// Delay logout in order to avoid race condition with window animation
			window.setTimeout(function() {
				Cryptocat.logout()
				Cryptocat.loginFail(Cryptocat.locale['loginMessage']['nicknameInUse'])
			}, 3000)
			return false
		}
		return true
	}
	// Ignore if presence status is coming from myself
	if (nickname === Cryptocat.me.nickname) {
		return true
	}
	// Detect nickname change (which may be done by non-Cryptocat XMPP clients)
	if ($(presence).find('status').attr('code') === '303') {
		Cryptocat.removeBuddy(nickname)
		return true
	}
	// Detect buddy going offline.
	if ($(presence).attr('type') === 'unavailable') {
		Cryptocat.removeBuddy(nickname)
		return true
	}
	// Create buddy element if buddy is new.
	else if (!Cryptocat.buddies.hasOwnProperty(nickname)) {
		Cryptocat.addBuddy(nickname, null, 'online')
		for (var u = 0; u < 4000; u += 2000) {
			window.setTimeout(Cryptocat.xmpp.sendPublicKey, u, nickname)
		}
	}
	// Handle buddy status change to 'available'.
	else if (
		$(presence).find('show').text() === '' ||
		$(presence).find('show').text() === 'chat'
	) {
		status = 'online'
	}
	// Handle buddy status change to 'away'.
	else {
		status = 'away'
	}
	// Perform status change.
	Cryptocat.buddyStatus(nickname, status)
	return true
}

// Send your own multiparty public key to `nickname`, via XMPP-MUC.
Cryptocat.xmpp.sendPublicKey = function(nickname) {
	Cryptocat.xmpp.connection.muc.message(
		Cryptocat.me.conversation + '@' + Cryptocat.xmpp.conferenceServer,
		null, Cryptocat.multiParty.sendPublicKey(nickname), null, 'groupchat', 'active'
	)
}

// Send your current status to the XMPP server.
Cryptocat.xmpp.sendStatus = function() {
        var status = ''
	if (Cryptocat.xmpp.currentStatus === 'away') {
                status = 'away'
	}
	Cryptocat.xmpp.connection.muc.setStatus(
		Cryptocat.me.conversation + '@' + Cryptocat.xmpp.conferenceServer,
		Cryptocat.me.nickname, status, status
	)
}

// Executed (manually) after connection.
var afterConnect = function() {
	$('.conversationName').animate({'background-color': '#97CEEC'})
	Cryptocat.xmpp.connection.ibb.addIBBHandler(Cryptocat.otr.ibbHandler)
	/* jshint -W106 */
	Cryptocat.xmpp.connection.si_filetransfer.addFileHandler(Cryptocat.otr.fileHandler)
	/* jshint +W106 */
	if (Cryptocat.audioNotifications) {
		Cryptocat.sounds.keygenLoop.pause()
		Cryptocat.sounds.keygenEnd.play()
	}
}

// Clean nickname so that it's safe to use.
var cleanNickname = function(nickname) {
	var clean = nickname.match(/\/([\s\S]+)/)
	if (clean) {
		return clean[1]
	}
	return false
}

})
