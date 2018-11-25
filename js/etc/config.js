if (typeof Cryptodog === 'undefined') { Cryptodog = function() {} }

Cryptodog.config = {};

Cryptodog.loadConfig = async function() {
  const r = await fetch("config.json");
  const cfg = await r.json();
  Cryptodog.config = cfg;

  if (!Cryptodog.config.mods) {
    Cryptodog.config.mods = [];
  }

  if (!Cryptodog.config.customServers) {
    Cryptodog.config.customServers = [];
  }
}
