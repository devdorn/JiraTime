console.log('JiraTime background service worker started.');

const updateBadge = (activeTimer: any) => {
    if (activeTimer) {
        chrome.action.setBadgeText({ text: "ON" });
        chrome.action.setBadgeBackgroundColor({ color: "#22c55e" }); // green
    } else {
        chrome.action.setBadgeText({ text: "" });
    }
};

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.activeTimer) {
        updateBadge(changes.activeTimer.newValue);
    }
});

// Initial check on startup/install
chrome.runtime.onInstalled.addListener(() => {
    console.log('JiraTime installed.');
    chrome.storage.local.get("activeTimer", (result) => {
        updateBadge(result.activeTimer);
    });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get("activeTimer", (result) => {
        updateBadge(result.activeTimer);
    });
});
