Array.prototype.pickRandom = function () {
    return this[Math.floor(Math.random() * this.length)];
}

window.randomColor = function() {
  var palette = [
    "#cc523d",
    "#41bfb6",
    "#379b46",
    "#255c96",
    "#7f0219",
    "#1f1a2d",
    "#253e44",
    "#9e5a22",
    "#4b026d"
  ];

  return palette.pickRandom();
} 