// ===== DETECTOR =====
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

// ===== SHADOW INDICATOR =====
class ExtractionIndicator {
  constructor() {
    this.container = null;
    this.shadow = null;
  }

  show(message, type = 'info') {
    this.remove();

    this.container = document.createElement('div');
    this.container.id = 'ac-extractor-indicator';
    
    this.shadow = this.container.attachShadow({ mode: 'open' });
    
    const style = document.createElement('style');
    style.textContent = `
      .indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .indicator.info {
        border-left: 4px solid #3b82f6;
      }
      
      .indicator.success {
        border-left: 4px solid #10b981;
      }
      
      .indicator.error {
        border-left: 4px solid #ef4444;
      }
      
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .icon {
        width: 16px;
        height: 16px;
      }
      
      .message {
        color: #1f2937;
        font-weight: 500;
      }
    `;
    
    const indicator = document.createElement('div');
    indicator.className = `indicator ${type}`;
    
    if (type === 'info') {
      indicator.innerHTML = `
        <div class="spinner"></div>
        <div class="message">${message}</div>
      `;
    } else if (type === 'success') {
      indicator.innerHTML = `
        <div class="icon" style="color: #10b981;">✓</div>
        <div class="message">${message}</div>
      `;
    } else if (type === 'error') {
      indicator.innerHTML = `
        <div class="icon" style="color: #ef4444;">✗</div>
        <div class="message">${message}</div>
      `;
    }
    
    this.shadow.appendChild(style);
    this.shadow.appendChild(indicator);
    document.body.appendChild(this.container);
  }

  remove() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.shadow = null;
  }

  showSuccess(message, duration = 3000) {
    this.show(message, 'success');
    setTimeout(() => this.remove(), duration);
  }

  showError(message, duration = 5000) {
    this.show(message, 'error');
    setTimeout(() => this.remove(), duration);
  }
}

const indicator = new ExtractionIndicator();

// ===== EXTRACT CONTACTS (Real ActiveCampaign Structure) =====
async function extractContacts() {
  console.log('Extracting contacts from ActiveCampaign...');
  const contacts = [];

  try {
    // Wait for the contacts table to load
    await waitForElement('tbody.contacts-index-body tr', 5000);
    
    // Get all contact rows
    const contactRows = document.querySelectorAll('tbody.contacts-index-body tr.contacts_index_contact-row');
    
    console.log(`Found ${contactRows.length} contact rows`);
    
    contactRows.forEach((row, index) => {
      try {
        // Extract ID from row
        const rowId = row.id || `contact_${index}_${Date.now()}`;
        const contactId = rowId.replace('contactrow_', '');
        
        // Extract name
        const nameCell = row.querySelector('[data-testid="c-table__cell--full-name"] a.full-name');
        const name = nameCell?.textContent?.trim() || 'Unknown';
        
        // Extract email
        const emailCell = row.querySelector('[data-testid="c-table__cell--email"] a.email');
        const email = emailCell?.textContent?.trim() || 'N/A';
        
        // Extract phone
        const phoneCell = row.querySelector('[data-testid="c-table__cell--phone"] a.phone');
        const phone = phoneCell?.textContent?.trim() || 'N/A';
        
        // Extract account/owner
        const accountCell = row.querySelector('[data-testid="c-table__cell--account"]');
        const owner = accountCell?.textContent?.trim() || 'Unassigned';
        
        // Extract date created
        const dateCell = row.querySelector('[data-testid="c-table__cell--date"]');
        const dateCreated = dateCell?.textContent?.trim() || 'N/A';
        
        if (name && name !== 'Unknown') {
          contacts.push({
            id: contactId,
            name,
            email,
            phone,
            tags: [], // Tags are not visible in table view
            owner: owner === '—' ? 'Unassigned' : owner,
            dateCreated
          });
        }
      } catch (err) {
        console.error('Error parsing contact row:', err);
      }
    });

  } catch (error) {
    console.error('Error extracting contacts:', error);
  }

  console.log(`Successfully extracted ${contacts.length} contacts`);
  return contacts;
}

// ===== EXTRACT DEALS (Real ActiveCampaign Kanban Structure) =====
async function extractDeals() {
  console.log('Extracting deals from ActiveCampaign...');
  const deals = [];

  try {
    // Wait for deal board columns
    await waitForElement('.deals_index_deal-board_column', 5000);
    
    // Get all deal columns (stages)
    const dealColumns = document.querySelectorAll('.deals_index_deal-board_column');
    
    console.log(`Found ${dealColumns.length} deal stages`);
    
    dealColumns.forEach((column) => {
      try {
        // Extract stage name
        const stageTitle = column.querySelector('.deals_index_deal-board_column__title camp-text');
        const stage = stageTitle?.textContent?.trim() || 'Unknown Stage';
        
        // Get all deal cards in this column
        const dealCards = column.querySelectorAll('.deals_index_deal-card');
        
        dealCards.forEach((card, index) => {
          try {
            // Extract deal title
            const titleElement = card.querySelector('.deals_index_deal-card_region.title camp-text');
            const title = titleElement?.textContent?.trim() || 'Untitled Deal';
            
            // Extract deal value
            const valueElement = card.querySelector('.deals_index_deal-card_region.value');
            const value = valueElement?.textContent?.trim() || '$0';
            
            // Extract contact name
            const contactElement = card.querySelector('.deals_index_deal-card_region.contact-fullname-acctname camp-text');
            const contact = contactElement?.textContent?.trim() || 'N/A';
            
            // Extract deal link to get ID
            const dealLink = card.querySelector('a');
            const dealHref = dealLink?.getAttribute('href') || '';
            const dealId = dealHref.split('/').pop() || `deal_${index}_${Date.now()}`;
            
            // Extract next task/action
            const taskElement = card.querySelector('.deals_index_deal-card_region.next-action');
            const nextTask = taskElement?.textContent?.trim() || 'No task';
            
            deals.push({
              id: dealId,
              title,
              value,
              pipeline: 'Default Pipeline', // Not visible in card
              stage,
              contact,
              owner: 'N/A', // Not visible in card view
              nextTask
            });
          } catch (err) {
            console.error('Error parsing deal card:', err);
          }
        });
      } catch (err) {
        console.error('Error parsing deal column:', err);
      }
    });

  } catch (error) {
    console.error('Error extracting deals:', error);
  }

  console.log(`Successfully extracted ${deals.length} deals`);
  return deals;
}

// ===== EXTRACT TASKS =====
async function extractTasks() {
  console.log("Extracting tasks from ActiveCampaign...");
  const tasksMap = new Map(); // 🔑 prevents duplicates

  try {
    await waitForElement("tr.tasks_task-row", 5000);

    const rows = document.querySelectorAll("tr.tasks_task-row");

    rows.forEach((row) => {
      try {
        const title =
          row.querySelector(".task-title")?.innerText.trim() || "Untitled";

        const linkedTo =
          row.querySelector("td.owner-type span")?.innerText.trim() || "N/A";

        const dueDate =
          row.querySelector('td.date span[rel="tip"]')
            ?.getAttribute("data-original-title") ||
          row.querySelector('td.date span[rel="tip"]')?.innerText.trim() ||
          "No due date";

        const status =
          row.querySelector(".status-text")?.innerText.trim() || "Unknown";

        const type =
          row.querySelector(".deal-task-type")?.innerText.trim() || "Task";

        const link =
          row.querySelector('a[href^="/app/"]')?.getAttribute("href") || "";

        // ✅ STABLE ID (content-based)
        const stableId = `${type}|${title}|${linkedTo}|${dueDate}`.toLowerCase();

        tasksMap.set(stableId, {
          id: stableId,
          type,
          title,
          dueDate,
          status,
          assignee: "Admin",
          linkedTo,
          link,
        });
      } catch (err) {
        console.error("Error parsing task row:", err);
      }
    });
  } catch (error) {
    console.error("Error extracting tasks:", error);
  }

  const tasks = Array.from(tasksMap.values());
  console.log(`Successfully extracted ${tasks.length} unique tasks`);
  return tasks;
}


// ===== MAIN ORCHESTRATION =====
let isExtracting = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_EXTRACTION') {
    handleExtraction();
    sendResponse({ success: true });
  }
  return true;
});

async function handleExtraction() {
  if (isExtracting) {
    console.log('Extraction already in progress');
    return;
  }

  isExtracting = true;
  const pageType = detectPageType();

  if (!pageType) {
    indicator.showError('Not on a supported ActiveCampaign page');
    isExtracting = false;
    return;
  }

  indicator.show(`Extracting ${pageType.toLowerCase()}...`, 'info');

  try {
    let data = [];
    let dataType = '';

    switch (pageType) {
      case 'CONTACTS':
        data = await extractContacts();
        dataType = 'contacts';
        break;
      case 'DEALS':
        data = await extractDeals();
        dataType = 'deals';
        break;
      case 'TASKS':
        data = await extractTasks();
        dataType = 'tasks';
        break;
    }

    if (data.length === 0) {
      indicator.showError('No data found on this page');
      isExtracting = false;
      return;
    }

    chrome.runtime.sendMessage({
      type: 'EXTRACT_DATA',
      data,
      dataType
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Message error:', chrome.runtime.lastError);
        indicator.showError('Failed to save data');
      } else if (response && response.success) {
        indicator.showSuccess(`Extracted ${data.length} ${dataType}`);
      } else {
        indicator.showError('Failed to save data');
      }
      isExtracting = false;
    });

  } catch (error) {
    console.error('Extraction error:', error);
    indicator.showError('Extraction failed: ' + error.message);
    isExtracting = false;
  }
}

window.addEventListener('load', () => {
  const pageType = detectPageType();
  if (pageType) {
    console.log('ActiveCampaign Extractor ready on', pageType, 'page');
  }
});