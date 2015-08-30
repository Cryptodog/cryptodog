chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install') {
		chrome.tabs.create({'url': chrome.extension.getURL('firstRun.html')})
	}
})

/* chrome.app.runtime.onLaunched.addListener(function() {
	chrome.app.window.create('index.html', {
		'bounds': {
			'width': 755,
			'height': 625,
		},
		'resizable': false
	})
}) */