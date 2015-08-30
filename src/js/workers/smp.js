;(function (root) {
	'use strict';

	root.OTR = {}

	var imports = [
		'../lib/crypto-js.js',
		'../lib/salsa20.js',
		'../etc/random.js',
		'../lib/bigint.js',
		'../lib/eventemitter.js',
		'../lib/otr.js'
	]

	var wrapPostMessage = function(method) {
		return function () {
			postMessage({
				method: method,
				args: Array.prototype.slice.call(arguments, 0)
			})
		}
	}

	var sm
	onmessage = function(e) {
		var data = e.data
		switch (data.type) {
			case 'seed':
				importScripts.apply(root, imports)
				Cryptocat.random.setSeed(data.seed)
				break
			case 'init':
				sm = new root.OTR.SM(data.reqs)
				;['trust','question', 'send', 'abort'].forEach(function (m) {
					sm.on(m, wrapPostMessage(m));
				})
				break
			case 'method':
				sm[data.method].apply(sm, data.args)
				break
		}
	}

}(this))
