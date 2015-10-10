Cryptodog.storage = {}

$(window).ready(function() {
'use strict';

// Cryptodog Storage API
// This API uses different local storage solutions,
// depending on the browser engine, to offer a uniform
// storage interface for Cryptodog user preferences and settings.

// How to use:
// Cryptodog.storage.setItem(itemName, itemValue)
// Sets itemName's value to itemValue.

// Cryptodog.storage.getItem(itemName, callbackFunction(result))
// Gets itemName's value from local storage, and passes it to
// the callback function as result.

// Cryptodog.storage.removeItem(itemName)
// Removes itemName and its value from local storage.

// Define the wrapper, depending on our browser or environment.
Cryptodog.storage = (function() {
	// Use a dummy when on file: protocol
	if (window.location.protocol === 'file:'){
		return {
			setItem: function(key, val) {},
			getItem: function(key, callback) {},
			removeItem: function(key) {}
		}
	}
	// Chrome
	if (typeof(chrome) === 'object' && chrome.storage) {
		return {
			setItem: function(key, val) {
				var keyValuePair = {}
				keyValuePair[key] = val
				chrome.storage.local.set(keyValuePair)
			},
			getItem: function(key, callback) {
				chrome.storage.local.get(key, function(r) {
					callback(r[key])
				})
			},
			removeItem: function(key) {
				chrome.storage.local.remove(key)
			}
		}
	}
	// Firefox
	else if (navigator.userAgent.match('Firefox')) {
		return {
			setItem: function(key, val) {
				var element = document.createElement('cryptocatFirefoxElement')
				document.documentElement.appendChild(element)
				var evt = document.createEvent('HTMLEvents')
				element.setAttribute('type', 'set')
				element.setAttribute('key', key)
				element.setAttribute('val', val)
				evt.initEvent('cryptocatFirefoxStorage', true, false)
				element.dispatchEvent(evt)
			},
			getItem: function(key, callback) {
				var element = document.createElement('cryptocatFirefoxElement')
				document.documentElement.appendChild(element)
				var evt = document.createEvent('HTMLEvents')
				element.setAttribute('type', 'get')
				element.setAttribute('key', key)
				evt.initEvent('cryptocatFirefoxStorage', true, false)
				element.dispatchEvent(evt)
				callback(element.getAttribute('firefoxStorageGet'))
			},
			removeItem: function(key) {
				var element = document.createElement('cryptocatFirefoxElement')
				document.documentElement.appendChild(element)
				var evt = document.createEvent('HTMLEvents')
				element.setAttribute('type', 'remove')
				element.setAttribute('key', key)
				evt.initEvent('cryptocatFirefoxStorage', true, false)
				element.dispatchEvent(evt)
			}
		}
	}
	// Everything else
	else {
		return {
			setItem: function(key, value) {
				localStorage.setItem(key, value)
			},
			getItem: function(key, callback) {
				callback(localStorage.getItem(key))
			},
			removeItem: function(key) {
				localStorage.removeItem(key)
			}
		}
	}
})()

// Initialize language settings.
Cryptodog.storage.getItem('language', function(key) {
	if (key) {
		Cryptodog.locale.set(key, true)
	}
	else {
		Cryptodog.locale.set(window.navigator.language.toLowerCase())
	}
})

// Load custom server settings
Cryptodog.storage.getItem('serverName', function(key) {
	if (key) { Cryptodog.serverName = key }
})
Cryptodog.storage.getItem('domain', function(key) {
	if (key) { Cryptodog.xmpp.domain = key }
})
Cryptodog.storage.getItem('conferenceServer', function(key) {
	if (key) { Cryptodog.xmpp.conferenceServer = key }
})
Cryptodog.storage.getItem('relay', function(key) {
	if (key) { Cryptodog.xmpp.relay = key }
})
Cryptodog.storage.getItem('customServers', function(key) {
	if (key) {
		$('#customServerSelector').empty()
		var servers = $.parseJSON(key)
		$.each(servers, function(name) {
			$('#customServerSelector').append(
				Mustache.render(Cryptodog.templates['customServer'], {
					name: name,
					domain: servers[name]['domain'],
					XMPP: servers[name]['xmpp'],
					Relay: servers[name]['relay']
				})
			)
		})
	}
})

// Load nickname settings.
Cryptodog.storage.getItem('myNickname', function(key) {
	if (key) {
		$('#nickname').animate({'color': 'transparent'}, function() {
			$(this).val(key)
			$(this).animate({'color': '#FFF'})
		})
	}
})

// Load notification settings.
window.setTimeout(function() {
	Cryptodog.storage.getItem('desktopNotifications', function(key) {
		if (key === 'true') {
			$('#notifications').click()
			$('#utip').hide()
		}
	})
	Cryptodog.storage.getItem('audioNotifications', function(key) {
		if ((key === 'true') || !key) {
			$('#audio').click()
			$('#utip').hide()
		}
	})
}, 800)

})
