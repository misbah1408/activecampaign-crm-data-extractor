# ActiveCampaign CRM Data Extractor

Chrome Extension (Manifest V3) for extracting **Contacts, Deals, and Tasks** from ActiveCampaign CRM using **DOM scraping only**.

---

## Features

* ✅ Extract Contacts, Deals, and Tasks from ActiveCampaign CRM pages
* ✅ Chrome Manifest V3 (Service Worker + Content Scripts)
* ✅ React + Tailwind popup dashboard
* ✅ Local persistence using `chrome.storage.local`
* ✅ Shadow DOM–based visual extraction indicator
* ✅ Stable deduplication for SPA re-renders
* ✅ Search and filter extracted data
* ✅ Delete individual records

---

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Load the extension in Chrome:

   * Open `chrome://extensions/`
   * Enable **Developer mode**
   * Click **Load unpacked**
   * Select the generated `build/` or `dist/` folder

---

## Folder Structure

```
chrome-extension/
├── public/
│   └── manifest.json          # Chrome extension manifest (MV3)
├── src/
│   ├── background/
│   │   └── serviceWorker.js   # Message handling + storage logic
│   ├── content/
│   │   ├── detector.js        # Page type detection
│   │   ├── extractContacts.js # Contact extraction logic
│   │   ├── extractDeals.js    # Deal extraction logic
│   │   ├── extractTasks.js    # Task extraction logic
│   │   ├── shadowIndicator.js # Shadow DOM extraction status UI
│   │   └── index.js           # Content script entry point
│   └── popup/
│       ├── App.jsx            # React popup UI
│       ├── index.jsx          # React entry
│       └── popup.css          # Tailwind styles
├── package.json
└── README.md
```

---

## DOM Selection Strategy

ActiveCampaign is an **Ember-based Single Page Application (SPA)**.
This extension uses **defensive, real-world DOM scraping strategies**.

### 1. Page Detection

The current CRM view is detected using URL patterns:

* `/contacts` → Contacts
* `/deals` → Deals
* `/tasks` → Tasks

---

### 2. Table-based extraction (Primary strategy)

Most CRM data (especially **Tasks and Contacts**) is rendered inside tables.

* Selects stable row containers:

  * `tr.tasks_task-row` for tasks
  * `table tbody tr` for contacts and list views
* Extracts data using **semantic class selectors**, not index-based assumptions

Example:

```js
row.querySelector(".task-title")?.innerText
```

---

### 3. Attribute & semantic selectors

* Prefers **meaningful CSS classes** over Ember-generated IDs
* Avoids:

  * XPath
  * Dynamic IDs (`ember123`)
  * Inline styles

This makes extraction resilient across SPA re-renders.

---

### 4. SPA & Lazy-loading handling

* Uses `MutationObserver` to wait for dynamic content
* Implements a `waitForElement(selector, timeout)` helper
* Ensures extraction runs only after DOM is stable

---

### 5. Deduplication strategy (Important)

ActiveCampaign re-renders rows frequently.
To avoid duplicate records:

* **Stable IDs are generated from task content**, not DOM IDs
* Example for tasks:

```text
type + title + linked entity + due date
```

This prevents duplication across:

* Scroll events
* Filter changes
* Re-extractions

---

## Storage Schema

All data is stored in `chrome.storage.local` under a single key:

```js
{
  activecampaign_data: {
    contacts: [
      {
        id: string,
        name: string,
        email: string,
        phone: string,
        tags: string[],
        owner: string
      }
    ],
    deals: [
      {
        id: string,
        title: string,
        value: string,
        pipeline: string,
        stage: string,
        contact: string,
        owner: string
      }
    ],
    tasks: [
      {
        id: string,
        type: "call" | "email" | "meeting" | "task",
        title: string,
        dueDate: string,
        assignee: string,
        linkedTo: string
      }
    ],
    lastSync: number | null
  }
}
```

---

## Usage

1. Navigate to an ActiveCampaign CRM page:

   * Contacts
   * Deals
   * Tasks
2. Click the extension icon
3. Click **Extract Now**
4. View extracted data in the popup dashboard
5. Use search to filter records
6. Delete individual records as needed

---

## Known Limitations

* **DOM-dependent**: Changes in ActiveCampaign UI may require selector updates
* **Pagination**: Only currently visible rows are extracted
* **No API usage**: Extraction is limited to visible DOM
* **Assignee visibility**: Task assignee is not always available in table view
* **Manual navigation**: Each CRM section must be visited separately

---

## Development

### Build for production

```bash
npm run build
```

### Development mode

```bash
npm run dev
```

### Key dependencies

* React 18+
* Tailwind CSS
* Chrome Extension APIs (MV3)

---

## Troubleshooting

**No data extracted**

* Ensure you are on `/contacts`, `/deals`, or `/tasks`
* Wait for page to fully load
* Check DevTools console for selector issues

**Duplicate data**

* Clear extension storage
* Re-run extraction after page stabilizes

**Data not persisting**

* Verify `chrome.storage.local` permission
* Check Service Worker logs in `chrome://extensions`
