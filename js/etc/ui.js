﻿if (typeof Cryptodog === 'undefined') { Cryptodog = function () { }; };

Cryptodog.UI = {
	// Set version number in UI.
	setVersion: function () {
		$('#version').text(Cryptodog.version);
	},

	// Signal a file transfer error in the UI.
	fileTransferError: function (sid, nickname) {
		$('.fileProgressBar')
			.filterByData('file', sid)
			.filterByData('id', Cryptodog.buddies[nickname].id)
			.animate({ 'borderColor': '#F00' });
		$('.fileProgressBarFill')
			.filterByData('file', sid)
			.filterByData('id', Cryptodog.buddies[nickname].id)
			.animate({ 'background-color': '#F00' });
	},

	// Handles login failures.
	loginFail: function (message) {
		$('#loginInfo').text(message);
		$('#bubble').animate({ 'left': '+=5px' }, 130)
			.animate({ 'left': '-=10px' }, 130)
			.animate({ 'left': '+=5px' }, 130);
	},

	// Handle detected new keys.
	removeAuthAndWarn: function (nickname) {
		var buddy = Cryptodog.buddies[nickname];
		var openAuth = false;
		buddy.updateAuth(false);
		var errorAKE = Mustache.render(
			Cryptodog.templates.errorAKE, {
				nickname: nickname,
				errorText: Cryptodog.locale.auth.AKEWarning,
				openAuth: Cryptodog.locale.chatWindow.authenticate
			}
		);
		this.dialogBox(errorAKE, {
			extraClasses: 'dialogBoxError',
			closeable: true,
			height: 250,
			onAppear: function () {
				$('#openAuth').unbind().bind('click', function () {
					openAuth = true
					$('#dialogBoxClose').click()
				})
			},
			onClose: function () {
				if (openAuth) {
					Cryptodog.displayInfo(nickname)
				}
			}
		});
	},

	// Close generating fingerprints dialog.
	closeGenerateFingerprints: function (nickname) {
		var state = Cryptodog.buddies[nickname].genFingerState;
		Cryptodog.buddies[nickname].genFingerState = null;
		$('#fill').stop().animate(
			{ 'width': '100%', 'opacity': '1' },
			400, 'linear',
			function () {
				$('#dialogBoxContent').fadeOut(function () {
					$(this).empty().show();
					if (state.close) {
						$('#dialogBoxClose').click();
					}
					state.cb();
				})
			}
		);
	},

	// Displays a pretty dialog box with `data` as the content HTML.
	dialogBox: function (data, options) {
		if (options.closeable) {
			$('#dialogBoxClose').css('width', 18);
			$('#dialogBoxClose').css('font-size', 12);
			$(document).keydown(function (e) {
				if (e.keyCode === 27) {
					e.stopPropagation();
					$('#dialogBoxClose').click();
					$(document).unbind('keydown');
				}
			});
		}
		if (options.extraClasses) {
			$('#dialogBox').addClass(options.extraClasses);
		}
		$('#dialogBoxContent').html(data);
		$('#dialogBox').css('height', options.height);
		$('#dialogBox').fadeIn(200, function () {
			if (options.onAppear) {
				options.onAppear();
			}
		})
		$('#dialogBoxClose').unbind('click').click(function (e) {
			e.stopPropagation();
			$(this).unbind('click');
			if ($(this).css('width') === 0) {
				return false;
			}
			$('#dialogBox').fadeOut(100, function () {
				if (options.extraClasses) {
					$('#dialogBox').removeClass(options.extraClasses);
				}
				$('#dialogBoxContent').empty();
				$('#dialogBoxClose').css('width', '0');
				$('#dialogBoxClose').css('font-size', '0');
				if (options.onClose) {
					options.onClose();
				}
			})
			$('#userInputText').focus();
		})
	},

	logout: function () {
		$('#loginInfo').text(Cryptodog.locale['loginMessage']['thankYouUsing']);
		document.title = 'Cryptodog';
		$('#conversationInfo,#optionButtons').fadeOut();
		$('#header').animate({ 'background-color': 'transparent' });
		$('.logo').animate({ 'margin': '-5px 5px 0 5px' });
		$('#buddyWrapper').slideUp();
		$('.buddy').unbind('click');
		$('.buddyMenu').unbind('click');
		$('#buddy-groupChat').insertAfter('#buddiesOnline');
		$('#userInput').fadeOut(function () {
			$('#logoText').fadeIn();
			$('#footer').animate({ 'height': 14 });
			$('#conversationWrapper').fadeOut(function () {
				$('#info,#loginOptions,#version,#loginInfo').fadeIn();
				$('#login').fadeIn(200, function () {
					$('#login').css({ opacity: 1 });
					$('#conversationName').select();
					$('#conversationName,#nickname').removeAttr('readonly');
					$('#loginSubmit').removeAttr('readonly');
				});
				$('#dialogBoxClose').click();
				$('#buddyList div').each(function () {
					if ($(this).attr('id') !== 'buddy-groupChat') {
						$(this).remove();
					}
				});
				$('#conversationWindow').html('');
			})
		})
	},

	// Convert message URLs to links. Used internally.
	addLinks: function (message) {
		return message.autoLink();
	},

	// Default emoticons (Unicode) - also in lang/emojis/unicode.json
	emoticons: [
		{
			"data": '😢',
			"regex": /(\s|^)(:|(=))-?\&apos;\((?=(\s|$))/gi
		}, 	// :'( - Cry
		{
			"data": '😕',
			"regex": /(\s|^)(:|(=))-?(\/|s)(?=(\s|$))/gi
		},  // :/ - Unsure
		{
			"data": '🐱',
			"regex": /(\s|^)(:|(=))-?3(?=(\s|$))/gi
		},		    // :3 - Cat face
		{
			"data": '😮',
			"regex": /(\s|^)(:|(=))-?o(?=(\s|$))/gi
		},	// :O - Shock
		{
			"data": '😄',
			"regex": /(\s|^)(:|(=))-?D(?=(\s|$))/gi
		},	// :D - Grin
		{
			"data": '☹',
			"regex": /(\s|^)(:|(=))-?\((?=(\s|$))/gi
		},	// :( - Sad
		{
			"data": '😊',
			"regex": /(\s|^)(:|(=))-?\)(?=(\s|$))/gi
		},	// :) - Happy
		{
			"data": '😛',
			"regex": /(\s|^)(:|(=))-?p(?=(\s|$))/gi
		},	// :P - Tongue
		{
			"data": '😶',
			"regex": /(\s|^)(:|(=))-?x\b(?=(\s|$))/gi
		},	// :x - Shut
		{
			"data": '😉',
			"regex": /(\s|^);-?\)(?=(\s|$))/gi
		},				    // ;) - Wink
		{
			"data": '😜',
			"regex": /(\s|^);-?\p(?=(\s|$))/gi
		},	// ;P - Winky Tongue
		{
			"data": '❤️',
			"regex": /(\s|^)\&lt\;3\b(?=(\s|$))/g
		}	// <3 - Heart
	],

	// Convert text emoticons to graphical emoticons.
	addEmoticons: function (message) {
		for (var i = 0; i < Cryptodog.UI.emoticons.length; i++) {
			var e = Cryptodog.UI.emoticons[i];
			message = message.replace(e.regex, ' <span class="monospace">' + e.data + '</span>');
		}

		return message;
	},

	setEmoticonPack: function (packId) {
		$.getJSON("lang/emojis/" + packId + ".json", function (emojiJSON) {
			console.log("Loaded emoji pack '" + emojiJSON.name + "'");
			if (emojiJSON.type !== "text") {
				console.error("Non-text emoji sets are not supported right now.");
				return;
			}
			Cryptodog.UI.emoticons = [];
			emojiJSON.data.forEach(function (emoji) {
				console.log("Started loading " + emoji.name);
				var regex = new RegExp(emoji.regex, emoji.regexflags);
				Cryptodog.UI.emoticons.push({ data: emoji.data, regex: regex });
			})
		});
	},

	// Bind sender element to show authStatus information and timestamps.
	bindSenderElement: function (senderElement) {
		if (!senderElement) {
			senderElement = $('.sender');
		}
		senderElement.children().unbind('mouseenter,mouseleave,click');
		senderElement.find('.nickname').mouseenter(function () {
			$(this).text($(this).parent().attr('data-timestamp'));
		})
		senderElement.find('.nickname').mouseleave(function () {
			$(this).text($(this).parent().attr('data-sender'));
		})
		senderElement.find('.authStatus').mouseenter(function () {
			if ($(this).attr('data-auth') === 'true') {
				$(this).attr('data-utip', Cryptodog.locale.auth.authenticated);
			}
			else {
				$(this).attr('data-utip',
					Mustache.render(Cryptodog.templates.authStatusFalseUtip, {
						text: Cryptodog.locale.auth.userNotAuthenticated,
						learnMore: Cryptodog.locale.auth.clickToLearnMore
					})
				);
			}
			// This is pretty ugly, sorry! Feel free to clean up via pull request.
			var bgc = $(this).css('background-color');
			var boxShadow = bgc.replace('rgb', 'rgba')
				.substring(0, bgc.length - 1) + ', 0.3)';
			$(this).attr('data-utip-style', JSON.stringify({
				'width': 'auto',
				'max-width': '110px',
				'font-size': '11px',
				'background-color': bgc,
				'box-shadow': '0 0 0 2px ' + boxShadow
			}));
			$(this).attr('data-utip-click', 'Cryptodog.displayInfo()');
		})
		senderElement.find('.authStatus').click(function () {
			Cryptodog.displayInfo($(this).parent().attr('data-sender'));
		})
	},

	// Scrolls down the chat window to the bottom in a smooth animation.
	// 'speed' is animation speed in milliseconds.
	// If `threshold` is true, we won't scroll down if the user
	// appears to be scrolling up to read messages.
	scrollDownConversation: function (speed, threshold) {
		var scrollPosition = $('#conversationWindow')[0].scrollHeight
		scrollPosition -= $('#conversationWindow').scrollTop();
		if ((scrollPosition < 700) || !threshold) {
			$('#conversationWindow').stop().animate({
				scrollTop: $('#conversationWindow')[0].scrollHeight + 20
			}, speed);
		}
	},

	progressBarOTR: function () {
		var progressDialog = '<div id="progressBar"><div id="fill"></div></div>';
		this.dialogBox(progressDialog, {
			height: 250,
			closeable: true
		});
		$('#progressBar').css('margin', '70px auto 0 auto');
		$('#fill').animate({ 'width': '100%', 'opacity': '1' }, 10000, 'linear');
	},

	/*
	-------------------
	USER INTERFACE BINDINGS
	-------------------
	*/
	userInterfaceBindings: function () {
		// Buttons:
		// Dark mode button
		$('#darkMode').click(function () {
			var $this = $(this);
			if (document.body.classList.contains('darkMode')) {
				document.body.classList.remove('darkMode');
				$('#darkMode').attr('data-utip', 'Dark mode');
			}
			else {
				document.body.classList.add('darkMode');
				$('#darkMode').attr('data-utip', 'Light mode');
			}
		})

		$('#uploadFileBtn').change(function (ev) {
			var filename = Cryptodog.kommy.utils.randomHex();
			var h = new Cryptodog.kommy.http.client();
			var wc = window.crypto;
			var ivData = new Uint8Array(16);
			wc.getRandomValues(ivData);

			var keyData = new Uint8Array(32);
			wc.getRandomValues(keyData);

			var cipher = "AES-CBC";
			wc.subtle.importKey(
				"raw",
				keyData.buffer,
				{
					name: cipher,
					length: 256
				},

				true,
				["encrypt", "decrypt"]
			).then(function (key) {

				// Read and encrypt files
				var bl = new Blob([], { type: "application/octet-stream" });
				var rdr = new FileReader();

				var filer = ev.target.files[0];

				rdr.onload = function (e) {
					var c = e.target.result;

					var fileData = new Uint8Array(c);

					wc.subtle.encrypt(
						{
							name: cipher,
							iv: ivData
						},
						key,
						fileData
					).then(function (encrypted) {
						h.postBuffer(Cryptodog.kommy.httpit(Cryptodog.socket.currentServer.relay).replace("backend", "upload?file=") + filename, new Uint8Array(encrypted)).then(function () {
							var encmessage = {
								type: "file",
								filename: filename,
								key: Cryptodog.kommy.utils.btoa(keyData),
								iv: Cryptodog.kommy.utils.btoa(ivData),
								extension: filer.name.split(".")[1] || "dat"
							};

							var enc = JSON.stringify(encmessage);

							var id;
							if (Cryptodog.me.currentBuddy === "groupChat") {
								id = "groupChat";
								Cryptodog.socket.send({
									type: "groupchat",
									chatroom: Cryptodog.me.conversation,
									object: JSON.parse(Cryptodog.multiParty.sendMessage(enc))
								});
							} else {
								id = Cryptodog.me.currentBuddy
								Cryptodog.buddies[
									Cryptodog.getBuddyNicknameByID(Cryptodog.me.currentBuddy)
								].otr.sendMsg(enc);
							}

							Cryptodog.addToConversation("File uploaded.", Cryptodog.me.nickname, id, "message")
						});
					});
				};

				rdr.readAsArrayBuffer(filer);
			});

		});

		// Audio notifications toggle button
		$('#audioToggle').click(function () {
			if (Cryptodog.allowSoundNotifications) {
				Cryptodog.allowSoundNotifications = false;
				Cryptodog.storage.setItem('audioNotifications', 'false');
				$('#audioToggle').attr('data-utip', 'Audio notifications off');
				$('#audioToggle').attr('src', 'img/icons/volume-mute.svg');
			}
			else {
				Cryptodog.allowSoundNotifications = true;
				Cryptodog.storage.setItem('audioNotifications', 'true');
				$('#audioToggle').attr('data-utip', 'Audio notifications on');
				$('#audioToggle').attr('src', 'img/icons/volume-medium.svg');
			}
		});

		// Status button.
		$('#status').click(function () {
			var $this = $(this);
			if ($this.attr('src') === 'img/icons/checkmark.svg') {
				$this.attr('src', 'img/icons/cross.svg');
				$this.attr('title', Cryptodog.locale['chatWindow']['statusAway']);
				$this.attr('data-utip', Cryptodog.locale['chatWindow']['statusAway']);
				$this.mouseenter();
				Cryptodog.changeStatus('away');
			}
			else {
				$this.attr('src', 'img/icons/checkmark.svg');
				$this.attr('title', Cryptodog.locale['chatWindow']['statusAvailable']);
				$this.attr('data-utip', Cryptodog.locale['chatWindow']['statusAvailable']);
				$this.mouseenter();

				Cryptodog.changeStatus('online');
			}
		})

		// My info button.
		$('#myInfo').click(function () {
			Cryptodog.displayInfo(Cryptodog.me.nickname);
		})

		// Desktop notifications button.
		$('#notifications').click(function () {
			var $this = $(this)
			if ($this.attr('src') === 'img/icons/bubble2.svg') {
				$this.attr('src', 'img/icons/bubble.svg');
				$this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOn']);
				$this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOn']);
				$this.mouseenter();
				Cryptodog.desktopNotifications = true;
				Cryptodog.storage.setItem('desktopNotifications', 'true');
				var notifStatus = Notification.permission;
				if (notifStatus == 'denied') {
					// notifications supported but not enabled
					Notification.requestPermission();
					// check if user actually accepted
					if (Notification.permission == 'denied') {
						Cryptodog.desktopNotifications = false;
						Cryprodog.storage.setItem('desktopNotifications', 'false');
					}
				}
				else if (notifStatus == 'unknown') {
					// browser doesn't support desktop notifications
					alert("It looks like your browser doesn't support desktop notifications.");
					$this.attr('src', 'img/icons/bubble2.svg');
					$this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOff']);
					$this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOff']);
					$this.mouseenter();
					Cryptodog.desktopNotifications = false;
					Cryptodog.storage.setItem('desktopNotifications', 'false');
				}
			}
			else {
				$this.attr('src', 'img/icons/bubble2.svg');
				$this.attr('title', Cryptodog.locale['chatWindow']['desktopNotificationsOff']);
				$this.attr('data-utip', Cryptodog.locale['chatWindow']['desktopNotificationsOff']);
				$this.mouseenter();
				Cryptodog.desktopNotifications = false;
				Cryptodog.storage.setItem('desktopNotifications', 'false');
			}
		})

		// Logout button.
		$('#logout').click(function () {
			Cryptodog.logout();
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
			});
		});

		// Login form.
		$('#conversationName').click(function () {
			$(this).select();
		})
		$('#nickname').click(function () {
			$(this).select();
		})
	},

	/*
	-------------------
	WINDOW EVENT BINDINGS
	-------------------
	*/
	windowEventBindings: function () {
		$(window).ready(function () {
			// Initialize language settings.
			Cryptodog.storage.getItem('language', function (key) {
				if (key) {
					Cryptodog.locale.set(key, true);
				}
				else {
					Cryptodog.locale.set(window.navigator.language.toLowerCase());
				}
			});

			// Load custom servers.
			Cryptodog.storage.getItem('customServers', function (key) {
				if (key) {
					$('#customServerSelector').empty();
					var servers = $.parseJSON(key);
					$.each(servers, function (name) {
						$('#customServerSelector').append(
							Mustache.render(Cryptodog.templates['customServer'], {
								name: name,
								domain: servers[name]['domain'],
								xmpp: servers[name]['xmpp'],
								relay: servers[name]['relay']
							})
						);
					});
				}
			});

			// Load nickname settings.
			Cryptodog.storage.getItem('nickname', function (key) {
				if (key) {
					$('#nickname').animate({ 'color': 'transparent' }, function () {
						$(this).val(key);
						$(this).animate({ 'color': '#FFF' });
					});
				}
			});

			// Load notification settings.
			window.setTimeout(function () {
				Cryptodog.storage.getItem('desktopNotifications', function (key) {
					if (key === 'true') {
						$('#notifications').click();
						$('#utip').hide();
					}
				});
				Cryptodog.storage.getItem('audioNotifications', function (key) {
					if (key === 'true') {
						$('#audioToggle').click();
					}
				});
			}, 800);
		});

		// When the window/tab is not selected, set `windowFocus` to false.
		// `windowFocus` is used to know when to show desktop notifications.
		$(window).blur(function () {
			Cryptodog.me.windowFocus = false;
		});

		// On window focus, select text input field automatically if we are chatting.
		// Also set `windowFocus` to true.
		$(window).focus(function () {
			Cryptodog.me.windowFocus = true;
			Cryptodog.newMessageCount();
			if (Cryptodog.me.currentBuddy) {
				$('#userInputText').focus();
			}
		});

		// Prevent accidental window close.
		$(window).bind('beforeunload', function () {
			if (Object.keys(Cryptodog.buddies).length > 1) {
				return Cryptodog.locale['loginMessage']['thankYouUsing'];
			}
		});

		// Logout on browser close.
		window.onunload = function () {
			if (typeof Cryptodog.socket.conn !== "undefined") {
				console.log(typeof Cryptodog.socket.conn);
				Cryptodog.socket.conn.close();
			}
		}

		// Determine whether we are showing a top margin
		// Depending on window size
		$(window).resize(function () {
			if ($(window).height() < 650) {
				$('#bubble').css('margin-top', '0');
			}
			else {
				$('#bubble').css('margin-top', '2%');
			}
		})
		$(window).resize();
	},

	show: function () {
		// Show main window.
		$('#bubble').show();
	}
}
