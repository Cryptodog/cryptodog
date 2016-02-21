// On app launch
chrome.app.runtime.onLaunched.addListener(function(){
    chrome.app.window.create('index.html', {
        'outerBounds': {
            'width': 1000,
            'height': 1000
        }
    });
});
