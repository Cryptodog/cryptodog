# Cryptodog

Cryptodog is a community fork of the popular encrypted messaging app, [Cryptocat](https://github.com/cryptocat/cryptocat). Unfortunately, Cryptocat hasn't been updated in several months, and it looks like development may never resume. The goal of this project is to fix bugs in the original code and add new features.

## Differences from Cryptocat

Dark theme with more contrast, easier on eyes
Better tab-complete
Loads faster
Vector icons (better scaling on hiDPI displays and zoom levels other than 100%)
Slight animation tweaks and additions
Your ignore list persists across your session
Colored names in chat to improve readability
Desktop notifications
Unicode emoticons
Easier to localize
And of course, different bugs (if you catch any, please don't hesitate to open an issue or pull request here!)

## Install
Signed Chrome and Firefox extensions are on the roadmap.

In the meantime, you can load this repository as an unpacked Chrome extension (in developer mode), or you can use our hosted client at: https://cryptodog.github.io

## Note on security

Please note that Cryptodog is experimental software, and unlike Cryptocat, has not had an independent security audit or code review. Although we have purposely avoided touching the underlying cryptography thus far, it is absolutely possible that Cryptodog introduces vulnerabilities not present in Cryptocat. Please do not use this app if you're in a high-risk situation or have any doubts about your safety.

## Coding Style

When working on the code, please follow these rules:
* Use semicolons at the end of statements
* Use double-quotes (" ") instead of single-quotes (' ') for strings
* Use `item.key` notation instead of `item["key"]` notation when possible

## Thanks
* xor - UI Rework, misc patches
