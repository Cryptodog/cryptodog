$(window).ready(function() {
'use strict';

var detectBrowser = function() {
	if (navigator.userAgent.match('OPR')) {
		return 'Opera'
	}
	if (navigator.userAgent.match('Chrome')) {
		return 'Chrome'
	}
	if (navigator.userAgent.match('Firefox')) {
		return 'Firefox'
	}
	if (navigator.userAgent.match('MSIE')) {
		return 'Internet Explorer'
	}
	return 'Safari'
}

var showInstructions = function(browser) {
	$('.browser').text(browser)
	$('.instructions[data-browser=' + browser + ']').show()
}

showInstructions(detectBrowser())

})
