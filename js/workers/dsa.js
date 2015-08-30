/*global DSA */
;(function (root) {
	"use strict";

	root.OTR = {}
	root.DSA = {}

	// default imports
	var imports = [
		'../lib/crypto-js.js',
		'../lib/salsa20.js',
		'../etc/random.js',
		'../lib/bigint.js',
		'../lib/eventemitter.js',
		'../lib/otr.js'
	]

	function sendMsg(type, val) {
		postMessage({ type: type, val: val })
	}

	onmessage = function (e) {
		var data = e.data;
		importScripts.apply(root, imports)
		Cryptocat.random.setSeed(data.seed)
		if (data.debug) { sendMsg('debug', 'DSA key creation started') }
		var dsa = new DSA()
		if (data.debug) { sendMsg('debug', 'DSA key creation finished') }
		sendMsg('data', dsa.packPrivate())
	}

}(this))