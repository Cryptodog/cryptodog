// uTip, unobtrusive tooltips for jQuery
// Version 0.1.1
// (c) Syme (git @ symeapp)
// Released under the MIT license

(function($) {

  var Utip = {};

  Utip.create = function(e){

    var $this = $(this);

    // Get data attributes
    var content   = $this.attr('data-utip'),
        gravity   = $this.attr('data-utip-gravity') || 'n', // North if not specified
        hoverable = !!$this.attr('data-utip-hoverable');
        style   = $(this).attr('data-utip-style') // Ability to add custom styling for a utip

    // Remove previous utips if previous hoverTimer didn't finish
    $('#utip').remove();

    // Create utip element and add it to body
    var $utip = $('<div id="utip" />').attr('data-gravity', gravity).html(content);
    $('body').prepend($utip);

    // Detect custom styling and apply it if it exists.
    // Example of a valid data-utip-style: {color: '#0F0', width: '50px'}
    if ( style ) {
      try {
        style = JSON.parse(style)
        for (var s in style) {
          $utip.css(s, style[s])
        }
      }
      catch(err) {
        console.log('utip:', 'could not parse custom style')
      }
    }

    // Calculate dimensions
    var elOffset        = $this.offset(),
        elDimensions    = { width: $this.outerWidth(), height: $this.outerHeight() },
        utipDimensions  = { width: $utip.outerWidth(), height: $utip.outerHeight() };

    // Position tooltip according to gravity
    var utipOffset = Utip.gravities(elOffset, elDimensions, utipDimensions)[gravity];
    $utip.css(utipOffset);

    if ( hoverable ) {

      // Bind removal on mouseleave, but allow hovering on tooltip
      var hoverTimer;
      $this.add($utip).hover(function(){
        if (hoverTimer) clearTimeout(hoverTimer);
      }, function(){
        hoverTimer = setTimeout(function(){ $utip.remove(); }, 100);
      });

    } else {

      // Remove tooltip as soon as mouse leave
      $this.one('mouseleave', function(){ $utip.remove(); });

    }


  };

  // Returns gravities table given:
  // 1. Element offset     (elO): { top:   int, left:   int }
  // 2. Element dimensions (elD): { width: int, height: int }
  // 3. Tooltip dimensions (utD): { width: int, height: int }
  Utip.gravities = function(elO, elD, utD) {

    var axes = {
      h: {
        l: elO.left - utD.width,
        w: elO.left - utD.width + elD.width / 2,
        c: elO.left - utD.width / 2 + elD.width / 2,
        e: elO.left + elD.width / 2,
        r: elO.left + elD.width
      },

      v: {
        n: elO.top - utD.height,
        c: elO.top - utD.height / 2 + elD.height / 2,
        s: elO.top + elD.height
      }
    };

    return {
      nw: { top: axes.v.n, left: axes.h.w },
      n:  { top: axes.v.n, left: axes.h.c },
      ne: { top: axes.v.n, left: axes.h.e },
      e:  { top: axes.v.c, left: axes.h.r },
      se: { top: axes.v.s, left: axes.h.e },
      s:  { top: axes.v.s, left: axes.h.c },
      sw: { top: axes.v.s, left: axes.h.w },
      w:  { top: axes.v.c, left: axes.h.l }
    };

  };

  $.fn.utip = function() {
    $(document).on('mouseenter', this.selector, Utip.create);
    return this;
  };

})(jQuery);