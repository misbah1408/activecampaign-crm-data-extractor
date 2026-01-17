// Detect current ActiveCampaign page type

function detectPageType() {
  const url = window.location.href;
  
  if (url.includes('/contacts') || url.includes('/contact/')) {
    return 'CONTACTS';
  }
  
  if (url.includes('/deals') || url.includes('/deal/')) {
    return 'DEALS';
  }
  
  if (url.includes('/tasks') || url.includes('/task/')) {
    return 'TASKS';
  }
  
  return null;
}

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Element not found: ' + selector));
    }, timeout);
  });
}