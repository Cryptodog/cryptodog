;(function() {
'use strict';

// Cryptodog OTR functions and callbacks.
Cryptodog.otr = {}

// Construct a new OTR conversation
Cryptodog.otr.add = function(nickname) {
	// file protocol doesn't support WebWorkers
	if (window.location.protocol === 'file:'){
		var otr = new OTR({
			priv: Cryptodog.me.otrKey
		})
	}
	else {
		var otr = new OTR({
			priv: Cryptodog.me.otrKey,
			smw: {
				path: 'js/workers/smp.js',
				seed: Cryptodog.random.generateSeed
			}
		})
	}
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
	// Drop unencrypted messages.
	if (!encrypted) {
		return
	}
	Cryptodog.addToConversation(
		msg, nickname, Cryptodog.buddies[nickname].id, 'message'
	)
	if (Cryptodog.me.currentBuddy !== Cryptodog.buddies[nickname].id && !Cryptodog.buddies[nickname].ignored()) {
		Cryptodog.messagePreview(msg, nickname)
	}
}

// Handle outgoing messages depending on connection type.
var onOutgoing = function(nickname, message) {
	Cryptodog.xmpp.connection.muc.message(
		Cryptodog.me.conversation
			+ '@'
			+ Cryptodog.xmpp.conferenceServer,
		nickname, message, null, 'chat', 'active'
	)
}

// Handle otr state changes.
var onStatusChange = function(nickname, state) {
	/*jshint camelcase:false */
	var buddy = Cryptodog.buddies[nickname]
	if (state === OTR.CONST.STATUS_AKE_SUCCESS) {
		var fingerprint = buddy.otr.their_priv_pk.fingerprint()
		if (buddy.fingerprint === null) {
			buddy.fingerprint = fingerprint
			Cryptodog.closeGenerateFingerprints(nickname)
		}
		else if (buddy.fingerprint !== fingerprint) {
			// re-aked with a different key
			buddy.fingerprint = fingerprint
			Cryptodog.removeAuthAndWarn(nickname)
		}
	}
}

// Store received filename.
var onFile = function(nickname, type, key, filename) {
	var buddy = Cryptodog.buddies[nickname]
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
	var buddy = Cryptodog.buddies[nickname];

	// Silently answer question if buddy is ignored.
	if (buddy.ignored()){
		var answer = Cryptodog.prepareAnswer(' ', false, buddy.mpFingerprint);
		buddy.otr.smpSecret(answer);
		if (!answer){
			buddy.otr.smpSecret(Cryptodog.random.encodedBytes(16, CryptoJS.enc.Hex));
		}
		return;
	}

	var chatWindow = Cryptodog.locale.chatWindow,
		answer = false
	var info = Mustache.render(Cryptodog.templates.authRequest, {
		authenticate: chatWindow.authenticate,
		authRequest: chatWindow.authRequest.replace('(NICKNAME)', nickname),
		answerMustMatch: chatWindow.answerMustMatch
			.replace('(NICKNAME)', nickname),
		question: question,
		answer: chatWindow.answer
	})
	$('#dialogBoxClose').click()
	window.setTimeout(function() {
		Cryptodog.dialogBox(info, {
			height: 240,
			closeable: true,
			onAppear: function() {
				$('#authReplySubmit').unbind('click').bind('click', function(e) {
					e.preventDefault()
					answer = $('#authReply').val()
					answer = Cryptodog.prepareAnswer(answer, false, buddy.mpFingerprint)
					buddy.otr.smpSecret(answer)
					$('#dialogBoxClose').click()
				})
			},
			onClose: function() {
				if (answer) { return }
				buddy.otr.smpSecret(
					Cryptodog.random.encodedBytes(16, CryptoJS.enc.Hex)
				)
			}
		})
	}, 500)
}

// Handle SMP callback
var onSMPAnswer = function(nickname, type, data, act) {
	var chatWindow = Cryptodog.locale.chatWindow,
		buddy = Cryptodog.buddies[nickname]
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
