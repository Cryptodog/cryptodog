#!/bin/bash

function bprint() {
  echo -e -n "\033[1;36m[*] "
  echo -e -n '\033[0m'
  echo -e -n "\033[1;32m"
  echo $@
  echo -e -n '\033[0m'
}

function bgit() {
  bprint ">" git clone $1 $2
  git clone $1 $2
}

function tmp() {
  echo /tmp/gitlib-$(cat /dev/urandom | head -1 | sha256sum | cut -c1-20)
}

function installCryptoLibs() {
  bprint installing cryptography libraries...
  OTRLIB=$(tmp)
  bgit https://github.com/Cryptodog/otr.git $OTRLIB
  cp $OTRLIB/build/otr.js js/lib/otr.js
  rm -rf $OTRLIB
}

function installSuperp00tEtc() {
  bprint installing Efficient Transfer Coding...
  ETCLIB=$(tmp)
  bgit https://github.com/superp00t/etc-js.git $ETCLIB
  cp $ETCLIB/dist/superp00t-etc.min.js js/lib/superp00t-etc.min.js
  rm -rf $ETCLIB
}

installCryptoLibs
installSuperp00tEtc