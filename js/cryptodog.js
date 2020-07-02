if (typeof Cryptodog === 'undefined') { Cryptodog = function () { }; }

/*
-------------------
GLOBAL VARIABLES
-------------------
*/

Cryptodog.version = '2.5.8';

Cryptodog.me = {
	status: 'online',
	newMessages: 0,
	composing: false,
	conversation: null,
	nickname: null,
	mpPrivateKey: null,
	mpPublicKey: null,
	mpFingerprint: null,
	currentBuddy: null,
	color: "#FFF" // overwritten on connect
};

Cryptodog.buddies = {};

// For persistent ignores.
Cryptodog.ignoredNicknames = [];

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
			const buddy = Cryptodog.buddies[nickname];
			if (!buddy) {
				return;
			}
			buddyList.remove(buddy);
			Cryptodog.color.push(buddy.color);
			delete Cryptodog.buddies[nickname];
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
		};

		// Handle new message count
		Cryptodog.newMessageCount = function (count) {
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
			} else if ($('#nickname').val() === '') {
				Cryptodog.UI.loginFail(Cryptodog.locale['loginMessage']['enterNickname']);
				$('#nickname').select();
			}

			// Prepare keys and connect
			else {
				$('#loginSubmit,#conversationName,#nickname').attr('readonly', 'readonly');
				Cryptodog.me.conversation = $('#conversationName').val();
				Cryptodog.me.nickname = $('#nickname').val();
				var autoIgnore;

				Cryptodog.me.mpPrivateKey = multiparty.newPrivateKey();
				Cryptodog.me.mpPublicKey = multiparty.publicKeyFromPrivate(Cryptodog.me.mpPrivateKey);
				Cryptodog.me.mpFingerprint = multiparty.fingerprint(Cryptodog.me.mpPublicKey.raw);

				Cryptodog.me.color = Cryptodog.color.pop();
				$('#loginInfo').text(Cryptodog.locale['loginMessage']['connecting']);

				net.join(function () {
					$('.conversationName').animate({ 'background-color': '#0087AF' });

					meta.sendPublicKey(Cryptodog.me.mpPublicKey.encoded);
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
						$('#loginOptions,#customServerDialog').fadeOut(200);
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

					storage.setItem('nickname', Cryptodog.me.nickname);
				});
			}
			return false;
		});

		Cryptodog.UI.windowEventBindings();

		Cryptodog.UI.show();

	});
}
