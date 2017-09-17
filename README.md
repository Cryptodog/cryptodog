![Cryptodog](https://raw.githubusercontent.com/Cryptodog/cryptodog/master/img/logo-128.png)

# Cryptodog

Cryptodog is a community fork of the **original**, browser-based encrypted chat app, [Cryptocat](https://web.archive.org/web/20151217150336/https://crypto.cat/).

We offer two things:

* A modified Cryptocat client, tweaked for performance, aesthetics, and usability
* A public server fully compatible with both clients

## Differences from Cryptocat

* Dark theme with more contrast, easier on eyes
* General and security bug fixes
* Better tab-complete
* Loads faster
* Vector icons (better scaling on hiDPI displays and zoom levels other than 100%)
* Slight animation tweaks and additions
* Your ignore list persists across your session
* Colored names in chat to improve readability
* Desktop notifications
* Unicode emoticons
* Easier to localize

## Usage

The recommended way to run Cryptodog is via our [Chrome/Chromium extension](https://chrome.google.com/webstore/detail/cryptodog/blnkmmamdbladdaaddkjbecbphngeiec). This ensures you always have the official, most recent version. A Firefox extension will be released in the near future.

If you don't care about that and just want to test out Cryptodog, we have a [hosted client on GitHub Pages](https://cryptodog.github.io). You should be able to access it from most mobile browsers as well.

Or, if you prefer the stock Cryptocat extension, that's fine too. The official Cryptocat addon is compatible with our server. Just enter this information in the "Custom server" dialog:

**Domain**: crypto.dog

**XMPP Conference Server**: conference.crypto.dog

**BOSH/WebSocket Relay**: https://crypto.dog/http-bind

Bug reports are welcome, and in fact, encouraged. If you find a bug in either the Cryptodog client or server, please open an issue here on the GitHub repository.

## Security Caveats

Cryptodog is experimental software. It is suitable for educational and casual purposes only.

**Do not use Cryptodog if you have a strong need for anonymity and privacy**. This includes journalists, sources, activists, and citizens of oppressive countries.

### Technical

Cryptodog is based on version 2.2.2 of Cryptocat. The vast majority of changes are UI-related; neither the client cryptography nor server backend have been modified. However, this does not preclude Cryptodog from introducing vulnerabilities not present in Cryptocat.

For further details regarding Cryptodog's security model, see the [Cryptocat Wiki](https://web.archive.org/web/20160216105404/https://github.com/cryptocat/cryptocat/wiki).
