// Add a new context menu for setting the target language
chrome.contextMenus.create({
  id: 'language',
  title: 'Set target language',
  contexts: ['action'],
  type: 'normal'
});

// Add languages as children of the 'language' context menu
['en', 'es', 'fr', 'de', 'it', 'pt'].forEach(lang => {
  chrome.contextMenus.create({
    id: `language-${lang}`,
    title: lang,
    contexts: ['action'],
    parentId: 'language',
    type: 'radio',
    checked: lang === lang
  })
})

chrome.action.onClicked.addListener(async tab => {
  try {
    await chrome.scripting.insertCSS({
      target: {
        tabId: tab.id
      },
      files: ['/data/scripts/glass.css']
    });
    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ['/data/scripts/glass.js']
    });
  }
  catch (e) {
    console.error(e);
    await chrome.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: 'red'
    });
    chrome.action.setTitle({
      tabId: tab.id,
      title: e.message || 'Unknown Error'
    });
    chrome.action.setBadgeText({
      tabId: tab.id,
      text: 'E'
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.cmd === 'capture') {
    chrome.tabs.captureVisibleTab().then(response);
    chrome.action.setIcon({
      tabId: sender.tab.id,
      path: {
        '16': '/data/icons/active/16.png',
        '32': '/data/icons/active/32.png'
      }
    });

    return true;
  }
  else if (request.cmd === 'release') {
    chrome.action.setIcon({
      tabId: sender.tab.id,
      path: {
        '16': '/data/icons/16.png',
        '32': '/data/icons/32.png'
      }
    });
  }
});

chrome.runtime.onInstalled.addListener(() => chrome.storage.local.get({
  magnification: 2,
  size: 400
}, prefs => {
  chrome.contextMenus.create({
    id: 'magnification',
    title: 'Magnification',
    contexts: ['action']
  });
  chrome.contextMenus.create({
    id: 'magnification-1.5',
    title: '1.5',
    contexts: ['action'],
    parentId: 'magnification',
    type: 'radio',
    checked: prefs.magnification === 1.5
  });
  chrome.contextMenus.create({
    id: 'magnification-2',
    title: '2',
    contexts: ['action'],
    parentId: 'magnification',
    type: 'radio',
    checked: prefs.magnification === 2
  });
  chrome.contextMenus.create({
    id: 'magnification-2.5',
    title: '2.5',
    contexts: ['action'],
    parentId: 'magnification',
    type: 'radio',
    checked: prefs.magnification === 2.5
  });
  chrome.contextMenus.create({
    id: 'magnification-3',
    title: '3',
    contexts: ['action'],
    parentId: 'magnification',
    type: 'radio',
    checked: prefs.magnification === 3
  });
  chrome.contextMenus.create({
    id: 'magnification-4',
    title: '4',
    contexts: ['action'],
    parentId: 'magnification',
    type: 'radio',
    checked: prefs.magnification === 4
  });
  chrome.contextMenus.create({
    id: 'size',
    title: 'Size',
    contexts: ['action']
  });
  chrome.contextMenus.create({
    id: 'size-100',
    title: '100',
    contexts: ['action'],
    parentId: 'size',
    type: 'radio',
    checked: prefs.size === 100
  });
  chrome.contextMenus.create({
    id: 'size-200',
    title: '200',
    contexts: ['action'],
    parentId: 'size',
    type: 'radio',
    checked: prefs.size === 200
  });
  chrome.contextMenus.create({
    id: 'size-300',
    title: '300',
    contexts: ['action'],
    parentId: 'size',
    type: 'radio',
    checked: prefs.size === 300
  });
  chrome.contextMenus.create({
    id: 'size-400',
    title: '400',
    contexts: ['action'],
    parentId: 'size',
    type: 'radio',
    checked: prefs.size === 400
  });
  chrome.contextMenus.create({
    id: 'size-500',
    title: '500',
    contexts: ['action'],
    parentId: 'size',
    type: 'radio',
    checked: prefs.size === 500
  });
}));

chrome.contextMenus.onClicked.addListener(info => {
  // Handle the selection of the target language
  if (info.menuItemId.startsWith('translate-')) {
    chrome.storage.local.set({
      'language': info.menuItemId.slize(9)
    });
  }
  
  if (info.menuItemId.startsWith('magnification-')) {
    chrome.storage.local.set({
      'magnification': parseFloat(info.menuItemId.slice(14))
    });
  }
  else if (info.menuItemId.startsWith('size-')) {
    chrome.storage.local.set({
      'size': parseInt(info.menuItemId.slice(5))
    });
  }
});

// Modify the mouse event listener to handle the translation
document.addEventListener('mousemove', function(e) {
  if (e.button === 0) { // Left mouse button clicked
    chrome.storage.local.get('language', function(data) {
      var targetLanguage = data.language;
      var magnifiedText = getMagnifiedText(); // Assume this function is already defined
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(magnifiedText)}`)
        .then(response => response.json())
        .then(data => {
          var translatedText = data[0][0][0];
          displayTranslatedText(translatedText); // Assume this function is already defined
        });
    });
  } 
});

// 
document.addEventListener('mouseup', function(e) {
  if (e.button === 0) {
    revertText(); // Assume this function is already defined
  }
})

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
