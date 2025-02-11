let activeTab = null;
let startTime = Date.now();
let timeInterval = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["blockedSites", "siteTime"], function (data) {
    let blockedSites = data.blockedSites || [];
    let siteTime = data.siteTime || {};
    chrome.storage.local.set({ blockedSites, siteTime });
    updateRules(blockedSites);
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateRules") {
    chrome.storage.local.get("blockedSites", function (data) {
      updateRules(data.blockedSites || []);
    });
  }
});

function updateRules(blockedSites) {
  let ruleIds = [...Array(100).keys()].map((i) => i + 1);
  let newRules = blockedSites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: site,
      resourceTypes: ["main_frame"],
    },
  }));

  chrome.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: ruleIds,
      addRules: newRules,
    },
    () => {
      console.log("Updated Block Rules:", blockedSites);
    }
  );
}

// Extract hostname from URL safely
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return null;
  }
}

// Start tracking time when user switches tabs
chrome.tabs.onActivated.addListener(({ tabId }) => {
  trackTime();
  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url) {
      let domain = getDomain(tab.url);
      if (domain) {
        activeTab = domain;
        startTime = Date.now();
      }
    }
  });
});

// Update time when page is loaded or URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    trackTime();
    let domain = getDomain(tab.url);
    if (domain) {
      activeTab = domain;
      startTime = Date.now();
    }
  }
});

// Track when user switches windows or minimizes browser
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    trackTime();
    activeTab = null;
  }
});

// Store time spent every second
function startTracking() {
  if (timeInterval) clearInterval(timeInterval);

  timeInterval = setInterval(() => {
    if (activeTab) {
      let timeSpent = Math.floor((Date.now() - startTime) / 1000);
      chrome.storage.local.get("siteTime", function (data) {
        let siteTime = data.siteTime || {};
        siteTime[activeTab] = (siteTime[activeTab] || 0) + 1;
        chrome.storage.local.set({ siteTime });
      });

      chrome.runtime.sendMessage({
        action: "updateTime",
        site: activeTab,
        time: timeSpent,
      });
    }
  }, 1000);
}

// Stop tracking when browser is closed
chrome.runtime.onSuspend.addListener(() => {
  trackTime();
});

// Call the function to start tracking
startTracking();

function trackTime() {
  if (!activeTab) return;
  let timeSpent = Math.floor((Date.now() - startTime) / 1000);

  chrome.storage.local.get("siteTime", function (data) {
    let siteTime = data.siteTime || {};
    siteTime[activeTab] = (siteTime[activeTab] || 0) + timeSpent;
    chrome.storage.local.set({ siteTime });
  });
}
