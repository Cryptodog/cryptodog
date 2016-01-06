// On extension install
chrome.runtime.onInstalled.addListener(function(details) {
    chrome.tabs.create({'url': chrome.extension.getURL('index.html')});
});

// On extension icon click
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({'url': chrome.extension.getURL('index.html')});
});
