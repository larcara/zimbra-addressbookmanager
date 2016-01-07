  chrome.browserAction.onClicked.addListener(function(tab) {
    var action_url = "addressbooks.html";
    chrome.tabs.create({ url: action_url });
  });
