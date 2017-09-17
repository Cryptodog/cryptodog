# Contributing

We welcome contributions to Cryptodog.

This guide applies equally to outside contributors and project maintainers.

## Coding Style
- Use semicolons.
- Use single quotes.
- Put braces on the same line as conditionals, loops, functions, etc.
- Use camelCase for variable names.
- Use sensible, meaningful variable names.
- Indent with 4 spaces. Don't use tabs. (This needs the most work; we have inconsistency here.)

(Note: much of the code base doesn't actually follow this style and needs to be cleaned up.)

Apart from these guidelines, we're not very picky about your style.

## Pull Requests
TODO

## General Bugs
TODO

## Security Bugs
TODO

## Branches
The two main branches are `master` and `gh-pages`. 

`master` contains bleeding-edge code, and it may not always be stable. Most changes will go straight to `master` before they end up anywhere else.

On the other hand, `gh-pages` contains the code for our hosted client, https://cryptodog.github.io. It should always be as stable as possible, which means thoroughly testing changes before merging them here.

If you find yourself immediately merging more than a couple lines of code from `master` into `gh-pages`, you're probably doing it wrong.

All other code (experimental, tests, etc.) should go in their own branches.
