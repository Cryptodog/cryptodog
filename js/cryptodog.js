if (typeof Cryptodog === 'undefined') { Cryptodog = function() {} }

/*
-------------------
GLOBAL VARIABLES
-------------------
*/

Cryptodog.version = '2.6.0';

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

Cryptodog.colors  = {};
Cryptodog.buddies = {};

// For persistent authentication.
Cryptodog.authList = {};

// For persistent ignores.
Cryptodog.ignoredNicknames = [];

// Toggle for audio notifications
Cryptodog.allowSoundNotifications = false;

// Sounds
Cryptodog.audio = {
	newMessage: new Audio("snd/msgGet.mp3"),
	userJoin: new Audio("snd/userJoin.mp3"),
	userLeave: new Audio("snd/userLeave.mp3"),
	rtcConnect: new Audio("snd/rtcConnect.mp3"),
	rtcDisconnect: new Audio("snd/rtcDisconnect.mp3")
};

// image used for notifications
var notifImg = "img/logo-128.png";

Notification.requestPermission(function(permission){
	log("asked for notification permission, got '" + permission + "'");
});

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

// Seed RNG.
Cryptodog.random.setSeed(Cryptodog.random.generateSeed());

var conversationArrays = {};

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

// Stores list of authenticated buddies with associated fingerprints.
Cryptodog.storeAuthList = function() {
	if (!Cryptodog.persist) {
		return;
	}

	Cryptodog.storage.setItem("authList", Cryptodog.authList);
}

// Load persistence
Cryptodog.storage.getItem('persistenceEnabled', function(e) {
	if (e) {
		Cryptodog.persist = true;

		Cryptodog.storage.getItem('authList', function(al) {
			var a = al || {};
			Cryptodog.authList = a;
		});

	} else {
		Cryptodog.persist = false;
	}
});

fetch("config.json")
.then(function(resp) {
	return resp.json();
})
.then(function(cfg) {
	Cryptodog.bex.mods = cfg.mods || [];
})
.catch(function(err){});

window.addEventListener("load", function() {
	document.querySelector("#changeColorBtn").addEventListener("change", function(e) {
		var color = e.target.value;
		var tst   = /^\#[a-fA-F0-9]{6}$/
	
		if (tst.test(color) == false) {
			alert("Invalid color: " + color);
			return;
		}
	
		Cryptodog.changeBuddyColor(Cryptodog.me.nickname, color);
		Cryptodog.storage.setItem("color", color);
		document.querySelector("#changeColorBtn").value = color;
	});

	// Check if WebRTC is supported by the browser.
	// If so, add some UI buttons.
	if (Cryptodog.bex.rtcSupport()) {
		$("#optionButtons").prepend(
			`<img
				class="button"
				id="micToggleBtn"
				src="img/icons/mic-none.svg"
				alt=""
				data-utip-gravity="sw"
				data-utip="` + Cryptodog.bex.strings.noMic + `" />
			
			<img
				class="button"
				id="voiceChatBtn"
				src="img/icons/voice-disconnected.svg"
				alt=""
				data-connected="false"
				data-utip-gravity="sw"
				data-utip="` + Cryptodog.bex.strings.voiceDisconnected + `" />`);
				
		Cryptodog.bex.micState   = "none";
		Cryptodog.bex.rtcEnabled = false;

		$("#voiceChatBtn").utip();
		$("#micToggleBtn").utip();

		$("#voiceChatBtn").click(function() {
			var $this = this;
			if ($($this).attr("data-connected") == "true") {
				Cryptodog.audio.rtcDisconnect.play();
				Cryptodog.bex.rtcEnabled = false;
				Cryptodog.bex.disconnectRTCVoiceChat();
				$($this).attr("data-utip", Cryptodog.bex.strings.voiceDisconnected);
				$($this).attr("data-connected", "false");
				$($this).attr("src", "img/icons/voice-disconnected.svg");
				$($this).mouseenter();
				return;
			}

			Cryptodog.bex.rtcEnabled = true;
			Cryptodog.bex.initRTCVoiceChat(Cryptodog.bex.voiceStream);
			Cryptodog.audio.rtcConnect.play();
			$($this).attr("data-utip", Cryptodog.bex.strings.voiceConnected);
			$($this).attr("data-connected", "true");
			$($this).attr("src", "img/icons/voice-connected.svg");
			$($this).mouseenter();
		});

		$("#micToggleBtn").click(function() {
			var $this = this;

			if (Cryptodog.bex.micState == "none") {
				var voiceSetup = false;

				function setupVoice(stream) {
					voiceSetup = true;
					if (stream) {
						Cryptodog.bex.voiceStream = stream;
						// if we are connected to our buddies as RTC peers,
						// we need to send them this new mic stream by re-negotiating our RTCPeerConnections.
						if (Cryptodog.bex.rtcEnabled) {
							Cryptodog.bex.initRTCVoiceChat(stream);
						}

						$($this).attr("data-utip", Cryptodog.bex.strings.unmutedMic);
						$($this).attr("src", "img/icons/mic-unmuted.svg");
						$($this).mouseenter();
						Cryptodog.bex.micState = "unmuted";
					}
				}

				function onStream(micStream) {
					setupVoice(micStream);
				}

				function onStreamError(micError) {
					console.warn(micError);
					alert("No microphone found: check console.");
					setupVoice();
				}

				// Asks the user for permission
				navigator.mediaDevices.getUserMedia({
					audio: {
						noiseSuppression: true
					},

					video: false
				})
				.then(onStream)
				.catch(onStreamError);
				return;
			} 

			// mute
			if (Cryptodog.bex.micState == "unmuted") {
				Cryptodog.bex.micState = "muted";
				Cryptodog.bex.voiceStream.getAudioTracks()[0].enabled = false;
				$($this).attr("data-utip", Cryptodog.bex.strings.mutedMic);
				$($this).attr("src", "img/icons/mic-muted.svg");
				$($this).mouseenter();
				return;
			}

			// unmute
			if (Cryptodog.bex.micState == "muted") {
				Cryptodog.bex.micState = "unmuted";
				Cryptodog.bex.voiceStream.getAudioTracks()[0].enabled = true;
				$($this).attr("data-utip", Cryptodog.bex.strings.unmutedMic);
				$($this).attr("src", "img/icons/mic-unmuted.svg");
				$($this).mouseenter();

				return;
			}
		});
	}

	$("body").on("dragenter dragstart dragend dragleave dragover drag drop", function (e) {
    e.preventDefault();
	});

	// Drag & drop file transfer
	$("body").on("dragover", function() {
		if (Cryptodog.xmpp.connection === null) return;
		$("#bubbleWrapper").addClass("dragover");
		$("#addFileIcon").removeClass("invisible");
	});

	$("body").on("dragleave", function() {
		if (Cryptodog.xmpp.connection === null) return;
		$("#bubbleWrapper").removeClass("dragover");
		$("#addFileIcon").addClass("invisible");
	});

	$("body").on("drop", function(ev) {
		if (Cryptodog.xmpp.connection === null) return;

		var items = ev.originalEvent.dataTransfer.files;
		if (items) {
			for (var i = 0; i < items.length; i++) {
				Cryptodog.fileTransfer.readFile(items[i]);
			}
		}

		$("#bubbleWrapper").removeClass("dragover");
		$("#addFileIcon").addClass("invisible");
	});

	// Upload button
	var fbtn = document.querySelector("#uploadFileBtn");

	// Ask OS to to hide unacceptable files from the upload menu
	var accept = Object.keys(Cryptodog.bex.mimeExtensions).join(",");
	fbtn.setAttribute("accept", accept);

	fbtn.addEventListener("change", function() {
		var file   = fbtn.files[0];

		Cryptodog.fileTransfer.readFile(file);
	});

	// Show whether a user is speaking based on audio stream levels.
	window.setInterval(Cryptodog.bex.updateLevelDisplay, 128);
});

// Add a `message` from `nickname` to the `conversation` display and log.
// `type` can be 'file', 'message', 'warning' or 'missingRecipients'.
// In case `type` === 'missingRecipients', `message` becomes array of missing recipients.
Cryptodog.addToConversation = function(message, nickname, conversation, type) {
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
		message = Cryptodog.UI.addEmoticons(message);
		message = message.replace(/:/g, '&#58;');

		pushAndRedraw(conversation, {
			type:    "message",
			nickname: nickname,
			message:  message,
			time:     currentTime(true),
			color:    Cryptodog.getUserColor(nickname)
		});

		if (conversation === Cryptodog.me.currentBuddy) {
			Cryptodog.UI.scrollDownConversation(400, true);
		}
		else {
			$('#buddy-' + conversation).addClass('newMessage');
		}
		return true;
	}
	if (type === 'warning') {
		if (!message.length) { return false }
		message = Strophe.xmlescape(message);
		pushAndRedraw(conversation, {
			type:    "warning",
			nickname: nickname,
			message:  message,
			time:     currentTime(true),
			color:    Cryptodog.getUserColor(nickname)
		});
		return true;
	}
	if (type === 'missingRecipients') {
		if (!message.length) { return false }
		message = message.join(', ');
		pushAndRedraw(conversation, {
			type:    "missingRecipients",
			message:  message
		})
		if (conversation === Cryptodog.me.currentBuddy) {
			Cryptodog.UI.scrollDownConversation(400, true);
		}
		return true;
	}
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

// Buddy constructor
var Buddy = function(nickname, id, status) {
	this.id             = id
	this.fingerprint    = null
	this.authenticated  = 0
	this.fileKey        = null
	this.mpPublicKey    = null
	this.mpFingerprint  = null
	this.mpSecretKey    = null
	this.nickname       = nickname
	this.genFingerState = null
	this.status         = status
	this.otr            = Cryptodog.otr.add(nickname)
	this.color          = Cryptodog.colors[nickname] || "#000000"
	this._sentPublicKey = false;
	this.dispatchedConnect = false;
	
	// Regularly reset at the interval defined by Cryptodog.maxMessageInterval
	this.messageCount   = 0
	this.ignored        = function() {
		return Cryptodog.ignoredNicknames.indexOf(this.nickname) !== -1;
	};
	
	this.toggleIgnored = function() {
		if (this.ignored()) {
			Cryptodog.ignoredNicknames.splice(Cryptodog.ignoredNicknames.indexOf(this.nickname), 1);
			$('#buddy-' + this.id).removeClass('ignored');
			if (Cryptodog.bex.rtcEnabled) {
				Cryptodog.bex.connectStreamToPeer(this.nickname, Cryptodog.bex.voiceStream);
			}
		}
		else {
			Cryptodog.ignoredNicknames.push(this.nickname);
			$('#buddy-' + this.id).addClass('ignored');
			if (this.rtc) {
				this.rtc.tracks.forEach(function(track) {
					track.pause();
					track = null;
				});

				this.rtc.rtcConn.close();
			}
		}
	};

	if (Cryptodog.isFiltered(this.nickname) && !this.ignored()) {
		console.log("Filtering user '" + this.nickname + "', as isFiltered() returned true.");
		this.toggleIgnored();
	}
}

Buddy.prototype = {
	constructor: Buddy,

	dispatchConnect: function() {
		if (this.dispatchedConnect === true) {
			return;
		}

		this.dispatchedConnect = true;

		if (this._onConnect) {
			this._onConnect();
		}
	},

	onConnect: function(cb) {
		this._onConnect = cb;
	},

	updateIcons: function() {
		var budIcon = $('#buddy-' + this.id);
		if (this.authenticated === 2) {
			budIcon.addClass('isMod');
			return;
		} else {
			budIcon.removeClass('isMod');
		}

		if (this.bot) {
			budIcon.addClass('isBot');
		} else {
			budIcon.removeClass('isBot');
		}
	},

	// sets a buddy's icon to indicate they're a bot
	setBot: function(bool) {
		this.bot = bool;
		this.updateIcons();
	},
	updateMpKeys: function(publicKey) {
		this.mpPublicKey = publicKey;
		this.mpFingerprint = Cryptodog.multiParty.genFingerprint(this.nickname);
		this.mpSecretKey = Cryptodog.multiParty.genSharedSecret(this.nickname);
	},
	updateAuth: function(auth, dontTouchList) {
		var nickname = this.nickname;
		var bd = this;

		if (Cryptodog.persist) {
			if (!dontTouchList) {
				if (auth) {
					Cryptodog.ensureOTRdialog(nickname, false, function() {
						Cryptodog.authList[nickname] = {
							mp:    bd.mpFingerprint,
							otr:   bd.fingerprint,
							level: auth
						}
						Cryptodog.storeAuthList();
					}, true);
				} else {
					delete Cryptodog.authList[this.nickname];
					Cryptodog.storeAuthList();
				}
			}
		}

		this.authenticated = auth;
		if (auth) {
			$('#authenticated').attr('data-active', true);
			$('#notAuthenticated').attr('data-active', false);
		}
		else {
			$('#authenticated').attr('data-active', false);
			$('#notAuthenticated').attr('data-active', true);
		}

		var authStatusBuffers = [
			'groupChat',
			Cryptodog.buddies[nickname].id
		];

		this.updateIcons();

		redrawConversation(Cryptodog.me.currentBuddy);
	}
}

Cryptodog.transmitMyColor = function() {
	Cryptodog.bex.transmitGroup([{
			header: Cryptodog.bex.op.SET_COLOR, 
			color:  Cryptodog.me.color}]);
}

Cryptodog.changeBuddyColor = function(nickname, color) {
	if (nickname == Cryptodog.me.nickname) {
		// Propagate color to other users
		Cryptodog.me.color = color;
		Cryptodog.transmitMyColor();

		// Display the new color
		redrawConversation(Cryptodog.me.currentBuddy);
		return;
	}

	if (Cryptodog.buddies[nickname]) {
		Cryptodog.buddies[nickname].color = color;
		Cryptodog.colors[nickname] = color;
		redrawConversation(Cryptodog.me.currentBuddy);
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
	if (buddy.ignored()){
		$('#buddy-' + buddy.id).addClass('ignored')
	}

	// Display a warning icon if the nickname has Unicode characters or leading/trailing whitespace
	if (!ascii.test(buddy.nickname) || buddy.nickname.trim() !== buddy.nickname) {
		$('#buddy-' + buddy.id).addClass('warning');
	}

	if (Cryptodog.persist && Cryptodog.authList[nickname]) {
			Cryptodog.ensureOTRdialog(nickname, false, function() {
				if (Cryptodog.authList[nickname]) {
					if (buddy.mpFingerprint == Cryptodog.authList[nickname].mp
					 && buddy.fingerprint   == Cryptodog.authList[nickname].otr) {
						buddy.updateAuth(Cryptodog.authList[nickname].level, true);
					}
				}
			}, true);
	}
}

// Set a buddy's status to `online` or `away`.
Cryptodog.buddyStatus = function(nickname, status) {
	if (typeof Cryptodog.buddies[nickname] == 'undefined') {
		return;
	}
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
	if (!Cryptodog.buddies[nickname]) {
		return;
	}
	if (Cryptodog.buddies[nickname].rtc) {
		Cryptodog.buddies[nickname].rtc.rtcConn.close();
		if (Cryptodog.buddies[nickname].rtc.meter) {
			Cryptodog.buddies[nickname].rtc.meter.stop();
		}
		Cryptodog.buddies[nickname].rtc = null;
	}
	var buddyID = Cryptodog.buddies[nickname].id;
	var buddyElement = $('.buddy').filterByData('id', buddyID);
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

// Determine where to place a buddy in the buddy list
// so the buddy list is in alphabetical order.
var determineBuddyPlacement = function(nickname, id, status) {
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
	buddies.sort(function(a, b) {
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
	initializeConversationArray(id);
	// Switch currently active conversation.
	redrawConversation(id);

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

// Display buddy information, including fingerprints and authentication.
Cryptodog.displayInfo = function(nickname) {
	var isMe = nickname === Cryptodog.me.nickname,
		infoDialog = isMe ? 'myInfo' : 'buddyInfo',
		chatWindow = Cryptodog.locale.chatWindow
	infoDialog = Mustache.render(Cryptodog.templates[infoDialog], {
		nickname: nickname,
		authenticated:      Cryptodog.locale.auth.authenticated + ':',
		learnMoreAuth:      Cryptodog.locale.auth.learnMoreAuth,
		otrFingerprint:     chatWindow.otrFingerprint,
		groupFingerprint:   chatWindow.groupFingerprint,
		authenticate:       chatWindow.authenticate,
		verifyUserIdentity: chatWindow.verifyUserIdentity,
		secretQuestion:     chatWindow.secretQuestion,
		secretAnswer:       chatWindow.secretAnswer,
		ask:                chatWindow.ask,
		identityVerified:   chatWindow.identityVerified
	})
	Cryptodog.ensureOTRdialog(nickname, false, function() {
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
				onAppear: function() {
					$('#authTutorial').html(authTutorial)
				}
			});
			bindAuthDialog(nickname);
		}
		$('#otrFingerprint').text(getFingerprint(nickname, true));
		$('#multiPartyFingerprint').text(getFingerprint(nickname, false));

		Cryptodog.storage.getItem('persistenceEnabled', function(e) {
			if (e) {
				Cryptodog.persist = true;
				$('#optIntoPersistence').prop('checked', true);
			} else {
				Cryptodog.persist = false;
				$('#optIntoPersistence').prop('checked', false);
			}
		});

		$('#optIntoPersistence').click(function() {
			if (Cryptodog.persist) {
				$('#optIntoPersistence').prop('checked', false);
				Cryptodog.storage.removeItem('persistenceEnabled');
				Cryptodog.storage.removeItem('authList');
				Cryptodog.persist = false;
			} else {
				Cryptodog.persist = true;
				$('#optIntoPersistence').prop('checked', true);
				Cryptodog.storage.setItem('persistenceEnabled', {
					'enabled': true,
					'mp':      BigInt.bigInt2base64(Cryptodog.me.mpPrivateKey, 32),
					'otr':     Cryptodog.me.otrKey.packPrivate()
				});
			}
		});
	})
}

// Executes on user logout.
Cryptodog.logout = function() {
	Cryptodog.bex.disconnectRTCVoiceChat();
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

	conversationArrays = {};
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

Cryptodog.currentTime = currentTime;

// Initializes a conversation buffer. Internal use.
var initializeConversationArray = function(id) {
	if (!conversationArrays.hasOwnProperty(id)) {
		conversationArrays[id] = [];
	}
}

// Get a unique buddy identifier.
var getUniqueBuddyID = function() {
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
var shortenString = function(string, length) {
	if (string.length > length) {
		return string.substring(0, (length - 2)) + '…';
	}
	return string;
}

// Get a fingerprint, formatted for readability.
var getFingerprint = function(nickname, OTR) {
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
var bindAuthDialog = function(nickname) {
	var buddy = Cryptodog.buddies[nickname]
	// May be equivalent to 2 (Moderator status!)
	if (Cryptodog.buddies[nickname].authenticated) {
		buddy.updateAuth(Cryptodog.buddies[nickname].authenticated);
	}
	else {
		buddy.updateAuth(0);
	}
	$('#authenticated').unbind('click').bind('click', function() {
		buddy.updateAuth(1);
	})
	$('#notAuthenticated').unbind('click').bind('click', function() {
		buddy.updateAuth(0);
	})
	// If the current locale doesn't have the translation
	// for the auth slides yet, then don't display the option
	// for opening the auth tutorial.
	// This is temporary until all translations are ready.
	// — Nadim, March 29 2014
	if (Cryptodog.locale.language !== 'en' && Cryptodog.locale.auth.learnMoreAuth === 'Learn more about authentication') {
		$('#authLearnMore').hide();
	}
	$('#authLearnMore').unbind('click').bind('click', function() {
		if ($(this).attr('data-active') === 'true') {
			$('#authTutorial').fadeOut(function() {
				$('#authLearnMore').attr('data-active', 'false')
					.text(Cryptodog.locale.auth.learnMoreAuth);
				$('.authInfo').fadeIn();
			})
		}
		else {
			$('.authInfo').fadeOut(function() {
				$('#authLearnMore').attr('data-active', 'true')
					.text(Cryptodog.locale.chatWindow.cont);
				$('#authTutorial').fadeIn();
			});
		}
	})
	$('#authSubmit').unbind('click').bind('click', function(e) {
		e.preventDefault();
		var question = $('#authQuestion').val();
		var answer = $('#authAnswer').val();
		if (answer.length === 0) {
			return;
		}
		$('#authSubmit').val(Cryptodog.locale.chatWindow.asking);
		$('#authSubmit').unbind('click').bind('click', function(e) {
			e.preventDefault();
		})
		buddy.updateAuth(0);
		answer = Cryptodog.prepareAnswer(answer, true, buddy.mpFingerprint);
		buddy.otr.smpSecret(answer, question);
	})
}

var currentNotifications = [];

var handleNotificationTimeout = function() {
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
		return msg.substring(0,50) + "…";
	}
	return msg;
}

var desktopNotification = function(image, title, body, timeout) {
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
	else if (notificationStatus == "default" || notificationStatus == null || notificationStatus == "")
	{
		// request permission
		Notification.requestPermission();
	}
}

// Add a join/part notification to the conversation window.
// If 'join === true', shows join notification, otherwise shows part.
var buddyNotification = function(nickname, join) {
	initializeConversationArray('groupChat');
	conversationArrays['groupChat'].push({
		type:     join === true ? "join" : "leave",
		nickname: nickname,
		time:     currentTime(false),
		color:    Cryptodog.getUserColor(nickname)
	});

	Cryptodog.UI.scrollDownConversation(400, true);

	if (Cryptodog.allowSoundNotifications) {
		if (join) {
			Cryptodog.audio.userJoin.play();
		}
		else {
			Cryptodog.audio.userLeave.play();
		}
	}

	redrawConversation('groupChat');

	desktopNotification(notifImg,
		nickname + ' has ' + (join ? 'joined ' : 'left ')
		+ Cryptodog.me.conversation, '', 7);
}

function getContrastYIQ(hexcolor){
	var r = parseInt(hexcolor.substr(0,2),16);
	var g = parseInt(hexcolor.substr(2,2),16);
	var b = parseInt(hexcolor.substr(4,2),16);
	var yiq = ((r*299)+(g*587)+(b*114))/1000;
	return (yiq >= 128) ? 'black' : 'white';
}

function pushAndRedraw(id, msg) {
	if (msg.nickname) {
		var nickname = msg.nickname;
		if (nickname === Cryptodog.me.nickname) {}
		else if (Cryptodog.buddies[nickname].ignored()) {
			return false;
		}
	}

	if (Cryptodog.me.currentBuddy === id) {
		Cryptodog.UI.scrollDownConversation(400, true);
	}

	if (msg.type === "filelink") {
		desktopNotification(notifImg, Cryptodog.me.nickname + "@" + Cryptodog.me.conversation, nickname + " sent you a file attachment", 7);
		Cryptodog.buddies[nickname].messageCount++;

		Cryptodog.newMessageCount(++Cryptodog.me.newMessages);
		if (Cryptodog.allowSoundNotifications) {
			Cryptodog.audio.newMessage.play();
		}
	}

	initializeConversationArray(id);
	conversationArrays[id].push(msg);
	redrawConversation(id);
}

Cryptodog.pushAndRedraw = pushAndRedraw;
Cryptodog.redraw = redrawConversation;

// if the number of elements in a conversation exceeds this length, old messages are trimmed out.
Cryptodog.maxConversationLength = 512;

function redrawConversation(id) {
	// We shouldn't redraw at this moment.
	if (Cryptodog.me.currentBuddy !== id) {
		return;
	} 

	$("#conversationWindow").html("");

	var arr = conversationArrays[id];
	if (typeof arr == "undefined") {
		return;
	}

	// Delete old messages, so they get GCd and don't negatively impact performance
	if (arr.length > Cryptodog.maxConversationLength) {
		arr = arr.slice(arr.length-Cryptodog.maxConversationLength);
	}
 
	for (var i = 0; i < arr.length; i++ ) {
		var el = arr[i];

		var color     = el.color;
		var textcolor = 'white';

		var authStatus = false;
		if (el.nickname === Cryptodog.me.nickname) {
			authStatus = true;
		} else {
			if (Cryptodog.buddies[el.nickname]) {
				if (Cryptodog.buddies[el.nickname].authenticated) {
					authStatus = true;
				}
			}
		}
	
		var color = Cryptodog.getUserColor(el.nickname);


		// Determines whether this user's nickname should be displayed in white or black, depending on the 
		// contrast of their chosen color.
		textcolor = getContrastYIQ(color.slice(1));

		if (el.type == "fileupload") {
			$("#conversationWindow").append(Mustache.render(Cryptodog.templates.message, {
				nickname:    el.nickname,
				currentTime: el.time,
				color:       color,
				textColor:   textcolor,
				authStatus:  authStatus,
				message:     Mustache.render(Cryptodog.templates.file, {
					id:          el.id,
					progress:    el.progress
				})
			}));
		}

		if (el.type == "filedownload") {
			$("#conversationWindow").append(Mustache.render(Cryptodog.templates.message, {
				nickname:    el.nickname,
				currentTime: el.time,
				color:       color,
				textColor:   textcolor,
				authStatus:  authStatus,
				message:     Mustache.render(Cryptodog.templates.file, {
					id:          el.fileID,
					progress:    el.progress
				})
			}));
		}

		if (el.type == "filelink") {
			$("#conversationWindow").append(Mustache.render(Cryptodog.templates.message, {
				nickname:    el.nickname,
				currentTime: el.time,
				color:       color,
				textColor:   textcolor,
				authStatus:  authStatus,
				message:     Mustache.render(Cryptodog.templates.fileLink, {
					id:           el.fileID,
					downloadFile: "View " + el.mime
				})
			}));

			$("#" + el.fileID).on("click", { el: el }, function(evt) {
				var link = evt.data.el;
				if (typeof link.fileID == "undefined") {
					return;
				}

				link.type = "filedownload";
				link.progress = 0;

				try {
					var xhr = new XMLHttpRequest();
					xhr.responseType = "arraybuffer";

					xhr.onreadystatechange = function() {
						if (xhr.readyState === 4) {
							if (xhr.status == 200) {
								var box = new Uint8Array(xhr.response);
								if (box.length > link.prefixSize) {
									var data = etc.crypto.nacl.secretbox.open(box, link.nonce, link.key);
									if (data) {
										data = data.slice(link.prefixSize);
										var blob = new Blob([data]);
										blob = blob.slice(0, blob.size, link.mime);
										var bloburi = URL.createObjectURL(blob);
										link.type = "message";
										link.message = `<a target="_blank" href="${bloburi}">[${link.mime}]</a>`;
										redrawConversation(id);
										return;
									}
								} else {
									console.log("box size is", box.length, "whereas prefix is", link.prefixSize);
								}
							}

							link.type = "warning";
							link.message = "Could not download: this file was deleted";
							redrawConversation(id);
						}
					}

					xhr.onprogress = function(ev) {
						var progress = Math.floor((ev.loaded / ev.total) * 100);
						el.progress = progress;
						$('.fileProgressBarFill')
						.filterByData('id', el.fileID)
						.animate({'width': progress + '%'}, 50);
					}

					xhr.open("GET", new etc.URL(Cryptodog.bex.server).subPath(`files/${link.fileID}`).toString());
					xhr.send();
				} catch (e) {
					console.warn(e);
				}

				redrawConversation(id);
			});
		}

		if (el.type == "join") {
			$("#conversationWindow").append(Mustache.render(Cryptodog.templates.userJoin, {
				nickname:    el.nickname,
				currentTime: el.time,
				color:       color,
				textColor:   textcolor
			}));
		}

		if (el.type == "leave") {
			$("#conversationWindow").append(Mustache.render(Cryptodog.templates.userLeave, {
				nickname:    el.nickname,
				currentTime: el.time,
			}));
		}


		if (el.type == "message") {
			$("#conversationWindow").append(Mustache.render(Cryptodog.templates.message, {
				nickname:     shortenString(el.nickname, 16),
				currentTime:  el.time,
				authStatus:   authStatus,
				message:      el.message,
				color:        color,
				textColor:    textcolor,
				style:        'normal'
			}));
		}

		if (el.type == "warning") {
			$("#conversationWindow").append(Mustache.render(Cryptodog.templates.message, {
				nickname:     shortenString(el.nickname, 16),
				currentTime:  el.time,
				authStatus:   authStatus,
				message:      el.message,
				color:        color,
				textColor:    textcolor,
				style:        'italic'
			}));
		}

		if (el.type == "missingRecipients") {
			$("#conversationWindow").append(Mustache.render(Cryptodog.templates.missingRecipients, {
				text: Cryptodog.locale.warnings.missingRecipientWarning
					.replace('(NICKNAME)', el.message),
				dir: Cryptodog.locale.direction
			}));
		}
	}

	Cryptodog.rebindDataURIs();

	$(".sender").each(function(_, el) {
		Cryptodog.UI.bindSenderElement($(el));
	});
}

// If OTR fingerprints have not been generated, show a progress bar and generate them.
Cryptodog.ensureOTRdialog = function(nickname, close, cb, noAnimation) {
	var buddy = Cryptodog.buddies[nickname];
	if (nickname === Cryptodog.me.nickname || buddy.fingerprint) {
		return cb();
	}

	noAnimation = noAnimation || false;

	if (!noAnimation) {
		Cryptodog.UI.progressBarOTR()

		$('#progressBar').css('margin', '70px auto 0 auto')
		$('#fill').animate({'width': '100%', 'opacity': '1'}, 10000, 'linear')
	}

	// add some state for status callback
	buddy.genFingerState = { close: close, cb: cb, noAnimation: noAnimation}
	buddy.otr.sendQueryMsg()
}


// Open a buddy's contact list context menu.
var openBuddyMenu = function(nickname) {
	var buddy = Cryptodog.buddies[nickname],
		chatWindow = Cryptodog.locale.chatWindow,
		ignoreAction = chatWindow[buddy.ignored() ? 'unignore' : 'ignore'],
		$menu = $('#menu-' + buddy.id),
		$buddy = $('#buddy-' + buddy.id);
	if ($menu.attr('status') === 'active') {
		$menu.attr('status', 'inactive');
		$menu.css('background-image', 'url("img/icons/circle-down.svg")');
		$buddy.animate({'height': 15}, 190);
		$('#' + buddy.id + '-contents').fadeOut(200, function() {
			$(this).remove();
		});
		return;
	}
	var electMod = "Elect as moderator";
	var revokeMod = "Revoke moderator status";
	$menu.attr('status', 'active');
	$menu.css('background-image', 'url("img/icons/circle-up.svg")');
	$buddy.delay(10).animate({'height': 130}, 180, function() {
		$buddy.append(
			Mustache.render(Cryptodog.templates.buddyMenu, {
				buddyID: buddy.id,
				electAsModerator: buddy.authenticated == 2 ? revokeMod : electMod,
				displayInfo: chatWindow.displayInfo,
				ignore: ignoreAction
			})
		);
		var $contents = $('#' + buddy.id + '-contents');
		$contents.fadeIn(200);
		$contents.find('.option1').click(function(e) {
			e.stopPropagation();
			Cryptodog.displayInfo(nickname);
			$menu.click();
		});
		$contents.find('.option2').click(function(e) {
			e.stopPropagation();
			if (buddy.authenticated !== 2) {
				if (confirm("Elect this user as moderator? This may give them extreme powers over your client, such as blocking and removing users.") === true) {
					$contents.find(".option2").text(revokeMod);
					buddy.updateAuth(2);
				}
			} else {
					$contents.find(".option2").text(electMod);
					buddy.updateAuth(0);
			}
			$menu.click();
		});
		$contents.find('.option3').click(function(e) {
			e.stopPropagation();
			buddy.toggleIgnored();
			$menu.click();
		});
	})
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
				log("completion: " + err);
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
Cryptodog.getUserColor = function(nickname){
	if (nickname === Cryptodog.me.nickname) {
		return Cryptodog.me.color;
	}

	if (Cryptodog.buddies[nickname]) {
		return Cryptodog.buddies[nickname].color;
	}

	return Cryptodog.colors[nickname] || "#000000";
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

	if (Cryptodog.bex.base64.test(message) && Cryptodog.me.currentBuddy !== 'groupChat') {
		var purportedBex = etc.Encoding.decodeFromBase64(message);
		if (purportedBex.length >= 3) {
			if (Cryptodog.bex.headerBytes(purportedBex)) {
				alert("You attempted to send a BEX message.");
				return false;
			}
		}
	}

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
		if (type === 'groupchat') {
			Cryptodog.bex.transmitGroup([
				{header: Cryptodog.bex.op.COMPOSING}
			]);
		} else {
			Cryptodog.bex.transmitPrivate(destination, [
				{header: Cryptodog.bex.op.COMPOSING}
			])
		}

		window.setTimeout(function(d, t) {
			if (type === 'groupchat') {
				Cryptodog.bex.transmitGroup([
					{header: Cryptodog.bex.op.PAUSED}
				]);
			} else {
				Cryptodog.bex.transmitPrivate(destination, [
					{header: Cryptodog.bex.op.PAUSED}
				])
			}
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
			Cryptodog.me.color = randomColor({ luminosity: 'dark' });
			Cryptodog.xmpp.connect();
		});
	}
	return false;
})

Cryptodog.UI.userInterfaceBindings();

Cryptodog.UI.windowEventBindings();

Cryptodog.UI.show();

})}
