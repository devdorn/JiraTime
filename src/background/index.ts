console.log('JiraTime background service worker started.');

// Setup listeners for alarms/timers if needed later
chrome.runtime.onInstalled.addListener(() => {
    console.log('JiraTime installed.');
});
