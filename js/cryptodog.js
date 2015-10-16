if (typeof Cryptodog === 'undefined') { Cryptodog = function() {} }

/*
-------------------
GLOBAL VARIABLES
-------------------
*/

Cryptodog.version = '1.1.6' // Version number

// set to true to allow debug lines to be written to console
var allowDebugLogging = false

// for debugging
var log = function(message) {
	if (!allowDebugLogging)
		return
	console.log(message)
}

Cryptodog.me = {
	newMessages:   0,
	windowFocus:   true,
	composing:     false,
	conversation:  null,
	nickname:      null,
	otrKey:        null,
	fileKey:       null,
	mpPrivateKey:  null,
	mpPublicKey:   null,
	mpFingerprint: null,
	currentBuddy:  null,
	color:         randomColor({luminosity: 'dark'})
}

Cryptodog.buddies = {}

// For persistent ignores.
Cryptodog.ignoredNames = []

Cryptodog.audioExt = '.mp3'
if (navigator.userAgent.match(/(OPR)|(Firefox)/)) {
	Cryptodog.audioExt = '.ogg'
}
Cryptodog.sounds = {
	'keygenStart': (new Audio('snd/keygenStart' + Cryptodog.audioExt)),
	'keygenLoop':  (new Audio('snd/keygenLoop'  + Cryptodog.audioExt)),
	'keygenEnd':   (new Audio('snd/keygenEnd'   + Cryptodog.audioExt)),
	'userLeave':   (new Audio('snd/userLeave'   + Cryptodog.audioExt)),
	'userJoin':    (new Audio('snd/userJoin'    + Cryptodog.audioExt)),
	'msgGet':      (new Audio('snd/msgGet'      + Cryptodog.audioExt)),
	'balloon':     (new Audio('snd/balloon'     + Cryptodog.audioExt))
}

var allowDebugLogging = false

var log = function (message) {
    if (!allowDebugLogging)
        return
    console.log(message)
}

// image used for notifications
var notifImg = "img/cryptodog-logo.png";


Notification.requestPermission(function(permission){
	log("asked for notification permission, got '" + permission + "'");
});



/*
-------------------
END GLOBAL SCOPE
-------------------
*/

if (typeof(window) !== 'undefined') { $(window).ready(function() {
'use strict';

/*
-------------------
INTIALIZATION
-------------------
*/

// Set version number in UI.
$('#version').text(Cryptodog.version)

// Seed RNG.
Cryptodog.random.setSeed(Cryptodog.random.generateSeed())

var conversationBuffers = {}

/*
-------------------
GLOBAL INTERFACE FUNCTIONS
-------------------
*/

// Update a file transfer progress bar.
Cryptodog.updateFileProgressBar = function(file, chunk, size, recipient) {
	var conversationBuffer = $(conversationBuffers[Cryptodog.buddies[recipient].id])
	var progress = (chunk * 100) / (Math.ceil(size / Cryptodog.otr.chunkSize))
	if (progress > 100) { progress = 100 }
	$('.fileProgressBarFill')
		.filterByData('file', file)
		.filterByData('id', Cryptodog.buddies[recipient].id)
		.animate({'width': progress + '%'})
	conversationBuffer.find('.fileProgressBarFill')
		.filterByData('file', file)
		.filterByData('id', Cryptodog.buddies[recipient].id)
		.width(progress + '%')
	conversationBuffers[Cryptodog.buddies[recipient].id] = $('<div>').append($(conversationBuffer).clone()).html()
}

// Convert Data blob/url to downloadable file, replacing the progress bar.
Cryptodog.addFile = function(url, file, conversation, filename) {
	var conversationBuffer = $(conversationBuffers[Cryptodog.buddies[conversation].id])
	var fileLinkString = 'fileLink'
	if (navigator.userAgent === 'Chrome (Mac app)') {
		fileLinkString += 'Mac'
	}
	var fileLink = Mustache.render(Cryptodog.templates[fileLinkString], {
		url: url,
		filename: filename,
		downloadFile: Cryptodog.locale['chatWindow']['downloadFile']
	})
	$('.fileProgressBar')
		.filterByData('file', file)
		.filterByData('id', Cryptodog.buddies[conversation].id)
		.replaceWith(fileLink)
	conversationBuffer.find('.fileProgressBar')
		.filterByData('file', file)
		.filterByData('id', Cryptodog.buddies[conversation].id)
		.replaceWith(fileLink)
	conversationBuffers[Cryptodog.buddies[conversation].id] = $('<div>').append($(conversationBuffer).clone()).html()
}

// Signal a file transfer error in the UI.
Cryptodog.fileTransferError = function(sid, nickname) {
	$('.fileProgressBar')
		.filterByData('file', sid)
		.filterByData('id', Cryptodog.buddies[nickname].id)
		.animate({'borderColor': '#F00'})
	$('.fileProgressBarFill')
		.filterByData('file', sid)
		.filterByData('id', Cryptodog.buddies[nickname].id)
		.animate({'background-color': '#F00'})
}

// Add a `message` from `nickname` to the `conversation` display and log.
// `type` can be 'file', 'message', 'warning' or 'missingRecipients'.
// In case `type` === 'missingRecipients', `message` becomes array of missing recipients.
Cryptodog.addToConversation = function(message, nickname, conversation, type) {
	if (nickname === Cryptodog.me.nickname) {}
	else if (Cryptodog.buddies[nickname].ignored) {
		return false
	}
	initializeConversationBuffer(conversation)
	if (type === 'file') {
		if (!message.length) { return false }
		var id = conversation
		if (nickname !== Cryptodog.me.nickname) {
			Cryptodog.newMessageCount(++Cryptodog.me.newMessages)
			id = Cryptodog.buddies[nickname].id
		}
		message = Mustache.render(
			Cryptodog.templates.file, {
				file: message,
				id: id
			}
		)
	}
	if (type === 'message') {
		if (!message.length) { return false }
		if (nickname !== Cryptodog.me.nickname) {
			Cryptodog.newMessageCount(++Cryptodog.me.newMessages)
		}
		desktopNotification(notifImg, Cryptodog.me.nickname + "@" + Cryptodog.me.conversation, nickname + ": " + message, 7)
		message = Strophe.xmlescape(message)
		message = Cryptodog.addLinks(message)
		message = addEmoticons(message)
	}
	if (type === 'warning') {
		if (!message.length) { return false }
		message = Strophe.xmlescape(message)
	}
	if (type === 'missingRecipients') {
		if (!message.length) { return false }
		message = message.join(', ')
		message = Mustache.render(Cryptodog.templates.missingRecipients, {
			text: Cryptodog.locale.warnings.missingRecipientWarning
				.replace('(NICKNAME)', message),
			dir: Cryptodog.locale.direction
		})
		conversationBuffers[conversation] += message
		if (conversation === Cryptodog.me.currentBuddy) {
			$('#conversationWindow').append(message)
			$('.missingRecipients').last().animate({'top': '0', 'opacity': '1'}, 100)
			scrollDownConversation(400, true)
		}
		return true
	}
	var authStatus = false
	if (
		(nickname === Cryptodog.me.nickname) ||
		Cryptodog.buddies[nickname].authenticated
	) {
		authStatus = true
	}
	message = message.replace(/:/g, '&#58;')

	var renderedMessage = Mustache.render(Cryptodog.templates.message, {
		nickname: shortenString(nickname, 16),
		currentTime: currentTime(true),
		authStatus: authStatus,
		message: message,
		color: Cryptodog.getUserColor(nickname)
	})

	conversationBuffers[conversation] += renderedMessage
	if (conversation === Cryptodog.me.currentBuddy) {
		$('#conversationWindow').append(renderedMessage)
		$('.line').last().animate({'top': '0', 'opacity': '1'}, 100)
		bindSenderElement($('.line').last().find('.sender'))
		scrollDownConversation(400, true)
	}
	else {
		$('#buddy-' + conversation).addClass('newMessage')
	}
}

// Show a preview for a received message from a buddy.
// Message previews will not overlap and are removed after 5 seconds.
Cryptodog.messagePreview = function(message, nickname) {
	var buddyElement = $('#buddy-' + Cryptodog.buddies[nickname].id)
	if (!buddyElement.attr('data-utip')) {
		if (message.length > 15) {
			message = message.substring(0, 15) + '..'
		}
		buddyElement.attr({
			'data-utip-gravity': 'sw',
			'data-utip': Strophe.xmlescape(message)
		}).mouseenter()
		window.setTimeout(function() {
			buddyElement.mouseleave()
			buddyElement.removeAttr('data-utip')
		}, 0x1337)
	}
}

// Handles login failures.
Cryptodog.loginFail = function(message) {
	$('#loginInfo').text(message)
	$('#bubble').animate({'left': '+=5px'}, 130)
		.animate({'left': '-=10px'}, 130)
		.animate({'left': '+=5px'}, 130)
	$('#loginInfo').animate({'background-color': '#E93028'}, 200)
}

// Handle detected new keys.
Cryptodog.removeAuthAndWarn = function(nickname) {
	var buddy = Cryptodog.buddies[nickname]
	var openAuth = false
	buddy.updateAuth(false)
	var errorAKE = Mustache.render(
		Cryptodog.templates.errorAKE, {
			nickname: nickname,
			errorText: Cryptodog.locale.auth.AKEWarning,
			openAuth: Cryptodog.locale.chatWindow.authenticate
		}
	)
	Cryptodog.dialogBox(errorAKE, {
		extraClasses: 'dialogBoxError',
		closeable: true,
		height: 250,
		onAppear: function() {
			$('#openAuth').unbind().bind('click', function() {
				openAuth = true
				$('#dialogBoxClose').click()
			})
		},
		onClose: function() {
			if (openAuth) {
				Cryptodog.displayInfo(nickname)
			}
		}
	})
}

// Buddy constructor
var Buddy = function(nickname, id, status) {
	this.id             = id
	this.ignored        = false
	this.fingerprint    = null
	this.authenticated  = false
	this.fileKey        = null
	this.mpPublicKey    = null
	this.mpFingerprint  = null
	this.mpSecretKey    = null
	this.nickname       = nickname
	this.genFingerState = null
	this.usingCryptodog = true
	this.status         = status
	this.otr            = Cryptodog.otr.add(nickname)
	this.color          = randomColor({luminosity: 'dark'})
}

Buddy.prototype = {
	constructor: Buddy,
	updateMpKeys: function(publicKey) {
		this.mpPublicKey = publicKey
		this.mpFingerprint = Cryptodog.multiParty.genFingerprint(this.nickname)
		this.mpSecretKey = Cryptodog.multiParty.genSharedSecret(this.nickname)
	},
	updateAuth: function(auth) {
		var nickname = this.nickname
		this.authenticated = auth
		if (auth) {
			$('#authenticated').attr('data-active', true)
			$('#notAuthenticated').attr('data-active', false)
		}
		else {
			$('#authenticated').attr('data-active', false)
			$('#notAuthenticated').attr('data-active', true)
		}
		$.each($('span').filterByData('sender', nickname),
			function(index, value) {
				$(value).find('.authStatus').attr('data-auth', auth)
			}
		)
		var authStatusBuffers = [
			'groupChat',
			Cryptodog.buddies[nickname].id
		]
		$.each(authStatusBuffers, function(i, thisBuffer) {
			var buffer = $(conversationBuffers[thisBuffer])
			$.each(buffer.find('span').filterByData('sender', nickname),
				function(index, value) {
					$(value).find('.authStatus').attr('data-auth', auth)
				}
			)
			conversationBuffers[thisBuffer] = $('<div>').append(
				buffer.clone()
			).html()
		})
	}
}

// Build new buddy.
Cryptodog.addBuddy = function(nickname, id, status) {
	if (!id) { id = getUniqueBuddyID() }
	var buddy = Cryptodog.buddies[nickname] = new Buddy(nickname, id, status)
	$('#buddyList').queue(function() {
		var buddyTemplate = Mustache.render(Cryptodog.templates.buddy, {
			buddyID: buddy.id,
			shortNickname: shortenString(nickname, 11),
			status: status
		})
		var placement = determineBuddyPlacement(nickname, id, status)
		$(buddyTemplate).insertAfter(placement).slideDown(100, function() {
			$('#buddy-' + buddy.id)
				.unbind('click')
				.click(function() {
					Cryptodog.onBuddyClick($(this))
				}
			)
			$('#menu-' + buddy.id).attr('status', 'inactive')
				.unbind('click')
				.click(function(e) {
					e.stopPropagation()
					openBuddyMenu(nickname)
				}
			)
			buddyNotification(nickname, true)
		})
	})
	$('#buddyList').dequeue()
	if (Cryptodog.ignoredNames.indexOf(nickname) !== -1){
		buddy.ignored = true
		$('#buddy-' + buddy.id).addClass('ignored')
	}
}

// Set a buddy's status to `online` or `away`.
Cryptodog.buddyStatus = function(nickname, status) {
	Cryptodog.buddies[nickname].status = status
	var thisBuddy = $('#buddy-' + Cryptodog.buddies[nickname].id)
	var placement = determineBuddyPlacement(
		nickname, Cryptodog.buddies[nickname].id, status
	)
	if (thisBuddy.attr('status') !== status) {
		thisBuddy.attr('status', status)
		thisBuddy.insertAfter(placement).slideDown(200)
	}
}

// Handle buddy going offline.
Cryptodog.removeBuddy = function(nickname) {
	var buddyID = Cryptodog.buddies[nickname].id
	var buddyElement = $('.buddy').filterByData('id', buddyID)
	delete Cryptodog.buddies[nickname]
	if (!buddyElement.length) {
		return
	}
	buddyElement.each(function() {
		$(this).attr('status', 'offline')
		buddyNotification(nickname, false)
		if (Cryptodog.me.currentBuddy === buddyID) {
			return
		}
		if (!$(this).hasClass('newMessage')) {
			$(this).slideUp(500, function() {
				$(this).remove()
			})
		}
	})
}

// Determine where to place a buddy in the buddy list
// so the buddy list is in alphabetical order.
var determineBuddyPlacement = function(nickname, id, status) {
	var buddies = [{
		nickname: nickname,
		id: id
	}]
	for (var i in Cryptodog.buddies) {
		if (
			Cryptodog.buddies.hasOwnProperty(i) &&
			(Cryptodog.buddies[i].status === status)
		) {
			buddies.push({
				nickname: i,
				id: Cryptodog.buddies[i].id
			})
		}
	}
	buddies.sort(function(a, b) {
		var nameA = a.nickname.toLowerCase()
		var nameB = b.nickname.toLowerCase()
		if (nameA < nameB) {
			return -1
		}
		if (nameA > nameB) {
			return 1
		}
		return 0
	})
	var rightBefore
	for (var o = 0; o < buddies.length; o++) {
		if (buddies[o].id === id) {
			if (o === 0) {
				if (status === 'online') {
					rightBefore = '#buddiesOnline'
				}
				if (status === 'away') {
					rightBefore = '#buddiesAway'
				}
			}
			else {
				rightBefore = '[data-id=' + buddies[o - 1].id + ']'
			}
			break
		}
	}
	return rightBefore
}

// Get a buddy's nickname from their ID.
Cryptodog.getBuddyNicknameByID = function(id) {
	for (var i in Cryptodog.buddies) {
		if (Cryptodog.buddies.hasOwnProperty(i)) {
			if (Cryptodog.buddies[i].id === id) {
				return i
			}
		}
	}
}

// Bind buddy click actions.
Cryptodog.onBuddyClick = function(buddyElement) {
	var nickname = Cryptodog.getBuddyNicknameByID(buddyElement.attr('data-id'))
	buddyElement.removeClass('newMessage')
	if (buddyElement.prev().attr('id') === 'currentConversation') {
		$('#userInputText').focus()
		return true
	}
	var id = buddyElement.attr('data-id')
	Cryptodog.me.currentBuddy = id
	initializeConversationBuffer(id)
	// Switch currently active conversation.
	$('#conversationWindow').html(conversationBuffers[id])
	bindSenderElement()
	scrollDownConversation(0, false)
	$('#userInputText').focus()
	$('#buddy-' + id).addClass('currentConversation')
	// Clean up finished conversations.
	$('#buddyList div').each(function() {
		if ($(this).attr('data-id') !== id) {
			$(this).removeClass('currentConversation')
			if (
				!$(this).hasClass('newMessage') &&
				($(this).attr('status') === 'offline')
			) {
				$(this).slideUp(500, function() { $(this).remove() })
			}
		}
	})
	$('#conversationWindow').children().addClass('visibleLine')
}

// Close generating fingerprints dialog.
Cryptodog.closeGenerateFingerprints = function(nickname) {
	var state = Cryptodog.buddies[nickname].genFingerState
	Cryptodog.buddies[nickname].genFingerState = null
	$('#fill').stop().animate(
		{'width': '100%', 'opacity': '1'},
		400, 'linear',
		function() {
			$('#dialogBoxContent').fadeOut(function() {
				$(this).empty().show()
				if (state.close) {
					$('#dialogBoxClose').click()
				}
				state.cb()
			})
		}
	)
}

// Displays a pretty dialog box with `data` as the content HTML.
Cryptodog.dialogBox = function(data, options) {
	if (options.closeable) {
		$('#dialogBoxClose').css('width', 18)
		$('#dialogBoxClose').css('font-size', 12)
		$(document).keydown(function(e) {
			if (e.keyCode === 27) {
				e.stopPropagation()
				$('#dialogBoxClose').click()
				$(document).unbind('keydown')
			}
		})
	}
	if (options.extraClasses) {
		$('#dialogBox').addClass(options.extraClasses)
	}
	$('#dialogBoxContent').html(data)
	$('#dialogBox').css('height', options.height)
	$('#dialogBox').fadeIn(200, function() {
		if (options.onAppear) { options.onAppear() }
	})
	$('#dialogBoxClose').unbind('click').click(function(e) {
		e.stopPropagation()
		$(this).unbind('click')
		if ($(this).css('width') === 0) {
			return false
		}
		$('#dialogBox').fadeOut(100, function() {
			if (options.extraClasses) {
				$('#dialogBox').removeClass(options.extraClasses)
			}
			$('#dialogBoxContent').empty()
			$('#dialogBoxClose').css('width', '0')
			$('#dialogBoxClose').css('font-size', '0')
			if (options.onClose) { options.onClose() }
		})
		$('#userInputText').focus()
	})
}

// Display buddy information, including fingerprints and authentication.
Cryptodog.displayInfo = function(nickname) {
	var isMe = nickname === Cryptodog.me.nickname,
		infoDialog = isMe ? 'myInfo' : 'buddyInfo',
		chatWindow = Cryptodog.locale.chatWindow
	infoDialog = Mustache.render(Cryptodog.templates[infoDialog], {
		nickname: nickname,
		authenticated: Cryptodog.locale.auth.authenticated + ':',
		learnMoreAuth: Cryptodog.locale.auth.learnMoreAuth,
		otrFingerprint: chatWindow.otrFingerprint,
		groupFingerprint: chatWindow.groupFingerprint,
		authenticate: chatWindow.authenticate,
		verifyUserIdentity: chatWindow.verifyUserIdentity,
		secretQuestion: chatWindow.secretQuestion,
		secretAnswer: chatWindow.secretAnswer,
		ask: chatWindow.ask,
		identityVerified: chatWindow.identityVerified
	})
	ensureOTRdialog(nickname, false, function() {
		if (isMe) {
			Cryptodog.dialogBox(infoDialog, {
				height: 250,
				closeable: true
			})
		}
		else {
			var authTutorial = Mustache.render(Cryptodog.templates.authTutorial, {
				nickname: nickname,
				phrase1: Cryptodog.locale.auth.authPhrase1,
				phrase2: Cryptodog.locale.auth.authPhrase2,
				phrase3: Cryptodog.locale.auth.authPhrase3,
				phrase4: Cryptodog.locale.auth.authPhrase4,
				phrase5: Cryptodog.locale.auth.authPhrase5
			})
			Cryptodog.dialogBox(infoDialog, {
				height: 430,
				closeable: true,
				onAppear: function() {
					$('#authTutorial').html(authTutorial)
				}
			})
			bindAuthDialog(nickname)
		}
		$('#otrFingerprint').text(getFingerprint(nickname, true))
		$('#multiPartyFingerprint').text(getFingerprint(nickname, false))
	})
}

// Executes on user logout.
Cryptodog.logout = function() {
	Cryptodog.loginError = false
	Cryptodog.xmpp.connection.muc.leave(
		Cryptodog.me.conversation + '@'
		+ Cryptodog.xmpp.conferenceServer
	)
	$('#loginInfo').text(Cryptodog.locale['loginMessage']['thankYouUsing'])
	$('#loginInfo').animate({'background-color': '#bb7a20'}, 200)
	Cryptodog.xmpp.connection.disconnect()
	Cryptodog.xmpp.connection = null
	document.title = 'Cryptodog'
	$('#conversationInfo,#optionButtons').fadeOut()
	$('#header').animate({'background-color': 'transparent'})
	$('.logo').animate({'margin': '-5px 5px 0 5px'})
	$('#buddyWrapper').slideUp()
	$('.buddy').unbind('click')
	$('.buddyMenu').unbind('click')
	$('#buddy-groupChat').insertAfter('#buddiesOnline')
	$('#userInput').fadeOut(function() {
		$('#logoText').fadeIn()
		$('#footer').animate({'height': 14})
		$('#conversationWrapper').fadeOut(function() {
			$('#info,#loginOptions,#version,#loginInfo').fadeIn()
			$('#login').fadeIn(200, function() {
				$('#login').css({opacity: 1})
				$('#conversationName').select()
				$('#conversationName,#nickname').removeAttr('readonly')
				$('#loginSubmit').removeAttr('readonly')
			})
			$('#dialogBoxClose').click()
			$('#buddyList div').each(function() {
				if ($(this).attr('id') !== 'buddy-groupChat') {
					$(this).remove()
				}
			})
			$('#conversationWindow').html('')
			for (var b in Cryptodog.buddies) {
				if (Cryptodog.buddies.hasOwnProperty(b)) {
					delete Cryptodog.buddies[b]
				}
			}
			conversationBuffers = {}
		})
	})
}

Cryptodog.prepareAnswer = function(answer, ask, buddyMpFingerprint) {
	var first, second
	answer = answer.toLowerCase().replace(/(\s|\.|\,|\'|\"|\;|\?|\!)/, '')
	if (buddyMpFingerprint) {
		first = ask ? Cryptodog.me.mpFingerprint : buddyMpFingerprint
		second = ask ? buddyMpFingerprint : Cryptodog.me.mpFingerprint
		answer += ';' + first + ';' + second
	}
	return answer
}

/*
-------------------
PRIVATE INTERFACE FUNCTIONS
-------------------
*/

// Outputs the current hh:mm.
// If `seconds = true`, outputs hh:mm:ss.
var currentTime = function(seconds) {
	var date = new Date()
	var time = []
	time.push(date.getHours().toString())
	time.push(date.getMinutes().toString())
	if (seconds) { time.push(date.getSeconds().toString()) }
	for (var just in time) {
		if (time[just].length === 1) {
			time[just] = '0' + time[just]
		}
	}
	return time.join(':')
}

// Initializes a conversation buffer. Internal use.
var initializeConversationBuffer = function(id) {
	if (!conversationBuffers.hasOwnProperty(id)) {
		conversationBuffers[id] = ''
	}
}

// Get a unique buddy identifier.
var getUniqueBuddyID = function() {
	var buddyID = Cryptodog.random.encodedBytes(16, CryptoJS.enc.Hex)
	for (var b in Cryptodog.buddies) {
		if (Cryptodog.buddies.hasOwnProperty(b)) {
			if (Cryptodog.buddies[b].id === buddyID) {
				return getUniqueBuddyID()
			}
		}
	}
	return buddyID
}

// Simply shortens a string `string` to length `length.
// Adds '..' to delineate that string was shortened.
var shortenString = function(string, length) {
	if (string.length > length) {
		return string.substring(0, (length - 2)) + '..'
	}
	return string
}

// Get a fingerprint, formatted for readability.
var getFingerprint = function(nickname, OTR) {
	var buddy = Cryptodog.buddies[nickname],
		isMe = nickname === Cryptodog.me.nickname,
		fingerprint

	if (OTR) {
		fingerprint = isMe
			? Cryptodog.me.otrKey.fingerprint()
			: fingerprint = buddy.fingerprint
	} else {
		fingerprint = isMe
			? Cryptodog.me.mpFingerprint
			: buddy.mpFingerprint
	}

	var formatted = ''
	for (var i in fingerprint) {
		if (fingerprint.hasOwnProperty(i)) {
			if ((i !== 0) && (i % 8) === 0) {
				formatted += ' '
			}
			formatted += fingerprint[i]
		}
	}
	return formatted.toUpperCase()
}

// Convert message URLs to links. Used internally.
Cryptodog.addLinks = function(message) {
	var sanitize
	var URLs = message.match(/((http(s?)\:\/\/){1}\S+)/gi)
	if (!URLs) { return message }
	for (var i = 0; i !== URLs.length; i++) {
		sanitize = URLs[i].split('')
		for (var l = 0; l !== sanitize.length; l++) {
			if (!sanitize[l].match(
				/\w|\d|\:|\/|\?|\=|\#|\+|\,|\.|\&|\;|\%/)
			) {
				sanitize[l] = encodeURIComponent(sanitize[l])
			}
		}
		sanitize = sanitize.join('')
		var url = sanitize.replace(':', '&colon;')
		if (navigator.userAgent === 'Chrome (Mac app)') {
			message = message.replace(
				sanitize, '<a href="' + url + '">' + url + '</a>'
			)
			continue
		}
		message = message.replace(
			sanitize, '<a href="' + url + '" target="_blank">' + url + '</a>'
		)
	}
	return message
}

// Convert text emoticons to graphical emoticons.
var addEmoticons = function(message) {
       var emoticons = {
		'😢': /(\s|^)(:|(=))-?\&apos;\((?=(\s|$))/gi, 	//
		'😕': /(\s|^)(:|(=))-?(\/|s)(?=(\s|$))/gi,		//
		'🐱': /(\s|^)(:|(=))-?3(?=(\s|$))/gi,		   // :3 - Cat face
		'😮': /(\s|^)(:|(=))-?o(?=(\s|$))/gi,			//
		'😄': /(\s|^)(:|(=))-?D(?=(\s|$))/gi,			//
		'🙁': /(\s|^)(:|(=))-?\((?=(\s|$))/gi,			//
		'🙂': /(\s|^)(:|(=))-?\)(?=(\s|$))/gi,			//
		'😛': /(\s|^)(:|(=))-?p(?=(\s|$))/gi,			//
		//happy: /(\s|^)\^(_|\.)?\^(?=(\s|$))/gi,
		'😶': /(\s|^)(:|(=))-?x\b(?=(\s|$))/gi,			//
		'😉': /(\s|^);-?\)(?=(\s|$))/gi,				//
		'😜': /(\s|^);-?\p(?=(\s|$))/gi,				//
		//squint: /(\s|^)-_-(?=(\s|$))/gi,
		'❤️': /(\s|^)\&lt\;3\b(?=(\s|$))/g				// <3 - Heart
	}
	for (var e in emoticons) {
		if (emoticons.hasOwnProperty(e)) {
			message = message.replace(emoticons[e], ' <span class="monospace">' + e + '</span>')
		}
	}
	return message
}


// Bind `nickname`'s authentication dialog buttons and options.
var bindAuthDialog = function(nickname) {
	var buddy = Cryptodog.buddies[nickname]
	if (Cryptodog.buddies[nickname].authenticated) {
		buddy.updateAuth(true)
	}
	else {
		buddy.updateAuth(false)
	}
	$('#authenticated').unbind('click').bind('click', function() {
		buddy.updateAuth(true)
	})
	$('#notAuthenticated').unbind('click').bind('click', function() {
		buddy.updateAuth(false)
	})
	// If the current locale doesn't have the translation
	// for the auth slides yet, then don't display the option
	// for opening the auth tutorial.
	// This is temporary until all translations are ready.
	// — Nadim, March 29 2014
	if (
		Cryptodog.locale.language !== 'en' &&
		Cryptodog.locale.auth.learnMoreAuth === 'Learn more about authentication') {
		$('#authLearnMore').hide()
	}
	$('#authLearnMore').unbind('click').bind('click', function() {
		if ($(this).attr('data-active') === 'true') {
			$('#authTutorial').fadeOut(function() {
				$('#authLearnMore').attr('data-active', 'false')
					.text(Cryptodog.locale.auth.learnMoreAuth)
				$('.authInfo').fadeIn()
			})
		}
		else {
			$('.authInfo').fadeOut(function() {
				$('#authLearnMore').attr('data-active', 'true')
					.text(Cryptodog.locale.chatWindow.cont)
				$('#authTutorial').fadeIn()
			})
		}
	})
	$('#authSubmit').unbind('click').bind('click', function(e) {
		e.preventDefault()
		var question = $('#authQuestion').val()
		var answer = $('#authAnswer').val()
		if (answer.length === 0) {
			return
		}
		$('#authSubmit').val(Cryptodog.locale.chatWindow.asking)
		$('#authSubmit').unbind('click').bind('click', function(e) {
			e.preventDefault()
		})
		buddy.updateAuth(false)
		answer = Cryptodog.prepareAnswer(answer, true, buddy.mpFingerprint)
		buddy.otr.smpSecret(answer, question)
	})
}

// Bind sender element to show authStatus information and timestamps.
var bindSenderElement = function(senderElement) {
	if (!senderElement) {
		senderElement = $('.sender')
	}
	senderElement.children().unbind('mouseenter,mouseleave,click')
	senderElement.find('.nickname').mouseenter(function() {
		$(this).text($(this).parent().attr('data-timestamp'))
	})
	senderElement.find('.nickname').mouseleave(function() {
		$(this).text($(this).parent().attr('data-sender'))
	})
	senderElement.find('.authStatus').mouseenter(function() {
		if ($(this).attr('data-auth') === 'true') {
			$(this).attr('data-utip', Cryptodog.locale.auth.authenticated)
		}
		else {
			$(this).attr('data-utip',
				Mustache.render(Cryptodog.templates.authStatusFalseUtip, {
					text: Cryptodog.locale.auth.userNotAuthenticated,
					learnMore: Cryptodog.locale.auth.clickToLearnMore
				})
			)
		}
		// This is pretty ugly, sorry! Feel free to clean up via pull request.
		var bgc = $(this).css('background-color')
		var boxShadow = bgc.replace('rgb', 'rgba')
			.substring(0, bgc.length - 1) + ', 0.3)'
		$(this).attr('data-utip-style', JSON.stringify({
			'width': 'auto',
			'max-width': '110px',
			'font-size': '11px',
			'background-color': bgc,
			'box-shadow': '0 0 0 2px ' + boxShadow
		}))
		$(this).attr('data-utip-click', 'Cryptodog.displayInfo()')
	})
	senderElement.find('.authStatus').click(function() {
		Cryptodog.displayInfo($(this).parent().attr('data-sender'))
	})
}

var currentNotifications = []

var handleNotificationTimeout = function() {
	var removalIndexes = []
	currentNotifications.forEach(function (element) {
		element.timeout -= 1
		if (element.timeout <= 0) {
			element.notification.close()
			log("expiring notification")
			removalIndexes.push(currentNotifications.indexOf(element))
		}
	}, this)
	removalIndexes.forEach(function (index) {
		currentNotifications.splice(index, 1)
	}, this)
}

window.setInterval(handleNotificationTimeout, 1000);

var desktopNotification = function(image, title, body, timeout) {
	if (Cryptodog.me.windowFocus) {
		log("tried to show desktop notif, but window had focus")
		return false
	}
	if (!Cryptodog.desktopNotifications) {
		log("tried to show desktop notif, but notifs are off")
		return false
	}
	var notificationStatus = Notification.permission;
	log("showing desktop notif, status is '" + notificationStatus + "', title is: " + title)
	if (notificationStatus == 'granted') {
		var n = new Notification(title, {
			body: body,
			icon: image
		})
		currentNotifications.push({
			notification: n,
			timeout: timeout
		})
	}
	else if (notificationStatus == "default" || notificationStatus == null || notificationStatus == "")
	{
		// request permission
		Notification.requestPermission();
	}
}

// Add a join/part notification to the conversation window.
// If 'join === true', shows join notification, otherwise shows part.
var buddyNotification = function(nickname, join) {
	// Otherwise, go ahead
	var status
	if (join) {
		Cryptodog.newMessageCount(++Cryptodog.me.newMessages)
		status = Mustache.render(Cryptodog.templates.userJoin, {
			nickname: nickname,
			currentTime: currentTime(false),
			color: Cryptodog.getUserColor(nickname)
		})
	}
	else {
		status = Mustache.render(Cryptodog.templates.userLeave, {
			nickname: nickname,
			currentTime: currentTime(false)
		})
	}
	initializeConversationBuffer('groupChat')
	conversationBuffers['groupChat'] += status
	if (Cryptodog.me.currentBuddy === 'groupChat') {
		$('#conversationWindow').append(status)
	}
	scrollDownConversation(400, true)
	desktopNotification(notifImg,
		nickname + ' has ' + (join ? 'joined ' : 'left ')
		+ Cryptodog.me.conversation, '', 7)
}

// Send encrypted file.
var sendFile = function(nickname) {
	var sendFileDialog = Mustache.render(Cryptodog.templates.sendFile, {
		sendEncryptedFile: Cryptodog.locale['chatWindow']['sendEncryptedFile'],
		fileTransferInfo: Cryptodog.locale['chatWindow']['fileTransferInfo']
	})
	ensureOTRdialog(nickname, false, function() {
		Cryptodog.dialogBox(sendFileDialog, {
			height: 250,
			closeable: true
		})
		$('#fileSelector').change(function(e) {
			e.stopPropagation()
			if (this.files) {
				var file = this.files[0]
				var filename = Cryptodog.random.encodedBytes(16, CryptoJS.enc.Hex)
				filename += file.name.match(/\.(\w)+$/)[0]
				Cryptodog.buddies[nickname].otr.sendFile(filename)
				var key = Cryptodog.buddies[nickname].fileKey[filename]
				Cryptodog.otr.beginSendFile({
					file: file,
					filename: filename,
					to: nickname,
					key: key
				})
				;delete Cryptodog.buddies[nickname].fileKey[filename]
			}
		})
		$('#fileSelectButton').click(function() {
			$('#fileSelector').click()
		})
	})
}

// Scrolls down the chat window to the bottom in a smooth animation.
// 'speed' is animation speed in milliseconds.
// If `threshold` is true, we won't scroll down if the user
// appears to be scrolling up to read messages.
var scrollDownConversation = function(speed, threshold) {
	var scrollPosition = $('#conversationWindow')[0].scrollHeight
	scrollPosition -= $('#conversationWindow').scrollTop()
	if ((scrollPosition < 700) || !threshold) {
		$('#conversationWindow').stop().animate({
			scrollTop: $('#conversationWindow')[0].scrollHeight + 20
		}, speed)
	}
}

// If OTR fingerprints have not been generated, show a progress bar and generate them.
var ensureOTRdialog = function(nickname, close, cb) {
	var buddy = Cryptodog.buddies[nickname]
	if (nickname === Cryptodog.me.nickname || buddy.fingerprint) {
		return cb()
	}
	var progressDialog = '<div id="progressBar"><div id="fill"></div></div>'
	Cryptodog.dialogBox(progressDialog, {
		height: 250,
		closeable: true
	})
	$('#progressBar').css('margin', '70px auto 0 auto')
	$('#fill').animate({'width': '100%', 'opacity': '1'}, 10000, 'linear')
	// add some state for status callback
	buddy.genFingerState = { close: close, cb: cb }
	buddy.otr.sendQueryMsg()
}

// Open a buddy's contact list context menu.
var openBuddyMenu = function(nickname) {
	var buddy = Cryptodog.buddies[nickname],
		chatWindow = Cryptodog.locale.chatWindow,
		ignoreAction = chatWindow[buddy.ignored ? 'unignore' : 'ignore'],
		$menu = $('#menu-' + buddy.id),
		$buddy = $('#buddy-' + buddy.id)
	if ($menu.attr('status') === 'active') {
		$menu.attr('status', 'inactive')
		$menu.css('background-image', 'url("img/icons/circle-down.svg")')
		$buddy.animate({'height': 15}, 190)
		$('#' + buddy.id + '-contents').fadeOut(200, function() {
			$(this).remove()
		})
		return
	}
	$menu.attr('status', 'active')
	$menu.css('background-image', 'url("img/icons/circle-up.svg")')
	$buddy.delay(10).animate({'height': 130}, 180, function() {
		$buddy.append(
			Mustache.render(Cryptodog.templates.buddyMenu, {
				buddyID: buddy.id,
				sendEncryptedFile: chatWindow.sendEncryptedFile,
				displayInfo: chatWindow.displayInfo,
				ignore: ignoreAction
			})
		)
		var $contents = $('#' + buddy.id + '-contents')
		$contents.fadeIn(200)
		$contents.find('.option1').click(function(e) {
			e.stopPropagation()
			Cryptodog.displayInfo(nickname)
			$menu.click()
		})
		$contents.find('.option2').click(function(e) {
			e.stopPropagation()
			sendFile(nickname)
			$menu.click()
		})
		$contents.find('.option3').click(function(e) {
			e.stopPropagation()
			if (buddy.ignored) {
				$buddy.removeClass('ignored')
				Cryptodog.ignoredNames.splice(Cryptodog.ignoredNames.indexOf(buddy.nickname), 1)
			} else {
				$buddy.addClass('ignored')
				Cryptodog.ignoredNames.push(buddy.nickname)
			}
			buddy.ignored = !buddy.ignored
			$menu.click()
		})
	})
}

// Check for nickname completion.
// Called when pressing tab in user input.
//var _nicknameCompletion = function(input) {
//	var nickname, match, suffix
//	for (nickname in Cryptodog.buddies) {
//		if (Cryptodog.buddies.hasOwnProperty(nickname)) {
//			try { match = nickname.match(input.match(/(\S)+$/)[0]) }
//			catch(err) {}
//			if (match) {
//				if (input.match(/\s/)) { suffix = ' ' }
//				else { suffix = ': ' }
//				return input.replace(/(\S)+$/, nickname + suffix)
//			}
//		}
//	}
//}

var nicknameCompletion = function(input) {
	var nickname, suffix
	var potentials = []
	for (nickname in Cryptodog.buddies) {
		if (Cryptodog.buddies.hasOwnProperty(nickname)) {
			try {
				potentials.push({
				    score: nickname.score(input.match(/(\S)+$/)[0], 0.01),
				    value: nickname
				})
			}
			catch (err) {
				log("completion: " + err)
			}
		}
	}
	var largest = potentials[0];

    // find item with largest score
    potentials.forEach(function(item) {
        if (item.score > largest.score) {
            largest = item
        }
    }, this)

	//for (var i = 0; i < potentials.length; i++) {
	//	if (potentials[i].score > largest.score) {
	//		largest = potentials[i]
	//	}
	//	log("completion.potential: score=" + potentials[i].score + ",value=" + potentials[i].value)
	//}
	log("completion.matcher: score=" + largest.score + ", value=" + largest.value)
	if (input.match(/\s/)) {
		suffix = ' '
	}
	else {
		 suffix = ': '
	}
	if (largest.score < 0.1)    // cut-off matching attempt if all scores are low
		return input;
	return input.replace(/(\S)+$/, largest.value + suffix)
}
// Get color by nickname
Cryptodog.getUserColor = function(nickname){
	if (nickname === Cryptodog.me.nickname){
		return Cryptodog.me.color
	}
	else if (Cryptodog.buddies[nickname] !== undefined){
		return Cryptodog.buddies[nickname].color
	}
	else {
		return '#000'
	}
}

// Handle new message count
Cryptodog.newMessageCount = function(count){
	if (Cryptodog.me.windowFocus) {
		Cryptodog.me.newMessages = 0
		// clear notifications
		currentNotifications.forEach(function(element) {
			element.notification.close()
		}, this);
		currentNotifications = []
	}
	count = Cryptodog.me.newMessages
	var prevCount = document.title.match(/^\([0-9]+\)\s+/)
	if (prevCount){
		if (count <= 0){
			document.title = document.title.replace(prevCount[0],'')
		}
		else if (count >= 1){
			document.title = document.title.replace(prevCount[0],'('+count+') ')
		}
	}
	else {
		if (count <= 0) { return }
		else if (count >= 1){
			document.title = '('+count+') ' + document.title
		}
	}
}

/*
-------------------
USER INTERFACE BINDINGS
-------------------
*/

// Buttons:
// Dark mode button
$('#darkMode').click(function() {
	var $this = $(this)
	if (document.body.classList.contains('darkMode')){
		document.body.classList.remove('darkMode')
		$('#darkMode').attr('data-utip', 'Dark mode')
	}
	else {
		document.body.classList.add('darkMode')
		$('#darkMode').attr('data-utip', 'Light mode')
	}
})

// Status button.
$('#status').click(function() {
	var $this = $(this)
	if ($this.attr('src') === 'img/icons/checkmark.svg') {
		$this.attr('src', 'img/icons/cross.svg')
		$this.attr('title', Cryptodog.locale['chatWindow']['statusAway'])
		$this.attr('data-utip', Cryptodog.locale['chatWindow']['statusAway'])
		$this.mouseenter()
		Cryptodog.xmpp.currentStatus = 'away'
		Cryptodog.xmpp.sendStatus()
	}
	else {
		$this.attr('src', 'img/icons/checkmark.svg')
		$this.attr('title', Cryptodog.locale['chatWindow']['statusAvailable'])
		$this.attr('data-utip', Cryptodog.locale['chatWindow']['statusAvailable'])
		$this.mouseenter()
		Cryptodog.xmpp.currentStatus = 'online'
		Cryptodog.xmpp.sendStatus()
	}
})

// My info button.
$('#myInfo').click(function() {
	Cryptodog.displayInfo(Cryptodog.me.nickname)
})

// Desktop notifications button.
$('#notifications').click(function() {
	var $this = $(this)
	if ($this.attr('src') === 'img/icons/bubble2.svg') {
		$this.attr('src', 'img/icons/bubble.svg')
		$this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOn'])
		$this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOn'])
		$this.mouseenter()
		Cryptodog.desktopNotifications = true
		Cryptodog.storage.setItem('desktopNotifications', 'true')
		var notifStatus = Notification.permission;
		if (notifStatus == 'denied') {
			// notifications supported but not enabled
			Notification.requestPermission();
			// check if user actually accepted
			if (Notification.permission == 'denied') {
				Cryptodog.desktopNotifications = false
				Cryprodog.storage.setItem('desktopNotifications', 'false')
			}
		}
		else if (notifStatus == 'unknown') {
			// browser doesn't support desktop notifications
			alert("It looks like your browser doesn't support desktop notifications.")
			$this.attr('src', 'img/icons/bubble2.svg')
			$this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOff'])
			$this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOff'])
			$this.mouseenter()
			Cryptodog.desktopNotifications = false
			Cryptodog.storage.setItem('desktopNotifications', 'false')
		}
	}
	else {
		$this.attr('src', 'img/icons/bubble2.svg')
		$this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOff'])
		$this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOff'])
		$this.mouseenter()
		Cryptodog.desktopNotifications = false
		Cryptodog.storage.setItem('desktopNotifications', 'false')
	}
})

// Logout button.
$('#logout').click(function() {
	Cryptodog.logout()
})

// Submit user input.
$('#userInput').submit(function() {
	var message = $.trim($('#userInputText').val())
	$('#userInputText').val('')
	if (!message.length) { return false }
	if (Cryptodog.me.currentBuddy !== 'groupChat') {
		Cryptodog.buddies[
			Cryptodog.getBuddyNicknameByID(Cryptodog.me.currentBuddy)
		].otr.sendMsg(message)
	}
	else if (Object.keys(Cryptodog.buddies).length) {
		var ciphertext = JSON.parse(Cryptodog.multiParty.sendMessage(message))
		var missingRecipients = []
		for (var i in Cryptodog.buddies) {
			if (typeof(ciphertext['text'][i]) !== 'object') {
				missingRecipients.push(i)
			}
		}
		if (missingRecipients.length) {
			Cryptodog.addToConversation(
				missingRecipients, Cryptodog.me.nickname,
				'groupChat', 'missingRecipients'
			)
		}
		Cryptodog.xmpp.connection.muc.message(
			Cryptodog.me.conversation + '@' + Cryptodog.xmpp.conferenceServer,
			null, JSON.stringify(ciphertext), null, 'groupchat', 'active'
		)
	}
	Cryptodog.addToConversation(
		message, Cryptodog.me.nickname,
		Cryptodog.me.currentBuddy, 'message'
	)
	return false
})

// User input key event detection.
// (Message submission, nick completion...)
$('#userInputText').keydown(function(e) {
	if (e.keyCode === 9) {
		e.preventDefault()
		var nickComplete = nicknameCompletion($(this).val())
		if (nickComplete) {
			$(this).val(nickComplete)
		}
	}
	else if (e.keyCode === 13) {
		e.preventDefault()
		$('#userInput').submit()
		Cryptodog.me.composing = false
		return true
	}
	var destination, type
	if (Cryptodog.me.currentBuddy === 'groupChat') {
		destination = null
		type = 'groupchat'
	}
	else {
		destination = Cryptodog.getBuddyNicknameByID(Cryptodog.me.currentBuddy)
		type = 'chat'
	}
	if (!Cryptodog.me.composing) {
		Cryptodog.me.composing = true
		Cryptodog.xmpp.connection.muc.message(
			Cryptodog.me.conversation + '@' + Cryptodog.xmpp.conferenceServer,
			destination, '', null, type, 'composing'
		)
		window.setTimeout(function(d, t) {
			Cryptodog.xmpp.connection.muc.message(
				Cryptodog.me.conversation + '@' + Cryptodog.xmpp.conferenceServer,
				d, '', null, t, 'paused'
			)
			Cryptodog.me.composing = false
		}, 7000, destination, type)
	}
})

$('#userInputText').keyup(function(e) {
	if (e.keyCode === 13) {
		e.preventDefault()
	}
})

$('#userInputSubmit').click(function() {
	$('#userInput').submit()
	$('#userInputText').select()
})

// Language selector.
$('#languageSelect').click(function() {
	$('#customServerDialog').hide()
	$('#languages li').css({'color': '#FFF', 'font-weight': 'normal'})
	$('[data-locale=' + Cryptodog.locale['language'] + ']').css({
		'color': '#CCC',
		'font-weight': 'bold'
	})
	$('#footer').animate({'height': 190}, function() {
		$('#languages').fadeIn()
	})
	$('#languages li').click(function() {
		var lang = $(this).attr('data-locale')
		$('#languages').fadeOut(200, function() {
			Cryptodog.locale.set(lang, true)
			Cryptodog.storage.setItem('language', lang)
			$('#footer').animate({'height': 14})
		})
	})
})

// Login form.
$('#conversationName').click(function() {
	$(this).select()
})
$('#nickname').click(function() {
	$(this).select()
})
$('#CryptodogLogin').submit(function() {
	// Don't submit if form is already being processed.
	if (($('#loginSubmit').attr('readonly') === 'readonly')) {
		return false
	}
	//Check validity of conversation name and nickname.
	$('#conversationName').val($.trim($('#conversationName').val().toLowerCase()))
	$('#nickname').val($.trim($('#nickname').val().toLowerCase()))
	if ($('#conversationName').val() === '') {
		Cryptodog.loginFail(Cryptodog.locale['loginMessage']['enterConversation'])
		$('#conversationName').select()
	}
	else if (!$('#conversationName').val().match(/^\w{1,20}$/)) {
		Cryptodog.loginFail(Cryptodog.locale['loginMessage']['conversationAlphanumeric'])
		$('#conversationName').select()
	}
	else if ($('#nickname').val() === '') {
		Cryptodog.loginFail(Cryptodog.locale['loginMessage']['enterNickname'])
		$('#nickname').select()
	}
	else if (!$('#nickname').val().match(/^\w{1,16}$/)) {
		Cryptodog.loginFail(Cryptodog.locale['loginMessage']['nicknameAlphanumeric'])
		$('#nickname').select()
	}
	// Prepare keys and connect.
	else {
		$('#loginSubmit,#conversationName,#nickname').attr('readonly', 'readonly')
		Cryptodog.xmpp.showKeyPreparationDialog(function() {
			Cryptodog.xmpp.connect()
		})
	}
	return false
})



/*
-------------------
WINDOW EVENT BINDINGS
-------------------
*/

// When the window/tab is not selected, set `windowFocus` to false.
// `windowFocus` is used to know when to show desktop notifications.
$(window).blur(function() {
	Cryptodog.me.windowFocus = false
})

// On window focus, select text input field automatically if we are chatting.
// Also set `windowFocus` to true.
$(window).focus(function() {
	Cryptodog.me.windowFocus = true
	Cryptodog.newMessageCount()
	if (Cryptodog.me.currentBuddy) {
		$('#userInputText').focus()
	}
})

// Prevent accidental window close.
$(window).bind('beforeunload', function() {
	if (Object.keys(Cryptodog.buddies).length > 1) {
		return Cryptodog.locale['loginMessage']['thankYouUsing']
	}
})

// Logout on browser close.
$(window).unload(function() {
	if (Cryptodog.xmpp.connection !== null) {
		Cryptodog.xmpp.connection.disconnect()
	}
})

// Determine whether we are showing a top margin
// Depending on window size
$(window).resize(function() {
	if ($(window).height() < 650) {
		$('#bubble').css('margin-top', '0')
	}
	else {
		$('#bubble').css('margin-top', '2%')
	}
})
$(window).resize()

// Show main window.
$('#bubble').show()

})}
