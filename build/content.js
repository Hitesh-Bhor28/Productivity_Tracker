let startTime = Date.now();

window.addEventListener("beforeunload", function () {
  let timeSpent = Math.floor((Date.now() - startTime) / 1000);
  let site = window.location.hostname;

  chrome.storage.local.get("siteTime", function (data) {
    let siteTime = data.siteTime || {};
    siteTime[site] = (siteTime[site] || 0) + timeSpent;

    chrome.storage.local.set({ siteTime: siteTime });
  });
});
