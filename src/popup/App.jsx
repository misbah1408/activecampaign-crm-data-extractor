import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  Trash2,
  Users,
  DollarSign,
  CheckSquare,
  RefreshCw,
} from "lucide-react";

const App = () => {
  const [activeTab, setActiveTab] = useState("contacts");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState({
    contacts: [],
    deals: [],
    tasks: [],
    lastSync: null,
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  // Load data from chrome.storage on mount
  useEffect(() => {
    loadData();
    checkCurrentPage();

    // Listen for storage changes
    const handleStorageChange = (changes, area) => {
      if (area === "local" && changes.activecampaign_data) {
        setData(
          changes.activecampaign_data.newValue || {
            contacts: [],
            deals: [],
            tasks: [],
            lastSync: null,
          },
        );
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const loadData = () => {
    chrome.storage.local.get("activecampaign_data", (result) => {
      if (result.activecampaign_data) {
        setData(result.activecampaign_data);
      }
    });
  };

  const checkCurrentPage = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    setCurrentUrl(tab.url || "");
  };

  const handleExtract = async () => {
    setIsExtracting(true);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (
        !tab.url ||
        (!tab.url.includes("activecampaign.com") &&
          !tab.url.includes("activehosted.com"))
      ) {
        alert(
          "Please navigate to an ActiveCampaign page (contacts, deals, or tasks)",
        );
        setIsExtracting(false);
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: "START_EXTRACTION" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error:", chrome.runtime.lastError.message);

            // Try to inject content script manually
            chrome.scripting
              .executeScript({
                target: { tabId: tab.id },
                files: ["content.js"],
              })
              .then(() => {
                setTimeout(() => {
                  chrome.tabs.sendMessage(
                    tab.id,
                    { type: "START_EXTRACTION" },
                    (retryResponse) => {
                      if (chrome.runtime.lastError) {
                        alert(
                          "Failed to connect. Please refresh the ActiveCampaign page and try again.",
                        );
                      }
                      setIsExtracting(false);
                    },
                  );
                }, 500);
              })
              .catch((err) => {
                console.error("Script injection error:", err);
                alert(
                  "Failed to inject script. Please refresh the page and try again.",
                );
                setIsExtracting(false);
              });
          } else {
            setIsExtracting(false);
          }
        },
      );
    } catch (error) {
      console.error("Extraction error:", error);
      setIsExtracting(false);
      alert("Failed to trigger extraction");
    }
  };

  const handleDelete = (id) => {
    chrome.runtime.sendMessage(
      {
        type: "DELETE_RECORD",
        dataType: activeTab,
        id,
      },
      (response) => {
        if (response && response.success) {
          setData(response.data);
        }
      },
    );
  };

  const filteredData =
    data[activeTab]?.filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      return Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchLower),
      );
    }) || [];

  const formatDate = (timestamp) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const tabs = [
    {
      id: "contacts",
      label: "Contacts",
      icon: Users,
      count: data.contacts?.length || 0,
    },
    {
      id: "deals",
      label: "Deals",
      icon: DollarSign,
      count: data.deals?.length || 0,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: CheckSquare,
      count: data.tasks?.length || 0,
    },
  ];

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data[activeTab], null, 2)], {
      type: "application/json",
    });
    downloadFile(blob, `${activeTab}.json`);
  };

  const exportCSV = () => {
    const rows = data[activeTab];
    if (!rows || rows.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    downloadFile(new Blob([csv], { type: "text/csv" }), `${activeTab}.csv`);
  };

  const isOnActiveCampaign =
    currentUrl.includes("activecampaign.com") ||
    currentUrl.includes("activehosted.com");

  return (
    <div className="w-[600px] h-[500px] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-lg font-bold mb-1">
          ActiveCampaign Data Extractor
        </h1>
        <p className="text-xs opacity-90">
          Last sync: {formatDate(data.lastSync)}
        </p>
      </div>

      {/* Warning if not on ActiveCampaign */}
      {!isOnActiveCampaign && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Not on an ActiveCampaign page. Navigate to ActiveCampaign to
            extract data.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b bg-white">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
              activeTab === id
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon size={16} />
            <span className="font-medium">{label}</span>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="p-3 bg-white border-b flex gap-2">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={loadData}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
          title="Refresh data from storage"
        >
          <RefreshCw size={16} />
        </button>
        {/* Export Dropdown */}
        <div className="relative group">
          <button className="p-2 bg-gray-100 rounded">
            <Download size={16} />
          </button>
          <div className="absolute right-0 mt-1 bg-white border rounded shadow hidden group-hover:block">
            <button
              onClick={exportCSV}
              className="block px-4 py-2 text-sm hover:bg-gray-100 w-full text-left"
            >
              Export CSV
            </button>
            <button
              onClick={exportJSON}
              className="block px-4 py-2 text-sm hover:bg-gray-100 w-full text-left"
            >
              Export JSON
            </button>
          </div>
        </div>
        <button
          onClick={handleExtract}
          disabled={isExtracting || !isOnActiveCampaign}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isExtracting ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Download size={16} />
              Extract Now
            </>
          )}
        </button>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto p-3">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No {activeTab} found</p>
            <p className="text-sm">
              Click "Extract Now" on an ActiveCampaign page
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    {activeTab === "contacts" && (
                      <>
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600">{item.email}</p>
                        <p className="text-sm text-gray-500">{item.phone}</p>
                        {item.tags && item.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Owner: {item.owner}
                        </p>
                        {item.dateCreated && (
                          <p className="text-xs text-gray-400">
                            Created: {item.dateCreated}
                          </p>
                        )}
                      </>
                    )}
                    {activeTab === "deals" && (
                      <>
                        <h3 className="font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        <p className="text-lg font-bold text-green-600">
                          {item.value}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.pipeline} → {item.stage}
                        </p>
                        <p className="text-sm text-gray-500">
                          Contact: {item.contact}
                        </p>
                        {item.nextTask && item.nextTask !== "No task" && (
                          <p className="text-xs text-gray-500 mt-1">
                            Next: {item.nextTask}
                          </p>
                        )}
                      </>
                    )}
                    {activeTab === "tasks" && (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              item.type === "call"
                                ? "bg-purple-100 text-purple-700"
                                : item.type === "email"
                                  ? "bg-blue-100 text-blue-700"
                                  : item.type === "meeting"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.type}
                          </span>
                          {item.isCompleted && (
                            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                              ✓ Complete
                            </span>
                          )}
                          <h3 className="font-semibold text-gray-900">
                            {item.title}
                          </h3>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-500 mb-1">
                            {item.description}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          Due: {item.dueDate}
                        </p>
                        <p className="text-sm text-gray-500">
                          Status: {item.status}
                        </p>
                        {item.linkedTo && item.linkedTo !== "N/A" && (
                          <p className="text-xs text-gray-500 mt-1">
                            Related to: {item.linkedTo}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
