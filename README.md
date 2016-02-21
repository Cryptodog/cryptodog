![Cryptodog](https://raw.githubusercontent.com/Cryptodog/cryptodog/master/img/logo-128.png)

# Cryptodog

Cryptodog is a community fork of the popular encrypted messaging app, [Cryptocat](https://github.com/cryptocat/cryptocat).

## An honest statement on Cryptodog's security

By the time of its death in February 2016, Cryptocat (the first incarnation) had suffered [numerous](https://isecpartners.github.io/publications/iSEC_Cryptocat_iOS.pdf), [documented](https://leastauthority.com/static/publications/LeastAuthority-Cryptocat-audit-report.pdf) security flaws. Some were nothing short of [fatal](https://tobtu.com/decryptocat.php).

Cryptodog **retains any flaws present in Cryptocat 2.2.2**. The underlying cryptographic protocols are identical, and the implementation has not changed whatsoever. In fact, the addition of new features into Cryptodog increases its attack surface, possibly rendering it *even less secure* than Cryptocat.

This is not to be taken lightly. If you're looking for a secure, private messaging client, **look elsewhere**. [Signal](https://whispersystems.org/) and [Ricochet](https://ricochet.im/) are good places to start.

Cryptodog is best characterized as a toy. It is not secure in any true sense and will likely never be. If you're using it in a risky environment, or for anything other than casual purposes, you're using it wrong.

If you accept these facts, by all means, use Cryptodog. Just don't expect it to protect you.

## Differences from Cryptocat

* Dark theme with more contrast, easier on eyes
* Better tab-complete
* Loads faster
* Vector icons (better scaling on hiDPI displays and zoom levels other than 100%)
* Slight animation tweaks and additions
* Your ignore list persists across your session
* Colored names in chat to improve readability
* Desktop notifications
* Unicode emoticons
* Easier to localize
* And of course, different bugs (if you catch any, please don't hesitate to open an issue or pull request here!)

## Usage
Signed Chrome and Firefox extensions are on the roadmap.

In the meantime, you can load this repository as an unpacked Chrome extension (in developer mode), or you can use our hosted client at: https://cryptodog.github.io

## Coding Style

When working on the code, please follow these rules:
* Use semicolons at the end of statements
* Use double-quotes (" ") instead of single-quotes (' ') for strings
* Use `item.key` notation instead of `item["key"]` notation when possible

## Thanks
* xor - UI Rework, misc patches
