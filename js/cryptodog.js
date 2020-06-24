if (typeof Cryptodog === 'undefined') { Cryptodog = function () { }; }

/*
-------------------
GLOBAL VARIABLES
-------------------
*/

Cryptodog.version = '2.5.8';

Cryptodog.me = {
	newMessages: 0,
	windowFocus: true,
	composing: false,
	conversation: null,
	nickname: null,
	otrKey: null,
	mpPrivateKey: null,
	mpPublicKey: null,
	mpFingerprint: null,
	currentBuddy: null,
	color: "#FFF" // overwritten on connect
};

Cryptodog.buddies = {};

// For persistent ignores.
Cryptodog.ignoredNicknames = [];

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

if (typeof (window) !== 'undefined') {
	$(window).ready(function () {
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
		Cryptodog.isFiltered = function (name) {
			return false;
		};

		Cryptodog.buddyWhitelistEnabled = false;

		// Automatically ignore newcomers who aren't in the current buddies list
		Cryptodog.toggleBuddyWhitelist = function () {
			if (Cryptodog.buddyWhitelistEnabled) {
				Cryptodog.isFiltered = function (nickname) {
					return false;
				};

				Cryptodog.buddyWhitelistEnabled = false;
			} else {
				var whitelist = Object.keys(Cryptodog.buddies);
				Cryptodog.isFiltered = function (nickname) {
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
		Cryptodog.addBuddy = function (nickname) {
			const buddy = new Buddy(nickname);
			Cryptodog.buddies[nickname] = buddy;
			buddyList.add(buddy);
			return buddy;
		};

		// Handle buddy going offline.
		Cryptodog.removeBuddy = function (nickname) {
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
			buddyElement.each(function () {
				$(this).attr('status', 'offline');
				if (Cryptodog.me.currentBuddy === buddyID) {
					return;
				}
				if (!$(this).hasClass('newMessage')) {
					$(this).slideUp(500, function () {
						$(this).remove();
					});
				}
			});
		};

		// Get a buddy's nickname from their ID.
		Cryptodog.getBuddyNicknameByID = function (id) {
			for (var i in Cryptodog.buddies) {
				if (Cryptodog.buddies.hasOwnProperty(i)) {
					if (Cryptodog.buddies[i].id === id) {
						return i;
					}
				}
			}
		};

		// Handle click event on all embedded data URI messages
		Cryptodog.rebindDataURIs = function () {
			function handleDataUriClick() {
				Cryptodog.UI.openDataInNewWindow(this.getAttribute("data-uri-data"));
			}

			var clickables = document.querySelectorAll(".data-uri-clickable");
			clickables.forEach(function (link, i) {
				var linkClone = link.cloneNode(true);
				link.parentNode.replaceChild(linkClone, link);
				linkClone.addEventListener("click", handleDataUriClick.bind(link));
			});
		};

		// Executes on user logout.
		Cryptodog.logout = function () {
			Cryptodog.UI.logout();
			net.leave();

			for (var b in Cryptodog.buddies) {
				if (Cryptodog.buddies.hasOwnProperty(b)) {
					delete Cryptodog.buddies[b];
				}
			}

			Cryptodog.color.reset();
			Cryptodog.conversationBuffers = {};
		};

		Cryptodog.prepareAnswer = function (answer, ask, buddyMpFingerprint) {
			var first, second;
			answer = answer.toLowerCase().replace(/(\s|\.|\,|\'|\"|\;|\?|\!)/, '');
			if (buddyMpFingerprint) {
				first = ask ? Cryptodog.me.mpFingerprint : buddyMpFingerprint;
				second = ask ? buddyMpFingerprint : Cryptodog.me.mpFingerprint;
				answer += ';' + first + ';' + second;
			}
			return answer;
		};

		Cryptodog.changeStatus = function (status) {
			if (status === 'away' || status === 'online') {
				net.currentStatus = status;
				net.sendStatus();
			}
		};

		// Get color by nickname
		Cryptodog.getUserColor = function (nickname) {
			return nickname === Cryptodog.me.nickname ? Cryptodog.me.color : Cryptodog.buddies[nickname].color;
		};

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
				if (count <= 0) { return; }
				else if (count >= 1) {
					document.title = '(' + count + ') ' + document.title;
				}
			}
		};

		/*
		-------------------
		PRIVATE INTERFACE FUNCTIONS
		-------------------
		*/

		var currentNotifications = [];

		var handleNotificationTimeout = function () {
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
		};

		window.setInterval(handleNotificationTimeout, 1000);

		function notificationTruncate(msg) {
			// Chrome truncates its notifications on its own, but firefox doesn't for some reason
			var is_firefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
			if (msg.length > 50 && is_firefox) {
				return msg.substring(0, 50) + "…";
			}
			return msg;
		}

		var desktopNotification = function (image, title, body, timeout) {
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
			else if (notificationStatus == "default" || notificationStatus == null || notificationStatus == "") {
				// request permission
				Notification.requestPermission();
			}
		};

		// Prepares necessary encryption key operations before WebSocket connection.
		// Shows a progress bar while doing so.
		var showKeyPreparationDialog = function (callback) {
			Cryptodog.storage.getItem('persistenceEnabled', function (key) {
				var key = key || {};
				if (key.enabled) {
					Cryptodog.me.mpPrivateKey = Uint8Array.fromWordArray(CryptoJS.enc.Base64.parse(key.mp));
					Cryptodog.me.otrKey = DSA.parsePrivate(key.otr);
				} else {
					Cryptodog.me.mpPrivateKey = Cryptodog.multiParty.genPrivateKey();
				}

				Cryptodog.me.mpPublicKey = Cryptodog.multiParty.genPublicKey(Cryptodog.me.mpPrivateKey);
				Cryptodog.me.mpFingerprint = Cryptodog.multiParty.genFingerprint();

				// If we already have keys, just skip to the callback.
				if (Cryptodog.me.otrKey) {
					callback();
					return;
				}

				$('#loginInfo').text(Cryptodog.locale['loginMessage']['generatingKeys']);

				// Add delay to key generation when on the file protocol
				// Since the UI freezes when generating keys without WebWorkers
				if (window.location.protocol === 'file:') {
					setTimeout(function () {
						prepareKeys(callback);
					}, 100);
				} else {
					prepareKeys(callback);
				}
			});
		};

		// See above.
		var prepareKeys = function (callback) {
			// Create DSA key for OTR.
			// file protocol doesn't support WebWorkers
			if (window.location.protocol === 'file:') {
				Cryptodog.me.otrKey = new DSA();
				if (callback) {
					callback();
				}
			} else {
				DSA.createInWebWorker(
					{ path: './js/lib/otr/dsa-webworker.js' },
					function (key) {
						Cryptodog.me.otrKey = key;
						if (callback) {
							callback();
						}
					}
				);
			}
		};

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
			});
		});

		// Login form.
		$('#conversationName').click(function () {
			$(this).select();
		});
		$('#nickname').click(function () {
			$(this).select();
		});
		$('#CryptodogLogin').submit(function () {
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
				var autoIgnore;

				showKeyPreparationDialog(function () {
					Cryptodog.me.color = Cryptodog.color.pop();
					$('#loginInfo').text(Cryptodog.locale['loginMessage']['connecting']);
					net.join(function () {
						$('.conversationName').animate({ 'background-color': '#0087AF' });

						meta.sendPublicKey();
						meta.requestPublicKey();

						clearInterval(autoIgnore);

						autoIgnore = setInterval(function () {
							for (var nickname in Cryptodog.buddies) {
								var buddy = Cryptodog.buddies[nickname];

								if (Cryptodog.autoIgnore && buddy.messageCount > Cryptodog.maxMessageCount) {
									buddy.toggleIgnored();
									console.log('Automatically ignored ' + nickname);
								}

								buddy.messageCount = 0;
							}
						}, Cryptodog.maxMessageInterval);

						$('#loginInfo').text('✓');
						$('#status').attr('src', 'img/icons/checkmark.svg');
						$('#fill')
							.stop()
							.animate(
								{
									width: '100%',
									opacity: '1'
								},
								250,
								'linear'
							);

						window.setTimeout(function () {
							$('#dialogBoxClose').click();
						}, 400);

						window.setTimeout(function () {
							$('#loginOptions,#languages,#customServerDialog').fadeOut(200);
							$('#version,#logoText,#loginInfo,#info').fadeOut(200);
							$('#header').animate({ 'background-color': '#444' });
							$('.logo').animate({ margin: '-11px 5px 0 0' });

							$('#login').fadeOut(200, function () {
								$('#conversationInfo').fadeIn();
								$('#conversationWrapper').fadeIn();
								$('#optionButtons').fadeIn();

								$('#footer')
									.delay(200)
									.animate({ height: 60 }, function () {
										$('#userInput').fadeIn(200, function () {
											$('#userInputText').focus();
										});
									});

								buddyList.initialize();
							});
						}, 800);

						document.title = Cryptodog.me.nickname + '@' + Cryptodog.me.conversation;
						$('.conversationName').text(document.title);

						Cryptodog.storage.setItem('nickname', Cryptodog.me.nickname);
					});
				});
			}
			return false;
		});

		Cryptodog.UI.userInterfaceBindings();

		Cryptodog.UI.windowEventBindings();

		Cryptodog.UI.show();

	});
}
