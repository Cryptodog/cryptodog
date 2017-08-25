if (typeof Cryptodog === 'undefined') { Cryptodog = function () { } }

/*
-------------------
GLOBAL VARIABLES
-------------------
*/

Cryptodog.version = '2.3.1' // Version number

Cryptodog.me = {
	newMessages: 0,
	windowFocus: true,
	composing: false,
	conversation: null,
	nickname: null,
	otrKey: null,
	fileKey: null,
	mpPrivateKey: null,
	mpPublicKey: null,
	mpFingerprint: null,
	currentBuddy: null,
	color: "#FFF" // overwritten on connect
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
	userLeave: new Audio("snd/userLeave.mp3"),
	mePing: new Audio("snd/mePing.mp3"),
	themPing: new Audio("snd/themPing.mp3"),
};

// image used for notifications
var notifImg = "img/logo-128.png";

Notification.requestPermission(function (permission) {
	log("asked for notification permission, got '" + permission + "'");
});

// checks if a string is composed of displayable ASCII chars
var ascii = /^[ -~]+$/;

/*
-------------------
END GLOBAL SCOPE
-------------------
*/

if (typeof (window) !== 'undefined') {
	$(window).ready(function () {
		'use strict';

		/*
		-------------------
		INTIALIZATION
		-------------------
		*/

		Cryptodog.UI.setVersion(Cryptodog.version);

		// Seed RNG.
		Cryptodog.random.setSeed(Cryptodog.random.generateSeed());

		var conversationBuffers = {};

		/*
		-------------------
		GLOBAL INTERFACE FUNCTIONS
		-------------------
		*/

		// If returns true for a name, name is automatically ignored
		// Can be used to filter out types of names
		Cryptodog.isFiltered = function (name) {
			return false;
		}

		// Update a file transfer progress bar.
		Cryptodog.updateFileProgressBar = function (file, chunk, size, recipient) {
			var conversationBuffer = $(conversationBuffers[Cryptodog.buddies[recipient].id]);
			var progress = (chunk * 100) / (Math.ceil(size / Cryptodog.otr.chunkSize));
			if (progress > 100) { progress = 100 }
			$('.fileProgressBarFill')
				.filterByData('file', file)
				.filterByData('id', Cryptodog.buddies[recipient].id)
				.animate({ 'width': progress + '%' });
			conversationBuffer.find('.fileProgressBarFill')
				.filterByData('file', file)
				.filterByData('id', Cryptodog.buddies[recipient].id)
				.width(progress + '%');
			conversationBuffers[Cryptodog.buddies[recipient].id] = $('<div>').append($(conversationBuffer).clone()).html();
		}

		// Convert Data blob/url to downloadable file, replacing the progress bar.
		Cryptodog.addFile = function (url, file, conversation, filename) {
			var conversationBuffer = $(conversationBuffers[Cryptodog.buddies[conversation].id]);
			var fileLinkString = 'fileLink';
			if (navigator.userAgent === 'Chrome (Mac app)') {
				fileLinkString += 'Mac';
			}
			var fileLink = Mustache.render(Cryptodog.templates[fileLinkString], {
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
			conversationBuffers[Cryptodog.buddies[conversation].id] = $('<div>').append($(conversationBuffer).clone()).html();
		}

		// Add a `message` from `nickname` to the `conversation` display and log.
		// `type` can be 'file', 'message', 'warning' or 'missingRecipients'.
		// In case `type` === 'missingRecipients', `message` becomes array of missing recipients.
		Cryptodog.addToConversation = function (message, nickname, conversation, type) {
			var isme = nickname === Cryptodog.me.nickname;

			if (isme == true) { }
			else if (nickname === "PHOXY-SERVER") {
				isme = true;
			}
			else if (Cryptodog.buddies[nickname].ignored()) {
				return false;
			}

			if (isme == false) {
				var now = Math.round((new Date()).getTime() / 1000);
				var last = Cryptodog.buddies[nickname].last;

				// Remove spam
				if (message === last.message && now < (last.time + 3.8)) {
					log(nickname + " is spamming");
					return false;
				}

				last.message = message;
				last.time = now;
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
					Cryptodog.templates.fileLink, {
						id: Cryptodog.kommy.utils.randomHex(),
						dlLink: message,
						downloadFile: Cryptodog.locale["chatWindow"]["downloadFile"]
					}
				);
			}
			if (type === 'message') {
				if (!message.length) { return false }
				if (Cryptodog.allowSoundNotifications) {
					var mePing = Cryptodog.audio.mePing.cloneNode();
					var themPing = Cryptodog.audio.themPing.cloneNode();
					if (message === ".") {
						if (isme == true) {
							mePing.play();
						} else {
							themPing.play();
						}
					} else {
						if (isme == false) {
							Cryptodog.audio.newMessage.play();
						}
					}

				}

				if (isme == false) {
					Cryptodog.newMessageCount(++Cryptodog.me.newMessages);
					desktopNotification(notifImg, Cryptodog.me.nickname + "@" + Cryptodog.me.conversation, nickname + ": " + message, 7);
				}

				message = escapeHtml(message);
				message = Cryptodog.UI.addLinks(message);
				message = Cryptodog.UI.addEmoticons(message);
				if (message.startsWith("```")) {
					message = '<pre style="font-family: monospace;">' + message.replace("```", "") + "</pre>";
				}
			}

			if (type === 'warning') {
				if (!message.length) { return false }
				message = escapeHtml(message);
			}
			if (type === 'missingRecipients') {
				if (!message.length) { return false }
				message = message.join(', ');
				message = Mustache.render(Cryptodog.templates.missingRecipients, {
					text: Cryptodog.locale.warnings.missingRecipientWarning
						.replace('(NICKNAME)', message),
					dir: Cryptodog.locale.direction
				})
				conversationBuffers[conversation] += message;
				if (conversation === Cryptodog.me.currentBuddy) {
					$('#conversationWindow').append(message);
					$('.missingRecipients').last().animate({ 'top': '0', 'opacity': '1' }, 100);
					Cryptodog.UI.scrollDownConversation(400, true);
				}
				return true;
			}
			var authStatus = false;
			if (nickname !== "PHOXY-SERVER") {
				if ((nickname === Cryptodog.me.nickname) || Cryptodog.buddies[nickname].authenticated) {
					authStatus = true;
				}
			}
			message = message.replace(/:/g, '&#58;');
			var rendObj = {
				nickname: "PHOXY-SERVER",
				currentTime: currentTime(true),
				authStatus: "server",
				message: message,
				color: "#000"
			}

			if (nickname !== "PHOXY-SERVER") {
				rendObj.nickname = nickname.slice(0, 16);
				rendObj.authStatus = authStatus
				rendObj.color = Cryptodog.getUserColor(nickname)
			}

			var renderedMessage = Mustache.render(Cryptodog.templates.message, rendObj);

			conversationBuffers[conversation] += renderedMessage
			if (conversation === Cryptodog.me.currentBuddy) {
				$('#conversationWindow').append(renderedMessage);
				$('.line').last().animate({ 'top': '0', 'opacity': '1' }, 100);
				Cryptodog.UI.bindSenderElement($('.line').last().find('.sender'));
				Cryptodog.UI.scrollDownConversation(400, true);
			}
			else {
				$('#buddy-' + conversation).addClass('newMessage');
			}
		}

		// Show a preview for a received message from a buddy.
		// Message previews will not overlap and are removed after 5 seconds.
		Cryptodog.messagePreview = function (message, nickname) {
			var buddyElement = $('#buddy-' + Cryptodog.buddies[nickname].id);
			if (!buddyElement.attr('data-utip')) {
				if (message.length > 15) {
					message = message.substring(0, 15) + '…';
				}
				buddyElement.attr({
					'data-utip-gravity': 'sw',
					'data-utip': escapeHtml(message)
				}).mouseenter();
				window.setTimeout(function () {
					buddyElement.mouseleave()
					buddyElement.removeAttr('data-utip')
				}, 0x1337);
			}
		}

		// Buddy constructor
		var Buddy = function (nickname, id, status) {
			this.id = id
			this.fingerprint = null
			this.authenticated = false
			this.fileKey = null
			this.mpPublicKey = null
			this.mpFingerprint = null
			this.mpSecretKey = null
			this.nickname = nickname
			this.genFingerState = null
			this.status = status
			this.otr = Cryptodog.otr.add(nickname)
			this.color = randomColor({ luminosity: 'dark' })
			this.last = { message: "", time: 0 }
			this.ignored = function () {
				return Cryptodog.ignoredNicknames.indexOf(this.nickname) !== -1;
			};

			this.toggleIgnored = function () {
				if (this.ignored()) {
					Cryptodog.ignoredNicknames.splice(Cryptodog.ignoredNicknames.indexOf(this.nickname), 1);
					$('#buddy-' + this.id).removeClass('ignored');
				}
				else {
					Cryptodog.ignoredNicknames.push(this.nickname);
					$('#buddy-' + this.id).addClass('ignored');
				}
			};

			if (Cryptodog.isFiltered(this.nickname) && !this.ignored()) {
				console.log("Filtering user '" + this.nickname + "', as isFiltered() returned true.");
				this.toggleIgnored();
			}
		}

		Buddy.prototype = {
			constructor: Buddy,
			updateMpKeys: function (publicKey) {
				this.mpPublicKey = publicKey;
				this.mpFingerprint = Cryptodog.multiParty.genFingerprint(this.nickname);
				this.mpSecretKey = Cryptodog.multiParty.genSharedSecret(this.nickname);
			},
			updateAuth: function (auth) {
				var nickname = this.nickname;
				this.authenticated = auth;
				if (auth) {
					$('#authenticated').attr('data-active', true);
					$('#notAuthenticated').attr('data-active', false);
				}
				else {
					$('#authenticated').attr('data-active', false);
					$('#notAuthenticated').attr('data-active', true);
				}
				//for (var value in $('span').filterByData('sender', nickname)) {
				//	$(value).find('.authStatus').attr('data-auth', auth);
				//}
				$.each($('span').filterByData('sender', nickname),
					function (index, value) {
						$(value).find('.authStatus').attr('data-auth', auth);
					}
				);
				var authStatusBuffers = [
					'groupChat',
					Cryptodog.buddies[nickname].id
				];
				//for (var thisBuffer in authStatusBuffers) {
				//	var buffer = $(conversationBuffers[thisBuffer]);
				//	for (var value in buffer.find('span').filterByData('sender', nickname)) {
				//		$(value).find('.authStatus').attr('data-auth', auth);
				//	}
				//	conversationBuffers[thisBuffer] = $('<div>').append(buffer.clone()).html();
				//}
				$.each(authStatusBuffers, function (i, thisBuffer) {
					var buffer = $(conversationBuffers[thisBuffer])
					$.each(buffer.find('span').filterByData('sender', nickname),
						function (index, value) {
							$(value).find('.authStatus').attr('data-auth', auth)
						}
					)
					conversationBuffers[thisBuffer] = $('<div>').append(
						buffer.clone()
					).html()
				});

			}
		}

		// Build new buddy.
		Cryptodog.addBuddy = function (nickname, id, status) {
			if (!id) { id = getUniqueBuddyID() }
			var buddy = Cryptodog.buddies[nickname] = new Buddy(nickname, id, status)
			$('#buddyList').queue(function () {
				var buddyTemplate = Mustache.render(Cryptodog.templates.buddy, {
					buddyID: buddy.id,
					shortNickname: shortenString(nickname, 11),
					status: status
				})
				var placement = determineBuddyPlacement(nickname, id, status)
				$(buddyTemplate).insertAfter(placement).slideDown(100, function () {
					$('#buddy-' + buddy.id)
						.unbind('click')
						.click(function () {
							Cryptodog.onBuddyClick($(this))
						}
						)
					$('#menu-' + buddy.id).attr('status', 'inactive')
						.unbind('click')
						.click(function (e) {
							e.stopPropagation()
							openBuddyMenu(nickname)
						}
						)
					buddyNotification(nickname, true)
				})
			})
			$('#buddyList').dequeue()
			if (buddy.ignored()) {
				$('#buddy-' + buddy.id).addClass('ignored')
			}
			if (!ascii.test(buddy.nickname)) {
				$('#buddy-' + buddy.id).addClass('warning');
			}
		}

		// Set a buddy's status to `online` or `away`.
		Cryptodog.buddyStatus = function (nickname, status) {
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
		Cryptodog.removeBuddy = function (nickname) {
			var buddyID = Cryptodog.buddies[nickname].id;
			var buddyElement = $('.buddy').filterByData('id', buddyID);
			delete Cryptodog.buddies[nickname];
			if (!buddyElement.length) {
				return;
			}
			buddyElement.each(function () {
				$(this).attr('status', 'offline');
				buddyNotification(nickname, false);
				if (Cryptodog.me.currentBuddy === buddyID) {
					return;
				}
				$(this).remove();
			})
		}

		// Determine where to place a buddy in the buddy list
		// so the buddy list is in alphabetical order.
		var determineBuddyPlacement = function (nickname, id, status) {
			var buddies = [{
				nickname: nickname,
				id: id
			}]
			for (var i in Cryptodog.buddies) {
				if (Cryptodog.buddies.hasOwnProperty(i) && (Cryptodog.buddies[i].status === status)) {
					buddies.push({
						nickname: i,
						id: Cryptodog.buddies[i].id
					});
				}
			}
			buddies.sort(function (a, b) {
				var nameA = a.nickname.toLowerCase();
				var nameB = b.nickname.toLowerCase();
				if (nameA < nameB) {
					return -1;
				}
				if (nameA > nameB) {
					return 1;
				}
				return 0;
			})
			var rightBefore;
			for (var o = 0; o < buddies.length; o++) {
				if (buddies[o].id === id) {
					if (o === 0) {
						if (status === 'online') {
							rightBefore = '#buddiesOnline';
						}
						if (status === 'away') {
							rightBefore = '#buddiesAway';
						}
					}
					else {
						rightBefore = '[data-id=' + buddies[o - 1].id + ']';
					}
					break;
				}
			}
			return rightBefore;
		}

		// Get a buddy's nickname from their ID.
		Cryptodog.getBuddyNicknameByID = function (id) {
			for (var i in Cryptodog.buddies) {
				if (Cryptodog.buddies.hasOwnProperty(i)) {
					if (Cryptodog.buddies[i].id === id) {
						return i;
					}
				}
			}
		}

		// Bind buddy click actions.
		Cryptodog.onBuddyClick = function (buddyElement) {
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
			$('#conversationWindow').html(conversationBuffers[id]);
			Cryptodog.UI.bindSenderElement();
			Cryptodog.UI.scrollDownConversation(0, false);
			$('#userInputText').focus();
			$('#buddy-' + id).addClass('currentConversation');
			// Clean up finished conversations.
			$('#buddyList div').each(function () {
				if ($(this).attr('data-id') !== id) {
					$(this).removeClass('currentConversation');
					if (!$(this).hasClass('newMessage') && ($(this).attr('status') === 'offline')) {
						$(this).slideUp(500, function () { $(this).remove() });
					}
				}
			})
			$('#conversationWindow').children().addClass('visibleLine');
		}

		// Display buddy information, including fingerprints and authentication.
		Cryptodog.displayInfo = function (nickname) {
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
			ensureOTRdialog(nickname, false, function () {
				if (isMe) {
					Cryptodog.UI.dialogBox(infoDialog, {
						height: 250,
						closeable: true
					});
				}
				else {
					var authTutorial = Mustache.render(Cryptodog.templates.authTutorial, {
						nickname: nickname,
						phrase1: Cryptodog.locale.auth.authPhrase1,
						phrase2: Cryptodog.locale.auth.authPhrase2,
						phrase3: Cryptodog.locale.auth.authPhrase3,
						phrase4: Cryptodog.locale.auth.authPhrase4,
						phrase5: Cryptodog.locale.auth.authPhrase5
					});
					Cryptodog.UI.dialogBox(infoDialog, {
						height: 430,
						closeable: true,
						onAppear: function () {
							$('#authTutorial').html(authTutorial)
						}
					});
					bindAuthDialog(nickname);
				}
				$('#otrFingerprint').text(getFingerprint(nickname, true));
				$('#multiPartyFingerprint').text(getFingerprint(nickname, false));
			})
		}

		// Executes on user logout.
		Cryptodog.logout = function () {
			Cryptodog.socket.loggedOut = true;
			Cryptodog.UI.logout();
			Cryptodog.loginError = false;
			Cryptodog.socket.quit()
			Cryptodog.socket.conn = null;

			for (var b in Cryptodog.buddies) {
				if (Cryptodog.buddies.hasOwnProperty(b)) {
					delete Cryptodog.buddies[b];
				}
			}

			conversationBuffers = {};
		}

		Cryptodog.prepareAnswer = function (answer, ask, buddyMpFingerprint) {
			var first, second;
			answer = answer.toLowerCase().replace(/(\s|\.|\,|\'|\"|\;|\?|\!)/, '');
			if (buddyMpFingerprint) {
				first = ask ? Cryptodog.me.mpFingerprint : buddyMpFingerprint;
				second = ask ? buddyMpFingerprint : Cryptodog.me.mpFingerprint;
				answer += ';' + first + ';' + second;
			}
			return answer;
		}

		Cryptodog.changeStatus = function (status) {
			if (status === 'away' || status === 'online') {
				Cryptodog.socket.currentStatus = status;
				Cryptodog.socket.sendStatus();
			}
		}

		/*
		-------------------
		PRIVATE INTERFACE FUNCTIONS
		-------------------
		*/

		// Outputs the current hh:mm.
		// If `seconds = true`, outputs hh:mm:ss.
		var currentTime = function (seconds) {
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
		var initializeConversationBuffer = function (id) {
			if (!conversationBuffers.hasOwnProperty(id)) {
				conversationBuffers[id] = '';
			}
		}

		// Get a unique buddy identifier.
		var getUniqueBuddyID = function () {
			var buddyID = Cryptodog.random.encodedBytes(16, CryptoJS.enc.Hex);
			for (var b in Cryptodog.buddies) {
				if (Cryptodog.buddies.hasOwnProperty(b)) {
					if (Cryptodog.buddies[b].id === buddyID) {
						return getUniqueBuddyID();
					}
				}
			}
			return buddyID;
		}

		// Simply shortens a string `string` to length `length.
		// Adds '..' to delineate that string was shortened.
		var shortenString = function (string, length) {
			if (string.length > length) {
				return string.substring(0, (length - 2)) + '…';
			}
			return string;
		}

		// Get a fingerprint, formatted for readability.
		var getFingerprint = function (nickname, OTR) {
			var buddy = Cryptodog.buddies[nickname],
				isMe = nickname === Cryptodog.me.nickname,
				fingerprint;

			if (OTR) {
				fingerprint = isMe
					? Cryptodog.me.otrKey.fingerprint()
					: fingerprint = buddy.fingerprint;
			} else {
				fingerprint = isMe
					? Cryptodog.me.mpFingerprint
					: buddy.mpFingerprint;
			}

			var formatted = '';
			for (var i in fingerprint) {
				if (fingerprint.hasOwnProperty(i)) {
					if ((i !== 0) && (i % 8) === 0) {
						formatted += ' ';
					}
					formatted += fingerprint[i];
				}
			}
			return formatted.toUpperCase();
		}

		// Bind `nickname`'s authentication dialog buttons and options.
		var bindAuthDialog = function (nickname) {
			var buddy = Cryptodog.buddies[nickname]
			if (Cryptodog.buddies[nickname].authenticated) {
				buddy.updateAuth(true);
			}
			else {
				buddy.updateAuth(false);
			}
			$('#authenticated').unbind('click').bind('click', function () {
				buddy.updateAuth(true);
			})
			$('#notAuthenticated').unbind('click').bind('click', function () {
				buddy.updateAuth(false);
			})
			// If the current locale doesn't have the translation
			// for the auth slides yet, then don't display the option
			// for opening the auth tutorial.
			// This is temporary until all translations are ready.
			// — Nadim, March 29 2014
			if (Cryptodog.locale.language !== 'en' && Cryptodog.locale.auth.learnMoreAuth === 'Learn more about authentication') {
				$('#authLearnMore').hide();
			}
			$('#authLearnMore').unbind('click').bind('click', function () {
				if ($(this).attr('data-active') === 'true') {
					$('#authTutorial').fadeOut(function () {
						$('#authLearnMore').attr('data-active', 'false')
							.text(Cryptodog.locale.auth.learnMoreAuth);
						$('.authInfo').fadeIn();
					})
				}
				else {
					$('.authInfo').fadeOut(function () {
						$('#authLearnMore').attr('data-active', 'true')
							.text(Cryptodog.locale.chatWindow.cont);
						$('#authTutorial').fadeIn();
					});
				}
			})
			$('#authSubmit').unbind('click').bind('click', function (e) {
				e.preventDefault();
				var question = $('#authQuestion').val();
				var answer = $('#authAnswer').val();
				if (answer.length === 0) {
					return;
				}
				$('#authSubmit').val(Cryptodog.locale.chatWindow.asking);
				$('#authSubmit').unbind('click').bind('click', function (e) {
					e.preventDefault();
				})
				buddy.updateAuth(false);
				answer = Cryptodog.prepareAnswer(answer, true, buddy.mpFingerprint);
				buddy.otr.smpSecret(answer, question);
			})
		}

		var currentNotifications = [];

		var handleNotificationTimeout = function () {
			var removalIndexes = [];
			currentNotifications.forEach(function (element) {
				element.timeout -= 1;
				if (element.timeout <= 0) {
					element.notification.close();
					log("expiring notification");
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
				//log("Truncating notification");
				return msg.substring(0, 50) + "…";
			}
			return msg;
		}

		var desktopNotification = function (image, title, body, timeout) {
			if (Cryptodog.me.windowFocus) {
				//log("tried to show desktop notif, but window had focus");
				return false;
			}
			if (!Cryptodog.desktopNotifications) {
				//log("tried to show desktop notif, but notifs are off");
				return false;
			}
			var notificationStatus = Notification.permission;
			log("showing desktop notif, status is '" + notificationStatus + "', title is: " + title)
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
			else if (notificationStatus == "default" || notificationStatus == null || notificationStatus == "") {
				// request permission
				Notification.requestPermission();
			}
		}

		// Add a join/part notification to the conversation window.
		// If 'join === true', shows join notification, otherwise shows part.
		var buddyNotification = function (nickname, join) {
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
			conversationBuffers['groupChat'] += status;
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
		var sendFile = function (nickname) {
			var sendFileDialog = Mustache.render(Cryptodog.templates.sendFile, {
				sendEncryptedFile: Cryptodog.locale['chatWindow']['sendEncryptedFile'],
				fileTransferInfo: Cryptodog.locale['chatWindow']['fileTransferInfo']
			});
		}

		// If OTR fingerprints have not been generated, show a progress bar and generate them.
		var ensureOTRdialog = function (nickname, close, cb) {
			var buddy = Cryptodog.buddies[nickname];
			if (nickname === Cryptodog.me.nickname || buddy.fingerprint) {
				return cb();
			}

			Cryptodog.UI.progressBarOTR()

			$('#progressBar').css('margin', '70px auto 0 auto')
			$('#fill').animate({ 'width': '100%', 'opacity': '1' }, 10000, 'linear')
			// add some state for status callback
			buddy.genFingerState = { close: close, cb: cb }
			buddy.otr.sendQueryMsg()
		}

		// Open a buddy's contact list context menu.
		var openBuddyMenu = function (nickname) {
			var buddy = Cryptodog.buddies[nickname],
				chatWindow = Cryptodog.locale.chatWindow,
				ignoreAction = chatWindow[buddy.ignored() ? 'unignore' : 'ignore'],
				$menu = $('#menu-' + buddy.id),
				$buddy = $('#buddy-' + buddy.id);
			if ($menu.attr('status') === 'active') {
				$menu.attr('status', 'inactive');
				$menu.css('background-image', 'url("img/icons/circle-down.svg")');
				$buddy.animate({ 'height': 15 }, 190);
				$('#' + buddy.id + '-contents').fadeOut(200, function () {
					$(this).remove();
				});
				return;
			}
			$menu.attr('status', 'active');
			$menu.css('background-image', 'url("img/icons/circle-up.svg")');
			$buddy.delay(10).animate({ 'height': 130 }, 180, function () {
				$buddy.append(
					Mustache.render(Cryptodog.templates.buddyMenu, {
						buddyID: buddy.id,
						sendEncryptedFile: chatWindow.sendEncryptedFile,
						displayInfo: chatWindow.displayInfo,
						ignore: ignoreAction
					})
				);
				var $contents = $('#' + buddy.id + '-contents');
				$contents.fadeIn(200);
				$contents.find('.option1').click(function (e) {
					e.stopPropagation();
					Cryptodog.displayInfo(nickname);
					$menu.click();
				});
				$contents.find('.option2').click(function (e) {
					e.stopPropagation();
					sendFile(nickname);
					$menu.click();
				});
				$contents.find('.option3').click(function (e) {
					e.stopPropagation();
					buddy.toggleIgnored();
					$menu.click();
				});
			})
		}

		// Check for nickname completion.
		// Called when pressing tab in user input.
		var nicknameCompletion = function (input) {
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
						log("completion: " + err);
					}
				}
			}
			var largest = potentials[0];

			// find item with largest score
			potentials.forEach(function (item) {
				if (item.score > largest.score) {
					largest = item;
				}
			}, this);

			log("completion.matcher: score=" + largest.score + ", value=" + largest.value)
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
		Cryptodog.getUserColor = function (nickname) {
			return nickname === Cryptodog.me.nickname ? Cryptodog.me.color : Cryptodog.buddies[nickname].color;
		}

		// Handle new message count
		Cryptodog.newMessageCount = function (count) {
			if (Cryptodog.me.windowFocus) {
				Cryptodog.me.newMessages = 0;
				// clear notifications
				currentNotifications.forEach(function (element) {
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
				else if (count >= 1) {
					document.title = document.title.replace(prevCount[0], '(' + count + ') ');
				}
			}
			else {
				if (count <= 0) { return }
				else if (count >= 1) {
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
		$('#userInput').submit(function () {
			var body = $.trim($('#userInputText').val())
			var message = JSON.stringify({
				type: "message",
				body: body
			});

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
					if (typeof (ciphertext['text'][i]) !== 'object') {
						missingRecipients.push(i);
					}
				}
				if (missingRecipients.length) {
					Cryptodog.addToConversation(
						missingRecipients, Cryptodog.me.nickname,
						'groupChat', 'missingRecipients'
					);
				}

				Cryptodog.socket.send({
					type: "groupchat",
					chatroom: Cryptodog.me.conversation,
					object: ciphertext
				});
			}
			Cryptodog.addToConversation(
				body, Cryptodog.me.nickname,
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
		$('#userInputText').keydown(function (e) {
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
				Cryptodog.socket.send({
					type: type,
					chatroom: Cryptodog.me.conversation,
					nickname: destination,
					object: {
						type: "composing"
					}
				});

				window.setTimeout(function (d, t) {
					Cryptodog.me.composing = false;
					Cryptodog.socket.send({
						type: t,
						chatroom: Cryptodog.me.conversation,
						nickname: d,
						object: {
							type: "paused"
						}
					});
				}, 1800, destination, type);
			}
		})

		$('#userInputText').keyup(function (e) {
			if (e.keyCode === 13) {
				e.preventDefault();
			}
		})

		$('#userInputSubmit').click(function () {
			$('#userInput').submit();
			$('#userInputText').select();
		})

		// Language selector.
		$('#languageSelect').click(function () {
			$('#customServerDialog').hide();
			$('#languages li').css({ 'color': '#FFF', 'font-weight': 'normal' });
			$('[data-locale=' + Cryptodog.locale['language'] + ']').css({
				'color': '#CCC',
				'font-weight': 'bold'
			});
			$('#footer').animate({ 'height': 190 }, function () {
				$('#languages').fadeIn();
			});
			$('#languages li').click(function () {
				var lang = $(this).attr('data-locale');
				$('#languages').fadeOut(200, function () {
					Cryptodog.locale.set(lang, true);
					Cryptodog.storage.setItem('language', lang);
					$('#footer').animate({ 'height': 14 });
				});
			})
		})

		// Login form.
		$('#conversationName').click(function () {
			$(this).select();
		})
		$('#nickname').click(function () {
			$(this).select();
		})
		$('#CryptodogLogin').submit(function () {
			// Don't submit if form is already being processed.
			if (($('#loginSubmit').attr('readonly') === 'readonly')) {
				return false;
			}

			//Check validity of conversation name and nickname.
			$('#conversationName').val($.trim($('#conversationName').val().toLowerCase()));
			if ($('#nickname').val().indexOf(':') < 0) {
				$('#nickname').val($.trim($('#nickname').val().toLowerCase()));
			}

			var nval = $('#nickname').val();
			var nick = "";
			var pass = "";

			var nvals = nval.split(":");
			if (nvals.length > 0) {
				nick = nvals[0];
			}

			if (nvals.length > 1) {
				pass = nvals[1];
			}

			Cryptodog.me.nickname = nick;
			Cryptodog.me.api_key = pass;

			if ($('#conversationName').val() === '') {
				Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['enterConversation']);
				$('#conversationName').select();
			}
			else if (!$('#conversationName').val().match(/^\w{1,20}$/)) {
				Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['conversationAlphanumeric']);
				$('#conversationName').select();
			}
			else if (nick === "") {
				Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['enterNickname']);
				$('#nickname').select();
			}
			else if (nick.match(/^\w{1,40}$/) == null && pass === "") {
				Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['nicknameAlphanumeric']);
				$('#nickname').select();
			}
			// Prepare keys and connect.
			else {
				$('#loginSubmit,#conversationName,#nickname').attr('readonly', 'readonly');
				Cryptodog.socket.showKeyPreparationDialog(function () {
					Cryptodog.me.color = randomColor({ luminosity: 'dark' });
					Cryptodog.socket.connect();
				});
			}
			return false;
		})

		Cryptodog.UI.userInterfaceBindings();

		Cryptodog.UI.windowEventBindings();

		Cryptodog.UI.show();

	})
}
