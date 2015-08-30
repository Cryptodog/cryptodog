$(window).load(function() {
'use strict';

Cryptocat.FB                = {}
Cryptocat.FB.userID         = null
Cryptocat.FB.accessToken    = null
Cryptocat.FB.statusInterval = null
Cryptocat.FB.authInterval   = null
Cryptocat.FB.authID         = (function() {
	var id = ''
	while (id.length < 77) { // 2^256 ~= 10^77
		id += Cryptocat.random.decimal()
	}
	return id
})()
Cryptocat.storage.getItem('fbAccessToken', function(accessToken) {
	Cryptocat.FB.accessToken = accessToken
})

/*
-------------------
CRYPTOCAT INTEGRATION FUNCTIONS
-------------------
*/

Cryptocat.FB.prepareLogin = function(accessToken) {
	$.get(
		'https://graph.facebook.com/me/',
		{
			'access_token': accessToken
		},
		function(id) {
			Cryptocat.storage.setItem('fbAccessToken', accessToken)
			Cryptocat.FB.accessToken = accessToken
			Cryptocat.FB.userID      = id.id
			Cryptocat.me.nickname    = id.name
			$.get('https://outbound.crypto.cat/facebook/', {
				'setuser': Cryptocat.FB.userID
			})
			document.title = '[' + id.name + '] Cryptocat'
			$('.conversationName').text(id.name)
			$('#facebookConnect').attr('readonly', 'readonly')
			Cryptocat.xmpp.showKeyPreparationDialog(function() {
				Cryptocat.FB.verifyLogin()
			})
		}
	)
}

Cryptocat.FB.verifyLogin = function() {
	if (
		Cryptocat.FB.userID.match(/^\d+$/) &&
		Cryptocat.FB.accessToken.match(/^\w+$/)
	) {
		Cryptocat.xmpp.connection = new Strophe.Connection('https://outbound.crypto.cat/http-bind/')
		Cryptocat.xmpp.connection.facebookConnect(
			Cryptocat.FB.userID + '@chat.facebook.com/cryptocat',
			Cryptocat.FB.onConnect,
			60,
			1,
			null,
			Cryptocat.FB.accessToken
		)
	}
}

Cryptocat.FB.onConnect = function(status) {
	/*
	if (status === Strophe.Status.CONNECTING) {
	}
	if (status === Strophe.Status.CONNFAIL) {
	}
	if (status === Strophe.Status.DISCONNECTING) {
	}
	if (status === Strophe.Status.DISCONNECTED) {
	}
	*/
	if (status === Strophe.Status.CONNECTED) {
		Cryptocat.FB.onConnected()
		Cryptocat.xmpp.connection.addHandler(
			Cryptocat.FB.onMessage,
			null,
			'message',
			null,
			null,
			null
		)
		Cryptocat.xmpp.connection.addHandler(
			Cryptocat.FB.onPresence,
			null,
			'presence',
			null,
			null,
			null
		)
	}
}

Cryptocat.FB.onConnected = function() {
	// Do the regular onConnected UI shabang...
	Cryptocat.xmpp.onConnected()
	// Then do some special shwaza for Facebook.
	Cryptocat.xmpp.connection.send($pres().tree())
	Cryptocat.FB.getStatuses()
	Cryptocat.FB.statusInterval = setInterval(function() {
		Cryptocat.FB.getStatuses()
	}, 12345)
}

Cryptocat.FB.onMessage = function(message) {
	var from     = message.getAttribute('from').match(/\d+/)[0]
	var type     = message.getAttribute('type')
	var elements = message.getElementsByTagName('body')
	if (
		(type === 'chat') &&
		(elements.length > 0)
	) {
		var body = elements[0]
		var nickname = Cryptocat.getBuddyNicknameByID(from)
		Cryptocat.buddies[nickname].otr.receiveMsg(Strophe.getText(body))
	}
	return true
}

Cryptocat.FB.onPresence = function() {
	return true
}

Cryptocat.FB.getStatuses = function() {
	var query = 'SELECT uid, name, online_presence, status '
		+ 'FROM user WHERE uid IN ( SELECT uid2 FROM friend '
		+ 'WHERE uid1 = me())'
	$.get(
		'https://graph.facebook.com/fql',
		{
			'q':            query,
			'access_token': Cryptocat.FB.accessToken,
			'method':       'GET'
		},
		function(data) {
			var statuses = data.data
			for (var i in statuses) {
				if (statuses.hasOwnProperty(i)) {
					Cryptocat.FB.handleStatus(statuses[i])
				}
			}
		}
	)
}

Cryptocat.FB.handleStatus = function(status) {
	var presence = status['online_presence']
	if (presence === 'offline') {
		if (Cryptocat.buddies.hasOwnProperty(status.name)) {
			Cryptocat.removeBuddy(status.name)
		}
	}
	else if (/^(active|idle)$/.test(presence)) {
		$.get(
			'https://outbound.crypto.cat/facebook/',
			{
				user: status.uid
			},
			function(data) {
				if (!data.match(/^(online)|(away)$/)) { return }
				if (!Cryptocat.buddies.hasOwnProperty(status.name)) {
					Cryptocat.addBuddy(status.name, status.uid, data)
				}
				else {
					Cryptocat.buddyStatus(status.name, data)
				}
				if (data === 'online') {
					$('#buddy-' + status.uid).find('.loginTypeIcon')
						.removeClass('notUsingCryptocat')
					$('#buddy-' + status.uid).find('.buddyMenu').show()
					if (Cryptocat.me.currentBuddy === Cryptocat.buddies[status.name].id) {
						$('#encryptionStatus').html(
							Mustache.render(Cryptocat.templates.encryptionStatus, {
								conversationStatus: Cryptocat.locale.login.conversationStatus,
								styling: 'encrypted',
								encryptionStatus: Cryptocat.locale.login.encrypted
							})
						)
					}
					Cryptocat.buddies[status.name].usingCryptocat         = true
					Cryptocat.buddies[status.name].otr.REQUIRE_ENCRYPTION = true
				}
				else {
					$('#buddy-' + status.uid).find('.loginTypeIcon')
						.addClass('notUsingCryptocat')
					$('#buddy-' + status.uid).find('.buddyMenu').hide()
					if (Cryptocat.me.currentBuddy === Cryptocat.buddies[status.name].id) {
						$('#encryptionStatus').html(
							Mustache.render(Cryptocat.templates.encryptionStatus, {
								conversationStatus: Cryptocat.locale.login.conversationStatus,
								styling: 'notEncrypted',
								encryptionStatus: Cryptocat.locale.login.notEncrypted
							})
						)
					}
					Cryptocat.buddies[status.name].usingCryptocat         = false
					Cryptocat.buddies[status.name].otr.REQUIRE_ENCRYPTION = false
				}
			}
		)
	}
}

/*
-------------------
USER INTERFACE BINDINGS
-------------------
*/

// Tabs for selecting login mode.
$('#loginTabs span').click(function() {
	Cryptocat.me.login = $(this).attr('data-login')
	$('#loginTabs span').attr('data-selected', false)
	$(this).attr('data-selected', 'true')
	$('.loginForm').hide()
	if (Cryptocat.me.login === 'cryptocat') {
		Cryptocat.storage.setItem('login', 'cryptocat')
		$('#cryptocatLogin').show()
	}
	if (Cryptocat.me.login === 'facebook') {
		Cryptocat.storage.setItem('login', 'facebook')
		$('#facebookLogin').show()
	}
})

Cryptocat.storage.getItem('login', function(login) {
	if (login === 'facebook') {
		$('[data-login=facebook]').click()
	}
	else {
		$('[data-login=cryptocat]').click()
	}
})

// Launch Facebook authentication page
$('#facebookConnect').click(function() {
	clearInterval(Cryptocat.FB.authInterval)
	if (!Cryptocat.FB.accessToken) {
		var authURL = Mustache.render(
			Cryptocat.templates.facebookAuthURL,
			{
				scope:  'xmpp_login,friends_online_presence',
				appID:  '1430498997197900',
				authID: Cryptocat.FB.authID
			}
		)
		if (navigator.userAgent === 'Chrome (Mac app)') {
			window.open(authURL)
		}
		else {
			window.open(
				authURL,
				'',
				'width=500px,height=300,top='
				+ ((screen.height / 2.6) - (300 / 2))
				+ ',left=' + ((screen.width / 2.05) - (500 / 2))
			)
		}
		Cryptocat.FB.authInterval = setInterval(function() {
			$.get(
				'https://outbound.crypto.cat/facebook/',
				{
					'id': Cryptocat.FB.authID
				},
				function(data) {
					if (data.match(/(\w|\-){32,512}/)) {
						clearInterval(Cryptocat.FB.authInterval)
						Cryptocat.FB.prepareLogin(data)
					}
				}
			)
		}, 1000)
	}
	else {
		$.ajax({
			type: 'GET',
			url: 'https://graph.facebook.com/me/',
			data: {
				'access_token': Cryptocat.FB.accessToken
			},
			success: function() {
				Cryptocat.FB.prepareLogin(Cryptocat.FB.accessToken)
			},
			error: function() {
				Cryptocat.FB.accessToken = null
				Cryptocat.storage.removeItem('fbAccessToken')
				$('#facebookConnect').click()
			}
		})
	}
})

/*
-------------------
XMPP-RELATED FUNCTIONS
-------------------
*/

// Most of code is from (https://github.com/javierfigueroa/turedsocial).
// MIT license.

/* jshint -W106 */

/**
 * Split a string by string
 * @param delimiter string The boundary string.
 * @param string string The input string.
 * @param limit int[optional] If limit is set and positive, the returned array will contain
 * 		a maximum of limit elements with the last
 * 		element containing the rest of string.
 *
 * 		If the limit parameter is negative, all components
 * 		except the last -limit are returned.
 *
 * 		If the limit parameter is zero, then this is treated as 1.
 *
 * @returns array If delimiter is an empty string (''),
 * 		explode will return false.
 * 		If delimiter contains a value that is not
 * 		contained in string and a negative
 * 		limit is used, then an empty array will be
 * 		returned. For any other limit, an array containing
 * 		string will be returned.
 */
var explode = function(delimiter, string, limit) {
	var emptyArray = { 0: '' }
	// third argument is not required
	if ( arguments.length < 2 ||
		typeof arguments[0] === 'undefined' || typeof arguments[1] === 'undefined' ) {
		return null
	}
	if ( delimiter === '' || delimiter === false ||
		delimiter === null ) {
		return false
	}
	if ( typeof delimiter === 'function' || typeof delimiter === 'object' ||
		typeof string === 'function' || typeof string === 'object' ) {
			return emptyArray
	}
	if ( delimiter === true ) {
		delimiter = '1'
	}
	if (!limit) {
		return string.toString().split(delimiter.toString())
	}
	else {
		// support for limit argument
		var splitted = string.toString().split(delimiter.toString())
		var partA = splitted.splice(0, limit - 1)
		var partB = splitted.join(delimiter.toString())
		partA.push(partB)
		return partA
	}
}

/**
 *  Handler for X-FACEBOOK-PLATFORM SASL authentication.
 *
 *  @param (XMLElement) elem - The challenge stanza.
 *
 *  @returns false to remove the handler.
 */

Strophe.Connection.prototype._sasl_challenge1_fb = function(elem) {
	/* jshint -W106 */
	var challenge = Base64.decode(Strophe.getText(elem))
	var nonce     = ''
	var method    = ''
	var version   = ''
	// remove unneeded handlers
	this.deleteHandler(this._sasl_failure_handler)
	var challenges = explode('&', challenge)
	for(var i=0; i < challenges.length; i++) {
		var map = explode('=', challenges[i])
		switch (map[0]) {
			case 'nonce':
				nonce = map[1]
				break
			case 'method':
				method = map[1]
				break
			case 'version':
				version = map[1]
				break
	  }
	}
	var responseText = ''
	responseText += 'api_key=' + this.apiKey
	responseText += '&call_id=' + (Math.floor(new Date().getTime()/1000))
	responseText += '&method=' + method
	responseText += '&nonce=' + nonce
	responseText += '&access_token=' + this.accessToken
	responseText += '&v=' + '1.0'
	this._sasl_challenge_handler = this._addSysHandler(
		this._sasl_digest_challenge2_cb.bind(this), null,
		'challenge', null, null)
	this._sasl_success_handler = this._addSysHandler(
		this._sasl_success_cb.bind(this), null,
		'success', null, null)
	this._sasl_failure_handler = this._addSysHandler(
		this._sasl_failure_cb.bind(this), null,
		'failure', null, null)
	this.send($build('response', {
		xmlns: Strophe.NS.SASL
	}).t(Base64.encode(responseText)).tree())
	return false
}

/**
 *  Handler for initial connection request with Facebokk.
 *
 *  This handler is used to process the initial connection request
 *  response from the BOSH server. It is used to set up authentication
 *  handlers and start the authentication process.
 *
 *  SASL authentication will be attempted if available, otherwise
 *  the code will fall back to legacy authentication.
 *
 *  @param (Strophe.Request) req - The current request.
 */
Strophe.Connection.prototype._connect_fb = function (req) {
	/* jshint -W106 */
	Strophe.info('_connect_fb was called')

	this.connected = true
	var bodyWrap = req.getResponse()
	if (!bodyWrap) { return }

	this.xmlInput(bodyWrap)
	this.rawInput(Strophe.serialize(bodyWrap))

	var typ = bodyWrap.getAttribute('type')
	var cond, conflict
	if (typ !== null && typ === 'terminate') {
		// an error occurred
		cond = bodyWrap.getAttribute('condition')
		conflict = bodyWrap.getElementsByTagName('conflict')
		if (cond !== null) {
			if (cond === 'remote-stream-error' && conflict.length > 0) {
				cond = 'conflict'
			}
			this._changeConnectStatus(Strophe.Status.CONNFAIL, cond)
		} else {
			this._changeConnectStatus(Strophe.Status.CONNFAIL, 'unknown')
		}
		return
	}

	// check to make sure we don't overwrite these if _connect_fb is
	// called multiple times in the case of missing stream:features
	if (!this.sid) {
		this.sid = bodyWrap.getAttribute('sid')
	}
	if (!this.stream_id) {
		this.stream_id = bodyWrap.getAttribute('authid')
	}
	var wind = bodyWrap.getAttribute('requests')
	if (wind) { this.window = wind }
	var hold = bodyWrap.getAttribute('hold')
	if (hold) { this.hold = hold }
	var wait = bodyWrap.getAttribute('wait')
	if (wait) { this.wait = wait }

	var mechanisms = bodyWrap.getElementsByTagName('mechanism')
	var i, mech, xfacebook
	if (mechanisms.length === 0) {
		// we didn't get stream:features yet, so we need wait for it
		// by sending a blank poll request
		var body = this._buildBody()
		this._requests.push(
			new Strophe.Request(
				body.tree(),
				this._onRequestStateChange.bind(
					this, this._connect_fb.bind(this)
				),
				body.tree().getAttribute('rid')
			)
		)
		this._throttledRequestHandler()
		return
	}
	else {
		for (i = 0; i < mechanisms.length; i++) {
			mech = Strophe.getText(mechanisms[i])
			if (mech === 'X-FACEBOOK-PLATFORM') {
				xfacebook = true
				break
			}
		}
	}
	if (!xfacebook)	{
		return
	}
	this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null)
	this._sasl_challenge_handler = this._addSysHandler(
		this._sasl_challenge1_fb.bind(this), null,
		'challenge', null, null)
	this._sasl_failure_handler = this._addSysHandler(
		this._sasl_challenge1_fb.bind(this), null,
		'failure', null, null)

	this.send($build('auth', {
		xmlns:     Strophe.NS.SASL,
		mechanism: 'X-FACEBOOK-PLATFORM'
	}).tree())
}

/**
 *  Starts the connection process with facebok XMPP Chat Server.
 *
 *  As the connection process proceeds, the user supplied callback will
 *  be triggered multiple times with status updates.  The callback
 *  should take two arguments - the status code and the error condition.
 *
 *  The status code will be one of the values in the Strophe.Status
 *  constants.  The error condition will be one of the conditions
 *  defined in RFC 3920 or the condition 'strophe-parsererror'.
 *
 *  Please see XEP 124 for a more detailed explanation of the optional
 *  parameters below.
 *
 *  @param (String) jid - The user's JID. It must be facebookid@chat.facebook.com,
 *      where facebook id is the number id of the facebook profile
 *  @param (Function) callback The connect callback function.
 *  @param (Integer) wait - The optional HTTPBIND wait value.  This is the
 *      time the server will wait before returning an empty result for
 *      a request.  The default setting of 60 seconds is recommended.
 *      Other settings will require tweaks to the Strophe.TIMEOUT value.
 *  @param (Integer) hold - The optional HTTPBIND hold value.  This is the
 *      number of connections the server will hold at one time.  This
 *      should almost always be set to 1 (the default).
 *  @param apiKey The API key of our Facebook Application
 *  @param sessionKey The actual session key for the user who we are attempting to log in
 */
Strophe.Connection.prototype.facebookConnect = function(jid, callback, wait, hold, apiKey, accessToken) {
	/* jshint -W106 */
	this.jid = jid
	this.connect_callback = callback
	this.disconnecting = false
	this.connected = false
	this.authenticated = false
	this.errors = 0
	this.apiKey = apiKey
	this.accessToken = accessToken
	this.wait = wait || this.wait
	this.hold = hold || this.hold
	// parse jid for domain and resource
	this.domain = Strophe.getDomainFromJid(this.jid)
	// build the body tag
	var body = this._buildBody().attrs({
		to: this.domain,
		'xml:lang': 'en',
		wait: this.wait,
		hold: this.hold,
		content: 'text/xml; charset=utf-8',
		ver: '1.6',
		'xmpp:version': '1.0',
		'xmlns:xmpp': Strophe.NS.BOSH
	})
	this._changeConnectStatus(Strophe.Status.CONNECTING, null)
	this._requests.push(
		new Strophe.Request(
			body.tree(),
			this._onRequestStateChange.bind(
				this, this._connect_fb.bind(this)
			),
			body.tree().getAttribute('rid')
		)
	)
	this._throttledRequestHandler()
}

})