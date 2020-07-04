const Cryptodog = function () {
	'use strict';
	const version = '2.5.8';

	const me = {
		status: 'online',
		conversation: null,
		nickname: null,
		mpPrivateKey: null,
		mpPublicKey: null,
		mpFingerprint: null,
		color: "#FFF" // overwritten on connect
	};
	const ignoredNicknames = [];

	const users = new Map();

	function getUser(nickname) {
		return users.get(nickname);
	}

	function hasUser(nickname) {
		return users.has(nickname);
	}

	function allUsers() {
		return users.values();
	}

	function addUser(nickname) {
		const user = new Buddy(nickname);
		users.set(nickname, user);
		buddyList.add(user);
		return user;
	}

	function removeUser(nickname) {
		const user = users.get(nickname);
		buddyList.remove(user);
		Cryptodog.color.push(user.color);
		return users.delete(nickname);
	}

	function clearUsers() {
		users.clear();
		buddyList.destroy();
		Cryptodog.color.reset();
	}

	function userFromId(id) {
		return [...allUsers()].filter(user => user.id === id)[0];
	};

	function logout() {
		net.leave();
		clearUsers();
	};

	$(window).ready(function () {
		'use strict';

		// Prevent accidental window close.
		window.addEventListener('beforeunload', (event) => {
			if (users.size) {
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
		ignoredNicknames,
		getUser,
		hasUser,
		allUsers,
		addUser,
		removeUser,
		clearUsers,
		userFromId,
		logout,
	};
}();
