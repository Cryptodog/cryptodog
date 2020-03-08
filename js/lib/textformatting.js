// Simple text formatting
(function() {
    stylizeText = function() {       
        base = this

        // Disable text formatting in messages that contain links to avoid interference
        linkPattern = /(https?|ftps?):\/\//gi;

        if (base.match(linkPattern) === null){
            // Swap ***.+*** for strong and italic text
            strongItalicPattern = /\*\*\*((?!\s).+)\*\*\*/gi;
            base = base.replace(strongItalicPattern, "<strong><i>$1</i></strong>")

            // Swap **.+** for strong text
            strongPattern = /\*\*((?!\s).+)\*\*/gi;
            base = base.replace(strongPattern, "<strong>$1</strong>")

            // Swap *.+* for italics
            italicPattern = /\*((?!\s).+)\*/gi;
            base = base.replace(italicPattern, "<i>$1</i>")
        }
        return base;
    };
    String.prototype['stylizeText'] = stylizeText;
}).call(this);
  