Cryptodog.cmd = {};
Cryptodog.cmd.commands = {
  enable_compose: {
    description: "Enable composing notifications",
    cb: function() {
      Cryptodog.compose = true;
    }
  },

  disable_compose: {
    description: "Disable composing notifications",
    cb: function() {
      Cryptodog.compose = false;
    }
  }
};

Cryptodog.cmd.textTransforms = {
  "/shrug":     [ /\/shrug/g,     "¯\\_(ツ)_/¯" ],
  "/tableflip": [ /\/tableflip/g, "(╯°□°）╯︵ ┻━┻"],
  "/unflip":    [ /\/unflip/g,    "┬─┬ノ( º _ ºノ)"],
  "/srs":       [ /\/srs/g,       "ಠ_ಠ"],
  "/joy":       [ /\/joy/g,       "(/◕ヮ◕)/"],
  "/lenny":     [ /\/lenny/g,     "( ͡° ͜ʖ ͡°)"],
  "/terror":    [ /\/terror/g,    "(╬ ಠ益ಠ)"]
};

Cryptodog.cmd.interpret = function(text) {
  var tokens = text.split("");

  var tt = false;
  for (var tx in Cryptodog.cmd.textTransforms) {
    if (text.startsWith(tx)) {
      tt = true;
      break;
    }
  }

  if (tokens[0] === "/" && !tt) {
    var cmd  = tokens.slice(1).join("");
    var args = cmd.split(" ");

    var obj = Cryptodog.cmd.commands[args[0]]

    if (typeof obj !== "object") {
      return "";
    }

    if (typeof obj.cb !== "function") {
      return "";
    }
  
    var text = obj.cb(args.slice(1));
    if (!text) {
      return "";
    }

    return text;
  }

  for (var tk in Cryptodog.cmd.textTransforms) {
    text = text.replace(Cryptodog.cmd.textTransforms[tk][0], Cryptodog.cmd.textTransforms[tk][1]);
  }

  for (var tk in ZIPmoji.markup) {
    var rgx = new RegExp(escapeRegExp(":" + tk + ":"), "g");
    text = text.replace(rgx, ZIPmoji.markup[tk]);
  }

  return text;
}

Cryptodog.cmd.head = function () {
  var buffer = $("#userInputText").val();
  var words = buffer.split(" ");
  var head = words[words.length-1];
  return head;
}

Cryptodog.cmd.maxSuggestions = 8;

Cryptodog.cmd.tabIndex = 0;
Cryptodog.cmd.suggest = [];
Cryptodog.cmd.previewState = "closed";

Cryptodog.cmd.updatePreview = function(buffer) {
  if (buffer.endsWith(" ") || buffer === "") {
    Cryptodog.cmd.previewState = "closed";
    Cryptodog.cmd.hidePreview();
    return;
  }

  var words = buffer.split(" ");
  var head = words[words.length-1];

  var buddies    = [];
  var commands   = [];
  var transforms = [];
  var emojis     = [];

  for (var bud in Cryptodog.buddies) {
    if (bud.startsWith(head.toLowerCase())) {
      buddies.push(bud + ":");
    }
  }

  for (var cm in Cryptodog.cmd.commands) {
    if (head === "/") {
      commands.push("/" + cm);
      continue;
    }

    if (head.split("")[0] === "/" && cm.startsWith(head.split("").slice(1).join(""))) {
      commands.push("/" + cm);
      continue;
    }
  }

  for (var tk in Cryptodog.cmd.textTransforms) {
    if (tk.startsWith(head)) {
      transforms.push(tk);
    }
  }

  for (var em in ZIPmoji.markup) {
    var mk = ":" + em + ":";

    if (mk.startsWith(head)) {
      emojis.push(mk);
    }
  }

  Cryptodog.cmd.tabIndex = 0;
  Cryptodog.cmd.suggest = [];
  var html = "";
  var idx  = 0;

  buddies.sort();

  if (buddies.length > 0) {
    html += "<h3>Buddies</h3>";

    for (var b in buddies) {
      var bud = buddies[b];
      html += `<div id="suggest-${idx}" class="commandSelection"><span>${Mustache.escape(bud)}</span></div>`;
      Cryptodog.cmd.suggest.push(bud);
      idx++;
    }
  }

  if (commands.length > 0) {
    html += "<h3>Commands</h3>";

    for (var i in commands) {
      var cssclass = ["commandSelection"];

      html += `<div id="suggest-${idx}" class="${cssclass.join(" ")}"><span>${commands[i]}</span>`;
      var key = commands[i].split("").slice(1).join("");
      html += `<span class="desc">${Cryptodog.cmd.commands[key].description}</span></div>`
      Cryptodog.cmd.suggest.push(commands[i]);
      idx++;
    }
  }

  if (transforms.length > 0) {
    html += "<h3>Text Transforms</h3>";

    for (var i in transforms) {
      html += `<div id="suggest-${idx}" class="commandSelection"><span>${Mustache.escape(transforms[i])}</span><span class="desc">${Mustache.escape(Cryptodog.cmd.textTransforms[transforms[i]][1])}</span></div>`;
      Cryptodog.cmd.suggest.push(transforms[i]);
      idx++;
    }
  }

  if (emojis.length > Cryptodog.cmd.maxSuggestions) {
    emojis = emojis.slice(0, Cryptodog.cmd.maxSuggestions);
  }

  if (emojis.length > 0) {
    html += "<h3>Emoji</h3>";

    var zm = new ZIPmoji();

    for (var e in emojis) {
      var em = emojis[e];
      var stripped = em.replace(/:/g, "");
      html += `<div id="suggest-${idx}" class="commandSelection"><span>${em}</span><span class="desc">${zm.process(ZIPmoji.markup[stripped])}</span></div>`;
      Cryptodog.cmd.suggest.push(em);
      idx++;
    }
  }

  if (html === "") {
    $("#commandPreview").hide();
    return;
  }

  $("#commandPreview").show();
  $("#commandPreview").html(html);

  $("#suggest-0").addClass("commandSelected");
}

Cryptodog.cmd.replaceHead = function() {
  var buffer = $("#userInputText").val();

  if (buffer.length === 0) {
    $("#userInputText").val(Cryptodog.cmd.suggest[Cryptodog.cmd.tabIndex]);
    return;
  }

  var words = buffer.split(" ");
  var head = words[words.length-1];

  var prefix = words.slice(0, words.length-1);

  prefix = prefix.concat(Cryptodog.cmd.suggest[Cryptodog.cmd.tabIndex]);

  $("#userInputText").val(prefix.join(" "));
} 

Cryptodog.cmd.hidePreview = function() {
  $("#commandPreview").html("");
  $("#commandPreview").hide();
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
