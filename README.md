# Cryptodog Web Client

A pure JavaScript client you can either run locally in your browser, or via our hosted service.

## Todo

* Remove superfluous browser-specific code.

    Marked for removal:
      * chrome.js
      * manifest.json
      * firstRun.html
      * css/firstRun.css
      * img/firstRun/*

* Remove Facebook support.

    People have complained that FB integration doesn't work anymore, and it's too much difficulty to maintain with little payoff.

    **UPDATE** Facebook dropped XMPP support a while ago, so this feature is impossible to fix.

* Add support for capital letters in nicknames.

    Need to make sure this doesn't mess up any XMPP stuff first.

* Change code and UI references from "cryptocat" to "cryptodog".

* Change logo.

* Update libs if possible.

* Add more emoticons.

* Add more cat facts.

* Use cookies for option storage instead of addon APIs.
