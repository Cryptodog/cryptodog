// On extension install
chrome.runtime.onInstalled.addListener(function(details) {
    chrome.tabs.create({'url': chrome.runtime.getURL('index.html')});
});

// On extension icon click
chrome.action.onClicked.addListener(function(tab) {
    chrome.tabs.create({'url': chrome.runtime.getURL('index.html')});
});
