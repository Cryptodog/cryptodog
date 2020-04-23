if (typeof Cryptodog === 'undefined') { Cryptodog = function() {} }

/*
-------------------
GLOBAL VARIABLES
-------------------
*/

Cryptodog.version = '2.5.8'

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
	color:         "#FFF" // overwritten on connect
}

Cryptodog.buddies = {}

// For persistent ignores.
Cryptodog.ignoredNicknames = []

// Toggle for audio notifications
Cryptodog.allowSoundNotifications = false;

// Sounds
Cryptodog.audio = {
	newMessage: new Audio("snd/msgGet.mp3"),
	userJoin: new Audio("snd/userJoin.mp3"),
	userLeave: new Audio("snd/userLeave.mp3")
};

// image used for notifications
var notifImg = "img/logo-128.png";

Notification.requestPermission();

// checks if a string is composed of displayable ASCII chars
var ascii = /^[ -~]+$/;

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

Cryptodog.UI.setVersion(Cryptodog.version);

Cryptodog.conversationBuffers = {};

/*
-------------------
GLOBAL INTERFACE FUNCTIONS
-------------------
*/

// If returns true for a name, name is automatically ignored
// Can be used to filter out types of names
Cryptodog.isFiltered = function(name) {
	return false;
}

// Update a file transfer progress bar.
Cryptodog.updateFileProgressBar = function(file, chunk, size, recipient) {
	var conversationBuffer = $(Cryptodog.conversationBuffers[Cryptodog.buddies[recipient].id]);
	var progress = (chunk * 100) / (Math.ceil(size / Cryptodog.otr.chunkSize));
	if (progress > 100) { progress = 100 }
	$('.fileProgressBarFill')
		.filterByData('file', file)
		.filterByData('id', Cryptodog.buddies[recipient].id)
		.animate({'width': progress + '%'});
	conversationBuffer.find('.fileProgressBarFill')
		.filterByData('file', file)
		.filterByData('id', Cryptodog.buddies[recipient].id)
		.width(progress + '%');
	Cryptodog.conversationBuffers[Cryptodog.buddies[recipient].id] = $('<div>').append($(conversationBuffer).clone()).html();
}

// Convert Data blob/url to downloadable file, replacing the progress bar.
Cryptodog.addFile = function(url, file, conversation, filename) {
	var conversationBuffer = $(Cryptodog.conversationBuffers[Cryptodog.buddies[conversation].id]);
	
	var fileLink = Mustache.render(Cryptodog.templates.fileLink, {
		url: url,
		filename: filename,
		downloadFile: Cryptodog.locale['chatWindow']['downloadFile']
	});
	
	$('.fileProgressBar')
		.filterByData('file', file)
		.filterByData('id', Cryptodog.buddies[conversation].id)
		.replaceWith(fileLink)
	conversationBuffer.find('.fileProgressBar')
		.filterByData('file', file)
		.filterByData('id', Cryptodog.buddies[conversation].id)
		.replaceWith(fileLink);
	Cryptodog.conversationBuffers[Cryptodog.buddies[conversation].id] = $('<div>').append($(conversationBuffer).clone()).html();
}

// Add a `message` from `nickname` to the `conversation` display and log.
// `type` can be 'file', 'message', 'warning' or 'missingRecipients'.
// In case `type` === 'missingRecipients', `message` becomes array of missing recipients.
Cryptodog.addToConversation = function(message, nickname, conversation, type) {
	if (nickname === Cryptodog.me.nickname) {}
	else if (Cryptodog.buddies[nickname].ignored()) {
		return false;
	}
	initializeConversationBuffer(conversation)
	if (type === 'file') {
		if (!message.length) { return false; }
		var id = conversation;
		if (nickname !== Cryptodog.me.nickname) {
			Cryptodog.newMessageCount(++Cryptodog.me.newMessages);
			id = Cryptodog.buddies[nickname].id;
		}
		message = Mustache.render(
			Cryptodog.templates.file, {
				file: message,
				id: id
			}
		);
	}
	if (type === 'message') {
		if (!message.length) { return false }
		if (nickname !== Cryptodog.me.nickname) {
			Cryptodog.buddies[nickname].messageCount++;

			Cryptodog.newMessageCount(++Cryptodog.me.newMessages);
			if (Cryptodog.allowSoundNotifications) {
				Cryptodog.audio.newMessage.play();
			}
			desktopNotification(notifImg, Cryptodog.me.nickname + "@" + Cryptodog.me.conversation, nickname + ": " + message, 7);
		}
		message = Strophe.xmlescape(message);
		message = Cryptodog.UI.addLinks(message);
		message = Cryptodog.UI.stylizeText(message);
		message = Cryptodog.UI.addEmoticons(message);
	}
	if (type === 'warning') {
		if (!message.length) { return false }
		message = Strophe.xmlescape(message);
		Cryptodog.buddies[nickname].messageCount++;
	}
	if (type === 'missingRecipients') {
		if (!message.length) { return false }
		message = message.join(', ');
		message = Mustache.render(Cryptodog.templates.missingRecipients, {
			text: Cryptodog.locale.warnings.missingRecipientWarning
				.replace('(NICKNAME)', message),
			dir: Cryptodog.locale.direction
		})
		Cryptodog.conversationBuffers[conversation] += message;
		if (conversation === Cryptodog.me.currentBuddy) {
			$('#conversationWindow').append(message);
			$('.missingRecipients').last().animate({'top': '0', 'opacity': '1'}, 100);
			Cryptodog.UI.scrollDownConversation(400, true);
		}
		return true;
	}
	var authStatus = false;
	if ((nickname === Cryptodog.me.nickname) || Cryptodog.buddies[nickname].authenticated) {
		authStatus = true;
	}
	message = message.replace(/:/g, '&#58;');

	var renderedMessage = Mustache.render(Cryptodog.templates.message, {
		nickname: nickname,
		currentTime: currentTime(true),
		authStatus: authStatus,
		message: message,
		color: Cryptodog.getUserColor(nickname),
		style: type == 'warning' ? 'italic' : 'normal'
	});

	Cryptodog.conversationBuffers[conversation] += renderedMessage
	if (conversation === Cryptodog.me.currentBuddy) {
		$('#conversationWindow').append(renderedMessage);
		$('.line').last().animate({'top': '0', 'opacity': '1'}, 100);
		Cryptodog.UI.bindSenderElement($('.line').last().find('.sender'));
		Cryptodog.UI.scrollDownConversation(400, true);
	}
	else {
		$('#buddy-' + conversation).addClass('newMessage');
	}
	Cryptodog.rebindDataURIs();
}

// Show a preview for a received message from a buddy.
// Message previews will not overlap and are removed after 5 seconds.
Cryptodog.messagePreview = function(message, nickname) {
	var buddyElement = $('#buddy-' + Cryptodog.buddies[nickname].id);
	if (!buddyElement.attr('data-utip')) {
		if (message.length > 15) {
			message = message.substring(0, 15) + '…';
		}
		buddyElement.attr({
			'data-utip-gravity': 'sw',
			'data-utip': Strophe.xmlescape(message)
		}).mouseenter();
		window.setTimeout(function() {
			buddyElement.mouseleave()
			buddyElement.removeAttr('data-utip')
		}, 0x1337);
	}
}

Cryptodog.buddyWhitelistEnabled = false;

// Automatically ignore newcomers who aren't in the current buddies list
Cryptodog.toggleBuddyWhitelist = function() {
	if (Cryptodog.buddyWhitelistEnabled) {
		Cryptodog.isFiltered = function(nickname) {
			return false;
		};

		Cryptodog.buddyWhitelistEnabled = false;
	} else {
		var whitelist = Object.keys(Cryptodog.buddies);
		Cryptodog.isFiltered = function(nickname) {
			return !whitelist.includes(nickname);
		};

		Cryptodog.buddyWhitelistEnabled = true;
	}    
};

Cryptodog.autoIgnore = true;

// Buddies who exceed this message rate will be automatically ignored
Cryptodog.maxMessageCount = 5;
Cryptodog.maxMessageInterval = 3000;

// Build new buddy.
Cryptodog.addBuddy = function(nickname) {
	const buddy = new Buddy(nickname);
	Cryptodog.buddies[nickname] = buddy;
	buddyList.add(buddy);
	buddyNotification(nickname, true);
}

// Handle buddy going offline.
Cryptodog.removeBuddy = function(nickname) {
	if (!Cryptodog.buddies[nickname]) {
		return;
	}
	var buddyID = Cryptodog.buddies[nickname].id;
	var buddyElement = $('.buddy').filterByData('id', buddyID);

	Cryptodog.color.push(Cryptodog.buddies[nickname].color);

	delete Cryptodog.buddies[nickname];
	if (!buddyElement.length) {
		return;
	}
	buddyElement.each(function() {
		$(this).attr('status', 'offline');
		buddyNotification(nickname, false);
		if (Cryptodog.me.currentBuddy === buddyID) {
			return;
		}
		if (!$(this).hasClass('newMessage')) {
			$(this).slideUp(500, function() {
				$(this).remove();
			})
		}
	})
}

// Get a buddy's nickname from their ID.
Cryptodog.getBuddyNicknameByID = function(id) {
	for (var i in Cryptodog.buddies) {
		if (Cryptodog.buddies.hasOwnProperty(i)) {
			if (Cryptodog.buddies[i].id === id) {
				return i;
			}
		}
	}
}

// Bind buddy click actions.
Cryptodog.onBuddyClick = function(buddyElement) {
	var nickname = Cryptodog.getBuddyNicknameByID(buddyElement.attr('data-id'));
	buddyElement.removeClass('newMessage');
	if (buddyElement.prev().attr('id') === 'currentConversation') {
		$('#userInputText').focus();
		return true;
	}
	var id = buddyElement.attr('data-id');
	Cryptodog.me.currentBuddy = id;
	initializeConversationBuffer(id);
	// Switch currently active conversation.
	$('#conversationWindow').html(Cryptodog.conversationBuffers[id]);
	Cryptodog.UI.bindSenderElement();
	Cryptodog.UI.scrollDownConversation(0, false);
	$('#userInputText').focus();
	$('#buddy-' + id).addClass('currentConversation');
	// Clean up finished conversations.
	$('#buddyList div').each(function() {
		if ($(this).attr('data-id') !== id) {
			$(this).removeClass('currentConversation');
			if (!$(this).hasClass('newMessage') && ($(this).attr('status') === 'offline')) {
				$(this).slideUp(500, function() { $(this).remove() });
			}
		}
	})
	$('#conversationWindow').children().addClass('visibleLine');
	Cryptodog.rebindDataURIs();
}

// Handle click event on all embedded data URI messages
Cryptodog.rebindDataURIs = function() {
	function handleDataUriClick() {
		Cryptodog.UI.openDataInNewWindow(this.getAttribute("data-uri-data"));
	}

	var clickables = document.querySelectorAll(".data-uri-clickable");
	clickables.forEach(function(link, i) {
		var linkClone = link.cloneNode(true);
		link.parentNode.replaceChild(linkClone, link);
		linkClone.addEventListener("click", handleDataUriClick.bind(link));
	});
}

// Executes on user logout.
Cryptodog.logout = function() {
	Cryptodog.UI.logout();
	Cryptodog.loginError = false;
	Cryptodog.xmpp.connection.muc.leave(
		Cryptodog.me.conversation + '@'
		+ Cryptodog.xmpp.currentServer.conference
	);
	Cryptodog.xmpp.connection.disconnect();
	Cryptodog.xmpp.connection = null;

	for (var b in Cryptodog.buddies) {
		if (Cryptodog.buddies.hasOwnProperty(b)) {
			delete Cryptodog.buddies[b];
		}
	}

	Cryptodog.color.reset();
	Cryptodog.conversationBuffers = {};
}

Cryptodog.prepareAnswer = function(answer, ask, buddyMpFingerprint) {
	var first, second;
	answer = answer.toLowerCase().replace(/(\s|\.|\,|\'|\"|\;|\?|\!)/, '');
	if (buddyMpFingerprint) {
		first = ask ? Cryptodog.me.mpFingerprint : buddyMpFingerprint;
		second = ask ? buddyMpFingerprint : Cryptodog.me.mpFingerprint;
		answer += ';' + first + ';' + second;
	}
	return answer;
}

Cryptodog.changeStatus = function(status) {
	if (status === 'away' || status === 'online'){
		Cryptodog.xmpp.currentStatus = status;
		Cryptodog.xmpp.sendStatus();
	}
}

/*
-------------------
PRIVATE INTERFACE FUNCTIONS
-------------------
*/

// Outputs the current hh:mm.
// If `seconds = true`, outputs hh:mm:ss.
var currentTime = function(seconds) {
	var date = new Date();
	var time = [];
	time.push(date.getHours().toString());
	time.push(date.getMinutes().toString());
	if (seconds) { 
	   time.push(date.getSeconds().toString());
	}
	for (var just in time) {
		if (time[just].length === 1) {
			time[just] = '0' + time[just];
		}
	}
	return time.join(':');
}

// Initializes a conversation buffer. Internal use.
var initializeConversationBuffer = function(id) {
	if (!Cryptodog.conversationBuffers.hasOwnProperty(id)) {
		Cryptodog.conversationBuffers[id] = '';
	}
}

var currentNotifications = [];

var handleNotificationTimeout = function() {
	var removalIndexes = [];
	currentNotifications.forEach(function (element) {
		element.timeout -= 1;
		if (element.timeout <= 0) {
			element.notification.close();
			removalIndexes.push(currentNotifications.indexOf(element));
		}
	}, this);
	removalIndexes.forEach(function (index) {
		currentNotifications.splice(index, 1);
	}, this);
}

window.setInterval(handleNotificationTimeout, 1000);

function notificationTruncate(msg) {
   // Chrome truncates its notifications on its own, but firefox doesn't for some reason
	var is_firefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
	if (msg.length > 50 && is_firefox) {
		return msg.substring(0,50) + "…";
	}
	return msg;
}

var desktopNotification = function(image, title, body, timeout) {
	if (Cryptodog.me.windowFocus) {
		return false;
	}
	if (!Cryptodog.desktopNotifications) {
		return false;
	}
	var notificationStatus = Notification.permission;
	if (notificationStatus == 'granted') {
		var n = new Notification(title, {
			body: notificationTruncate(body),
			icon: image
		});
		currentNotifications.push({
			notification: n,
			timeout: timeout
		});
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
		Cryptodog.newMessageCount(++Cryptodog.me.newMessages);
		status = Mustache.render(Cryptodog.templates.userJoin, {
			nickname: nickname,
			currentTime: currentTime(false),
			color: Cryptodog.getUserColor(nickname)
		});
	}
	else {
		status = Mustache.render(Cryptodog.templates.userLeave, {
			nickname: nickname,
			currentTime: currentTime(false)
		});
	}
	initializeConversationBuffer('groupChat');
	Cryptodog.conversationBuffers['groupChat'] += status;
	if (Cryptodog.me.currentBuddy === 'groupChat') {
		$('#conversationWindow').append(status);
	}
	Cryptodog.UI.scrollDownConversation(400, true);

	if (Cryptodog.allowSoundNotifications) {
		if (join) {
			Cryptodog.audio.userJoin.play();
		}
		else {
			Cryptodog.audio.userLeave.play();
		}
	}	

	desktopNotification(notifImg,
		nickname + ' has ' + (join ? 'joined ' : 'left ')
		+ Cryptodog.me.conversation, '', 7);
}

// Send encrypted file.
var sendFile = function(nickname) {
	let buddy = Cryptodog.buddies[nickname];
	buddy.ensureOTR(false, function() {
		dialog.showSendFile(buddy);
	});
}

// Check for nickname completion.
// Called when pressing tab in user input.
var nicknameCompletion = function(input) {
	var nickname, suffix;
	var potentials = [];
	for (nickname in Cryptodog.buddies) {
		if (Cryptodog.buddies.hasOwnProperty(nickname)) {
			try {
				potentials.push({
					score: nickname.score(input.match(/(\S)+$/)[0], 0.01),
					value: nickname
				});
			}
			catch (err) {
				console.log(err);
			}
		}
	}
	var largest = potentials[0];

	// find item with largest score
	potentials.forEach(function(item) {
		if (item.score > largest.score) {
			largest = item;
		}
	}, this);

	if (input.match(/\s/)) {
		suffix = ' ';
	}
	else {
		 suffix = ': ';
	}
	if (largest.score < 0.1)    // cut-off matching attempt if all scores are low
		return input;
	return input.replace(/(\S)+$/, largest.value + suffix);
}

// Get color by nickname
Cryptodog.getUserColor = function(nickname){
	return nickname === Cryptodog.me.nickname ? Cryptodog.me.color : Cryptodog.buddies[nickname].color;
}

// Handle new message count
Cryptodog.newMessageCount = function(count){
	if (Cryptodog.me.windowFocus) {
		Cryptodog.me.newMessages = 0;
		// clear notifications
		currentNotifications.forEach(function(element) {
			element.notification.close();
		}, this);
		currentNotifications = [];
	}
	count = Cryptodog.me.newMessages;
	var prevCount = document.title.match(/^\([0-9]+\)\s+/);
	// TODO: Clean this up a bit
	if (prevCount) {
		if (count <= 0) {
			document.title = document.title.replace(prevCount[0], '');
		}
		else if (count >= 1){
			document.title = document.title.replace(prevCount[0], '(' + count + ') ');
		} 
	}
	else {
		if (count <= 0) { return }
		else if (count >= 1){
			document.title = '(' + count + ') ' + document.title;
		}
	}
}

/*
-------------------
USER INTERFACE BINDINGS
-------------------
*/

// Submit user input.
$('#userInput').submit(function() {
	var message = $.trim($('#userInputText').val())
	$('#userInputText').val('')
	if (!message.length) { return false }
	if (Cryptodog.me.currentBuddy !== 'groupChat') {
		Cryptodog.buddies[
			Cryptodog.getBuddyNicknameByID(Cryptodog.me.currentBuddy)
		].otr.sendMsg(message);
	}
	else if (Object.keys(Cryptodog.buddies).length) {
		var ciphertext = JSON.parse(Cryptodog.multiParty.sendMessage(message));
		var missingRecipients = [];
		for (var i in Cryptodog.buddies) {
			if (typeof(ciphertext['text'][i]) !== 'object') {
				missingRecipients.push(i);
			}
		}
		if (missingRecipients.length) {
			Cryptodog.addToConversation(
				missingRecipients, Cryptodog.me.nickname,
				'groupChat', 'missingRecipients'
			);
		}
		Cryptodog.xmpp.connection.muc.message(
			Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
			null, JSON.stringify(ciphertext), null, 'groupchat', 'active'
		);
	}
	Cryptodog.addToConversation(
		message, Cryptodog.me.nickname,
		Cryptodog.me.currentBuddy, 'message'
	);
	return false;
})

function isCharacterKeyPress(e) {
	if (typeof e.which == "number" && e.which > 0) {
		return !e.ctrlKey && !e.metaKey && !e.altKey && e.which != 8 && e.which != 16;
 	}
	return false;
}

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
		e.preventDefault();
		$('#userInput').submit();
		Cryptodog.me.composing = false;
		return true;
	}
	if (!isCharacterKeyPress(e)) return;
	var destination, type;
	if (Cryptodog.me.currentBuddy === 'groupChat') {
		destination = null;
		type = 'groupchat';
	}
	else {
		destination = Cryptodog.getBuddyNicknameByID(Cryptodog.me.currentBuddy);
		type = 'chat';
	}
	if (!Cryptodog.me.composing) {
		Cryptodog.me.composing = true;
		Cryptodog.xmpp.connection.muc.message(
			Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
			destination, '', null, type, 'composing'
		);
		window.setTimeout(function(d, t) {
			Cryptodog.xmpp.connection.muc.message(
				Cryptodog.me.conversation + '@' + Cryptodog.xmpp.currentServer.conference,
				d, '', null, t, 'paused'
			);
			Cryptodog.me.composing = false;
		}, 7000, destination, type);
	}
})

$('#userInputText').keyup(function(e) {
	if (e.keyCode === 13) {
		e.preventDefault();
	}
})

$('#userInputSubmit').click(function() {
	$('#userInput').submit();
	$('#userInputText').select();
})

// Language selector.
$('#languageSelect').click(function() {
	$('#customServerDialog').hide();
	$('#languages li').css({'color': '#FFF', 'font-weight': 'normal'});
	$('[data-locale=' + Cryptodog.locale['language'] + ']').css({
		'color': '#CCC',
		'font-weight': 'bold'
	});
	$('#footer').animate({'height': 190}, function() {
		$('#languages').fadeIn();
	});
	$('#languages li').click(function() {
		var lang = $(this).attr('data-locale');
		$('#languages').fadeOut(200, function() {
			Cryptodog.locale.set(lang, true);
			Cryptodog.storage.setItem('language', lang);
			$('#footer').animate({'height': 14});
		});
	})
})

// Login form.
$('#conversationName').click(function() {
	$(this).select();
})
$('#nickname').click(function() {
	$(this).select();
})
$('#CryptodogLogin').submit(function() {
	// Don't submit if form is already being processed.
	if (($('#loginSubmit').attr('readonly') === 'readonly')) {
		return false;
	}

	$('#conversationName').val($.trim($('#conversationName').val().toLowerCase()));
	$('#nickname').val($.trim($('#nickname').val()));

	if ($('#conversationName').val() === '') {
		Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['enterConversation']);
		$('#conversationName').select();
	}
	else if (!$('#conversationName').val().match(/^\w{1,1023}$/)) {
		Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['conversationAlphanumeric']);
		$('#conversationName').select();
	}
	else if ($('#nickname').val() === '') {
		Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['enterNickname']);
		$('#nickname').select();
	}

	// Prepare keys and connect
	else {
		$('#loginSubmit,#conversationName,#nickname').attr('readonly', 'readonly');
		Cryptodog.me.conversation = $('#conversationName').val();
		Cryptodog.me.nickname = $('#nickname').val();
		
		Cryptodog.xmpp.showKeyPreparationDialog(function () {
			Cryptodog.me.color = Cryptodog.color.pop();
			Cryptodog.xmpp.connect();
		});
	}
	return false;
})

Cryptodog.UI.userInterfaceBindings();

Cryptodog.UI.windowEventBindings();

Cryptodog.UI.show();

})}
