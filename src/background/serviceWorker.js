// Service Worker - Handles all storage operations and message passing

// Initialize storage schema
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    activecampaign_data: {
      contacts: [],
      deals: [],
      tasks: [],
      lastSync: null
    }
  });
  console.log('ActiveCampaign Extractor installed');
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type);

  if (message.type === 'EXTRACT_DATA') {
    handleExtractData(message.data, message.dataType)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_DATA') {
    getData()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'DELETE_RECORD') {
    deleteRecord(message.dataType, message.id)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'TRIGGER_EXTRACT') {
    triggerExtraction(sender.tab.id)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Get all data from storage
async function getData() {
  const result = await chrome.storage.local.get('activecampaign_data');
  return result.activecampaign_data || {
    contacts: [],
    deals: [],
    tasks: [],
    lastSync: null
  };
}

// Handle extracted data with deduplication
async function handleExtractData(newData, dataType) {
  const stored = await getData();
  const arrayKey = dataType; // 'contacts', 'deals', or 'tasks'
  
  if (!Array.isArray(stored[arrayKey])) {
    stored[arrayKey] = [];
  }

  // Deduplicate and update by ID
  const existingIds = new Set(stored[arrayKey].map(item => item.id));
  const updatedArray = [...stored[arrayKey]];

  newData.forEach(newItem => {
    if (existingIds.has(newItem.id)) {
      // Update existing record
      const index = updatedArray.findIndex(item => item.id === newItem.id);
      updatedArray[index] = newItem;
    } else {
      // Add new record
      updatedArray.push(newItem);
    }
  });

  stored[arrayKey] = updatedArray;
  stored.lastSync = Date.now();

  await chrome.storage.local.set({ activecampaign_data: stored });
  return stored;
}

// Delete a single record
async function deleteRecord(dataType, id) {
  const stored = await getData();
  stored[dataType] = stored[dataType].filter(item => item.id !== id);
  await chrome.storage.local.set({ activecampaign_data: stored });
  return stored;
}

// Trigger extraction on active tab
async function triggerExtraction(tabId) {
  await chrome.tabs.sendMessage(tabId, { type: 'START_EXTRACTION' });
}