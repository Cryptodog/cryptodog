// curve25519

;(function (root, factory) {

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./bigint.js'))
  } else {
    root.Curve25519 = factory(root.BigInt)
  }

}(this, function (BigInt) {
'use strict';

// In order to generate a public value:
//	priv = BigInt.randBigInt(256)
//	pub = scalarMult(priv, basePoint)
//
// In order to perform key agreement:
//	shared = scalarMult(myPrivate, theirPublic)

var Curve25519 = function () {}

// p25519 is the curve25519 prime: 2^255 - 19
Curve25519.p25519 = BigInt.str2bigInt('7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed', 16)
// p25519Minus2 = 2^255 - 21
var p25519Minus2 = BigInt.str2bigInt('7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeb', 16)
// a is a parameter of the elliptic curve
var a = BigInt.str2bigInt('486662', 10)
// basePoint is the generator of the elliptic curve group
var basePoint = BigInt.str2bigInt('9', 10)

// These variables are names for small, bigint constants.
var four = BigInt.str2bigInt('4', 10)

// groupAdd adds two elements of the elliptic curve group in Montgomery form.
function groupAdd(x1, xn, zn, xm, zm) {
	// x₃ = 4(x·x′ - z·z′)² · z1
	var xx = BigInt.multMod(xn, xm, Curve25519.p25519)
	var zz = BigInt.multMod(zn, zm, Curve25519.p25519)
	var d
	if (BigInt.greater(xx, zz)) {
		d = BigInt.sub(xx, zz)
	} else {
		d = BigInt.sub(zz, xx)
	}
	var sq = BigInt.multMod(d, d, Curve25519.p25519)
	var outx = BigInt.multMod(sq, four, Curve25519.p25519)

	// z₃ = 4(x·z′ - z·x′)² · x1
	var xz = BigInt.multMod(xm, zn, Curve25519.p25519)
	var zx = BigInt.multMod(zm, xn, Curve25519.p25519)
	if (BigInt.greater(xz, zx)) {
		d = BigInt.sub(xz, zx)
	} else {
		d = BigInt.sub(zx, xz)
	}
	sq = BigInt.multMod(d, d, Curve25519.p25519)
	var sq2 = BigInt.multMod(sq, x1, Curve25519.p25519)
	var outz = BigInt.multMod(sq2, four, Curve25519.p25519)

	return [outx, outz]
}

// groupDouble doubles a point in the elliptic curve group.
function groupDouble(x, z) {
	// x₂ = (x² - z²)²
	var xx = BigInt.multMod(x, x, Curve25519.p25519)
	var zz = BigInt.multMod(z, z, Curve25519.p25519)
	var d
	if (BigInt.greater(xx, zz)) {
		d = BigInt.sub(xx, zz)
	} else {
		d = BigInt.sub(zz, xx)
	}
	var outx = BigInt.multMod(d, d, Curve25519.p25519)

	// z₂ = 4xz·(x² + Axz + z²)
	var s = BigInt.add(xx, zz)
	var xz = BigInt.multMod(x, z, Curve25519.p25519)
	var axz = BigInt.mult(xz, a)
	s = BigInt.add(s, axz)
	var fourxz = BigInt.mult(xz, four)
	var outz = BigInt.multMod(fourxz, s, Curve25519.p25519)

	return [outx, outz]
}

// scalarMult calculates i*base in the elliptic curve.
Curve25519.scalarMult = function (scalar, base) {
	var x1 = BigInt.str2bigInt('1', 10)
	var z1 = BigInt.str2bigInt('0', 10)
	var x2 = base
	var z2 = BigInt.str2bigInt('1', 10)
	var point

	// Highest bit is one
	point = groupAdd(base, x1, z1, x2, z2)
	x1 = point[0]
	z1 = point[1]
	point = groupDouble(x2, z2)
	x2 = point[0]
	z2 = point[1]

	for (var i = 253; i >= 3; i--) {
		if (BigInt.getBit(scalar, i)) {
			point = groupAdd(base, x1, z1, x2, z2)
			x1 = point[0]
			z1 = point[1]
			point = groupDouble(x2, z2)
			x2 = point[0]
			z2 = point[1]
		} else {
			point = groupAdd(base, x1, z1, x2, z2)
			x2 = point[0]
			z2 = point[1]
			point = groupDouble(x1, z1)
			x1 = point[0]
			z1 = point[1]
		}
	}

	// Lowest 3 bits are zero
	for (i = 2; i >= 0; i--) {
		point = groupDouble(x1, z1)
		x1 = point[0]
		z1 = point[1]
	}

	var z1inv = BigInt.powMod(z1, p25519Minus2, Curve25519.p25519)
	var x = BigInt.multMod(z1inv, x1, Curve25519.p25519)

	return x
}


// P256

// var priv = BigInt.randBigInt(256)
// var pub = scalarMultP256(p256Gx, p256Gy, priv)
// var message = BigInt.str2bigInt('2349623424239482634', 10)

// p256 is the p256 prime
// var p256 = BigInt.str2bigInt('115792089210356248762697446949407573530086143415290314195533631308867097853951', 10)
// n256 is the number of points in the group
// var n256 = BigInt.str2bigInt('115792089210356248762697446949407573529996955224135760342422259061068512044369', 10)
// b256 is a parameter of the curve
// var b256 = BigInt.str2bigInt('5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b', 16)
// p256Gx and p256Gy is the generator of the group
// var p256Gx = BigInt.str2bigInt('6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296', 16)
// var p256Gy = BigInt.str2bigInt('4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5', 16)

Curve25519.privateKeyToString = function(p){
	return BigInt.bigInt2str(p, 64)
}

Curve25519.privateKeyFromString = function(s){
	return BigInt.str2bigInt(s, 64)
}

Curve25519.sigToString = function(p){
	return JSON.stringify([BigInt.bigInt2str(p[0], 64), BigInt.bigInt2str(p[1], 64)])
}

Curve25519.sigFromString = function(s){
	var p = JSON.parse(s)
	p[0] = BigInt.str2bigInt(p[0], 64)
	p[1] = BigInt.str2bigInt(p[1], 64)
	return p
}

Curve25519.publicKeyToString = function(p){
	return JSON.stringify([BigInt.bigInt2str(p[0], 64), BigInt.bigInt2str(p[1], 64)])
}

Curve25519.publicKeyFromString = function(s){
	var p = JSON.parse(s)
	p[0] = BigInt.str2bigInt(p[0], 64)
	p[1] = BigInt.str2bigInt(p[1], 64)
	return p
}

// isOnCurve returns true if the given point is on the curve.
// function isOnCurve(x, y) {
// 	// y² = x³ - 3x + b
// 	var yy = BigInt.multMod(y, y, p256)
// 	var xxx = BigInt.multMod(x, BigInt.mult(x, x), p256)
// 	var threex = BigInt.multMod(three, x, p256)
// 	var s = BigInt.add(xxx, b256)
// 	if (BigInt.greater(threex, s)) {
// 		return false
// 	}
// 	s = BigInt.sub(s, threex)
// 	return BigInt.equals(s, yy)
// }


Curve25519.ecDH = function(priv, pub) {
	if (typeof pub === 'undefined') {
		return Curve25519.scalarMult(priv, basePoint)
	}
	else {
		return Curve25519.scalarMult(priv, pub)
	}
}

return Curve25519

}))
