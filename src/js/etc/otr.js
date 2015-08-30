;(function() {
'use strict';

// Cryptocat OTR functions and callbacks.
Cryptocat.otr = {}

// Construct a new OTR conversation
Cryptocat.otr.add = function(nickname) {
	var otr = new OTR({
		priv: Cryptocat.me.otrKey,
		smw: {
			path: 'js/workers/smp.js',
			seed: Cryptocat.random.generateSeed
		}
	})
	otr.REQUIRE_ENCRYPTION = true
	otr.on('ui',     onIncoming.bind(null, nickname))
	otr.on('io',     onOutgoing.bind(null, nickname))
	otr.on('smp',    onSMPAnswer.bind(null, nickname))
	otr.on('status', onStatusChange.bind(null, nickname))
	otr.on('file',   onFile.bind(null, nickname))
	return otr
}


// Handle incoming messages.
var onIncoming = function(nickname, msg, encrypted) {
	if (Cryptocat.me.login === 'cryptocat') {
		// Drop unencrypted messages.
		if (!encrypted) {
			return
		}
		Cryptocat.addToConversation(
			msg, nickname, Cryptocat.buddies[nickname].id, 'message'
		)
		if (Cryptocat.me.currentBuddy !== Cryptocat.buddies[nickname].id) {
			Cryptocat.messagePreview(msg, nickname)
		}
	}
	if (Cryptocat.me.login === 'facebook') {
		// Drop unencrypted messages if buddy claims to use Cryptocat.
		if (Cryptocat.buddies[nickname].usingCryptocat &&
			!encrypted
		) {
			return
		}
		if (!Cryptocat.buddies[nickname].usingCryptocat &&
			encrypted
		) {
			$.get('https://outbound.crypto.cat/facebook/', {
				'setuser': Cryptocat.buddies[nickname].id
			})
			Cryptocat.buddyStatus(nickname, 'online')
			$('#buddy-' + Cryptocat.buddies[nickname].id)
				.find('.loginTypeIcon')
				.removeClass('notUsingCryptocat')
			$('#buddy-' + Cryptocat.buddies[nickname].id)
				.find('.buddyMenu').show()
			if (Cryptocat.me.currentBuddy === Cryptocat.buddies[nickname].id) {
				$('#encryptionStatus').html(
					Mustache.render(Cryptocat.templates.encryptionStatus, {
						conversationStatus: Cryptocat.locale.login.conversationStatus,
						styling: 'encrypted',
						encryptionStatus: Cryptocat.locale.login.encrypted
					})
				)
			}
			Cryptocat.buddies[nickname].usingCryptocat         = true
			Cryptocat.buddies[nickname].otr.REQUIRE_ENCRYPTION = true
		}
		Cryptocat.addToConversation(
			msg, nickname, Cryptocat.buddies[nickname].id, 'message'
		)
		if (Cryptocat.me.currentBuddy !== Cryptocat.buddies[nickname].id) {
			Cryptocat.messagePreview(msg, nickname)
		}
	}
}

// Handle outgoing messages depending on connection type.
var onOutgoing = function(nickname, message) {
	if (Cryptocat.me.login === 'cryptocat') {
		Cryptocat.xmpp.connection.muc.message(
			Cryptocat.me.conversation
				+ '@'
				+ Cryptocat.xmpp.conferenceServer,
			nickname, message, null, 'chat', 'active'
		)
	}
	if (Cryptocat.me.login === 'facebook') {
		var to = '-' + Cryptocat.buddies[nickname].id + '@chat.facebook.com'
		var reply = $msg({
			to: to,
			type: 'chat',
			cryptocat: 'true',
		}).cnode(Strophe.xmlElement('body', message))
		Cryptocat.xmpp.connection.send(reply.tree())
	}
}

// Handle otr state changes.
var onStatusChange = function(nickname, state) {
	/*jshint camelcase:false */
	var buddy = Cryptocat.buddies[nickname]
	if (state === OTR.CONST.STATUS_AKE_SUCCESS) {
		var fingerprint = buddy.otr.their_priv_pk.fingerprint()
		if (buddy.fingerprint === null) {
			buddy.fingerprint = fingerprint
			Cryptocat.closeGenerateFingerprints(nickname)
		}
		else if (buddy.fingerprint !== fingerprint) {
			// re-aked with a different key
			buddy.fingerprint = fingerprint
			Cryptocat.removeAuthAndWarn(nickname)
		}
	}
}

// Store received filename.
var onFile = function(nickname, type, key, filename) {
	var buddy = Cryptocat.buddies[nickname]
	// filename is being relied on as diversifier
	// and should continue to be generated uniquely
	// as in sendFile()
	var derivedKey = CryptoJS.PBKDF2(key, filename, { keySize: 16 })
	derivedKey = derivedKey.toString(CryptoJS.enc.Latin1)
	if (!buddy.fileKey) {
		buddy.fileKey = {}
	}
	buddy.fileKey[filename] = {
		encryptKey: derivedKey.substring(0, 32),
		macKey:     derivedKey.substring(32)
	}
}

// Receive an SMP question
var onSMPQuestion = function(nickname, question) {
	var chatWindow = Cryptocat.locale.chatWindow,
		buddy = Cryptocat.buddies[nickname],
		answer = false
	var info = Mustache.render(Cryptocat.templates.authRequest, {
		authenticate: chatWindow.authenticate,
		authRequest: chatWindow.authRequest.replace('(NICKNAME)', nickname),
		answerMustMatch: chatWindow.answerMustMatch
			.replace('(NICKNAME)', nickname),
		question: question,
		answer: chatWindow.answer
	})
	$('#dialogBoxClose').click()
	window.setTimeout(function() {
		Cryptocat.dialogBox(info, {
			height: 240,
			closeable: true,
			onAppear: function() {
				$('#authReplySubmit').unbind('click').bind('click', function(e) {
					e.preventDefault()
					answer = $('#authReply').val()
					answer = Cryptocat.prepareAnswer(answer, false, buddy.mpFingerprint)
					buddy.otr.smpSecret(answer)
					$('#dialogBoxClose').click()
				})
			},
			onClose: function() {
				if (answer) { return }
				buddy.otr.smpSecret(
					Cryptocat.random.encodedBytes(16, CryptoJS.enc.Hex)
				)
			}
		})
	}, 500)
}

// Handle SMP callback
var onSMPAnswer = function(nickname, type, data, act) {
	var chatWindow = Cryptocat.locale.chatWindow,
		buddy = Cryptocat.buddies[nickname]
	switch(type) {
	case 'question':
		onSMPQuestion(nickname, data)
		break
	case 'trust':
		if (act === 'asked') {
			// Set authentication result
			buddy.updateAuth(data)
			if ($('.authSMP').length) {
				if (buddy.authenticated) {
					$('#authSubmit').val(chatWindow.identityVerified)
					$('#authenticated').click()
				}
				else {
					$('#authSubmit').val(chatWindow.failed)
						.animate({'background-color': '#F00'})
				}
			}
		}
		break
	case 'abort':
		if ($('.authSMP').length) {
			$('#authSubmit').val(chatWindow.failed)
				.animate({'background-color': '#F00'})
		}
		break
	}
}

}())