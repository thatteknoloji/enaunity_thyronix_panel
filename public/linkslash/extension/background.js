importScripts('config.js', 'api.js');

chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
      id: 'linkslash-save-link',
      title: 'LinkSlash\'a Kaydet',
      contexts: ['link']
    });
    chrome.contextMenus.create({
      id: 'linkslash-save-page',
      title: 'Bu Sayfayı LinkSlash\'a Kaydet',
      contexts: ['page']
    });
  });
});

chrome.contextMenus.onClicked.addListener(async function(info, tab) {
  var url = info.linkUrl || info.pageUrl || (tab && tab.url);
  if (!url) return;

  var captureTab = tab || { url: url, title: '' };
  try {
    await LinkSlashApi.captureFromTab(captureTab, { url: url, title: tab ? tab.title : '' });
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'LinkSlash',
      message: 'Link kaydedildi!'
    });
  } catch (err) {
    if (err.code === 'AUTH_REQUIRED') {
      chrome.tabs.create({ url: err.loginUrl });
      return;
    }
    if (err.code === 'LISANS_YOK' || err.code === 'NO_ACCESS') {
      chrome.tabs.create({ url: err.gatewayUrl });
      return;
    }
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'LinkSlash',
      message: err.message || 'Kaydedilemedi'
    });
  }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'captureCurrentPage') {
    chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
      var tab = tabs[0];
      try {
        var result = await LinkSlashApi.captureFromTab(tab);
        sendResponse({ success: true, data: result.data });
      } catch (err) {
        sendResponse({ success: false, error: err.message, code: err.code, loginUrl: err.loginUrl, gatewayUrl: err.gatewayUrl });
      }
    });
    return true;
  }
});
