if (typeof Cryptocat === 'undefined') {
	Cryptocat = function() {}
}

;(function (root, factory) {
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = factory({}, require('../lib/salsa20.js'), true)
	} else {
		if (typeof root.Cryptocat === 'undefined') {
			root.Cryptocat = function () {}
		}
		factory(root.Cryptocat, root.Salsa20, false)
	}
}(this, function (Cryptocat, Salsa20, node) {
'use strict';

Cryptocat.random = {}

var state

Cryptocat.random.generateSeed = function() {
	var buffer, crypto
	// Node.js ... for tests
	if (typeof window === 'undefined' && typeof require !== 'undefined') {
		crypto = require('crypto')
		try {
			buffer = crypto.randomBytes(40)
		} catch (e) { throw e }
	}
	else {
		buffer = new Uint8Array(40)
		window.crypto.getRandomValues(buffer)
	}
	return buffer
}

Cryptocat.random.setSeed = function(s) {
	if (!s) { return false }
	state = new Salsa20(
		[
			s[ 0],s[ 1],s[ 2],s[ 3],s[ 4],s[ 5],s[ 6],s[ 7],
			s[ 8],s[ 9],s[10],s[11],s[12],s[13],s[14],s[15],
			s[16],s[17],s[18],s[19],s[20],s[21],s[22],s[23],
			s[24],s[25],s[26],s[27],s[28],s[29],s[30],s[31]
		],
		[
			s[32],s[33],s[34],s[35],s[36],s[37],s[38],s[39]
		]
	)
}

Cryptocat.random.getBytes = function(i) {
	if (i.constructor !== Number || i < 1) {
		throw new Error('Expecting a number greater than 0.')
	}
	return state.getBytes(i)
}

Cryptocat.random.bitInt = function(k) {
	if (k > 31) {
		throw new Error('That\'s more than JS can handle.')
	}
	var i = 0, r = 0
	var b = Math.floor(k / 8)
	var mask = (1 << (k % 8)) - 1
	if (mask) {
		r = Cryptocat.random.getBytes(1)[0] & mask
	}
	for (; i < b; i++) {
		r = (256 * r) + Cryptocat.random.getBytes(1)[0]
	}
	return r
}

Cryptocat.random.decimal = function() {
	var r = 250;
	while ( r > 249 ) {
		r = Cryptocat.random.getBytes(1)[0]
	}
	return r % 10;
}

Cryptocat.random.rawBytes = function(bytes) {
	var sa = String.fromCharCode.apply(null, Cryptocat.random.getBytes(bytes))
	return CryptoJS.enc.Latin1.parse(sa)
}

Cryptocat.random.encodedBytes = function(bytes, encoding) {
	return Cryptocat.random.rawBytes(bytes).toString(encoding)
}

if (node) {
	// Seed RNG in tests.
	Cryptocat.random.setSeed(Cryptocat.random.generateSeed())
}

return Cryptocat

}))//:3
