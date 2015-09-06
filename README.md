# Cryptodog Web Client

Cryptodog is a fork of the popular encrypted messaging program, Cryptocat. Unfortunately, the latter hasn't been updated in several months, and it looks like development may never resume. The goal of this project is to fix bugs in the original code and add new features so that Cryptocat remains usable.

This repository contains a pure JavaScript client you can either run locally in your browser, or via our hosted service at https://cryptodog.github.io/webclient.

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

* Make dog logo.

* Add more emoticons.

* Convert cat facts to dog facts.