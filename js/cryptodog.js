const Cryptodog = function () {
	'use strict';
	const version = '2.5.8';

	const me = {
		status: 'online',
		composing: false,
		conversation: null,
		nickname: null,
		mpPrivateKey: null,
		mpPublicKey: null,
		mpFingerprint: null,
		currentBuddy: null,
		color: "#FFF" // overwritten on connect
	};

	const buddies = {};
	const ignoredNicknames = [];

	// Build new buddy.
	function addBuddy(nickname) {
		const buddy = new Buddy(nickname);
		buddies[nickname] = buddy;
		buddyList.add(buddy);
		return buddy;
	};

	// Handle buddy going offline.
	function removeBuddy(nickname) {
		const buddy = buddies[nickname];
		if (!buddy) {
			return;
		}
		buddyList.remove(buddy);
		Cryptodog.color.push(buddy.color);
		delete buddies[nickname];
	};

	// Get a buddy's nickname from their ID.
	function getBuddyNicknameByID(id) {
		for (var i in buddies) {
			if (buddies.hasOwnProperty(i)) {
				if (buddies[i].id === id) {
					return i;
				}
			}
		}
	};

	function logout() {
		net.leave();
		buddyList.destroy();

		for (var b in buddies) {
			if (buddies.hasOwnProperty(b)) {
				delete buddies[b];
			}
		}
		Cryptodog.color.reset();
	};

	$(window).ready(function () {
		'use strict';

		// Prevent accidental window close.
		window.addEventListener('beforeunload', (event) => {
			if (Object.keys(buddies).length) {
				event.preventDefault();
				event.returnValue = '';
			}
		});

		// Determine whether we are showing a top margin
		// Depending on window size
		$(window).resize(function () {
			if ($(window).height() < 650) {
				$('#bubble').css('margin-top', '0');
			} else {
				$('#bubble').css('margin-top', '2%');
			}
		});
		$(window).resize();

		$('#version').text(version);
		$('#bubble').show();
	});

	return {
		me,
		buddies,
		ignoredNicknames,
		addBuddy,
		removeBuddy,
		getBuddyNicknameByID,
		logout,
	};
}();
