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

if (typeof (window) !== 'undefined') {
	$(window).ready(function () {
		'use strict';

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
			net.leave();
			buddyList.cleanUp();

			for (var b in Cryptodog.buddies) {
				if (Cryptodog.buddies.hasOwnProperty(b)) {
					delete Cryptodog.buddies[b];
				}
			}

			Cryptodog.color.reset();
		};

		Cryptodog.UI.windowEventBindings();

		$('#version').text(Cryptodog.version);
		$('#bubble').show();
	});
}
