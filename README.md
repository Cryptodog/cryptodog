# Cryptodog Web Client

Cryptodog is a fork of the popular encrypted messaging program, [Cryptocat](https://github.com/cryptocat/cryptocat). Unfortunately, the latter hasn't been updated in several months, and it looks like development may never resume. The goal of this project is to fix bugs in the original code and add new features so that Cryptocat remains usable.

This repository contains a pure JavaScript client you can either run locally in your browser, or via our hosted service at https://cryptodog.github.io/webclient.

## Differences from Cryptocat
* Dark theme
* Better tab-autocomplete (tolerant of typos)
* Other users can't log out and log back in to be unignored
* Vector icons (better scaling on hiDPI displays and zoom levels other than 100%)
* Colored names in chat to improve readability
* Desktop notifications
* Unicode emoticons (may be removed; lousy support in some browsers)
* Amazing Halloween theme
* Minor animation tweaks & additions
* Different bugs

## Todo

* Remove superfluous browser-specific code.

    The obvious culprits have been deleted, but if you see something related to Chrome/Firefox/Mac, verify that it's redundant and remove it.

* Remove Facebook support.

    Mostly done. Language files and locale.js still contain references to FB, but these are opaque to the user.

* Update libs and corresponding code calls!

* Add semicolons to JS files.

* Use cookies for option storage instead of addon APIs.

* Add support for capital letters in nicknames.

    Need to make sure this doesn't mess up any XMPP stuff first.

* Change code and UI references from "cryptocat" to "cryptodog".

    Mostly done, only locales left to do.

* Make dog logo.

* Add more emoticons.

* Convert cat facts to dog facts.

* Convert line-number based localization to JSON based system

## Thanks
* xor - UI Rework, misc patches
