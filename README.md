[![bitHound Score](https://www.bithound.io/github/Cryptodog/cryptodog-webclient/badges/score.svg)](https://www.bithound.io/github/Cryptodog/cryptodog-webclient)

# Cryptodog Web Client

Cryptodog is a fork of the popular encrypted messaging program, [Cryptocat](https://github.com/cryptocat/cryptocat). Unfortunately, Cryptocat hasn't been updated in several months, and it looks like development may never resume. The goal of this project is to fix bugs in the original code and add new features so that Cryptocat remains usable.

This repository contains a pure JavaScript client you can either run locally in your browser, or via our hosted service at https://cryptodog.github.io/webclient.

## Differences from Cryptocat
* Dark theme
* Better tab-autocomplete (tolerant of typos)
* Other users can't log out and log back in to be unignored
* Vector icons (better scaling on hiDPI displays and zoom levels other than 100%)
* Colored names in chat to improve readability
* Desktop notifications
* Unicode emoticons (may be removed; lousy support in some browsers)
* Minor animation tweaks & additions
* Different bugs
* Loads faster
* Easier to localize

## Local Usage

Cryptodog can be used with file:/// URIs, as well as with a local webserver.
It is recommended to use the local webserver approach when possible, as some features do not function on file:// URIs.

If you are using file:///, use branch **master**, if you are using a local webserver, use branch **gh-pages**.
All branches other than *master* have issues with loading language files on file:/// due to limitations of the protocol.

## Localization

*This section does not apply to master*

Cryptodog handles localization differently from Cryptocat. A list of all languages available, and their aliases are stored in `lang/langlist.json`. The file has the following syntax:
```json
{
    "languages": [
        "lang1",
        "lang2"
    ],
    "aliases": {
        "alias1": "lang1",
        "alias2": "lang2",
        "alias3": "lang1"
    }
}
```
`languages` is a list of all the languages available, excluding aliases. These must match the name of a JSON file in `lang`.

`aliases` is a list of language aliases, in the form `"alias": "target"`.

If the locale is set to a language that cannot be found, the client will log a warning and default to `en-us`. If the client also fails to load `en-us`, no language will be loaded and localizable strings will not be populated.

Cryptodog currently does not have a in-UI way of changing locale, for now type `Cryptodog.locale.set("locale", true)` (where `"locale"` is one of the locales defined in `lang/langlist.json`) into your browser's console.

## Coding Style

When working on the code, please follow these rules:
* Use semicolons at the end of statements
* Use double-quotes (" ") instead of single-quotes (' ') for strings
* Use `item.key` notation instead of `item["key"]` notation when possible

## Thanks
* xor - UI Rework, misc patches
