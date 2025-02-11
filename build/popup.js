document.addEventListener("DOMContentLoaded", function () {
  const blockedList = document.getElementById("blocked-list");
  const websiteInput = document.getElementById("websiteInput");
  const addBtn = document.getElementById("addBtn");
  const timeList = document.getElementById("time-list");

  function extractDomain(url) {
    return url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0];
  }

  function loadBlockedSites() {
    chrome.storage.local.get("blockedSites", function (data) {
      let sites = data.blockedSites || [];
      blockedList.innerHTML = "";

      if (sites.length === 0) {
        blockedList.innerHTML = "<li>No blocked sites ✅</li>";
        return;
      }

      sites.forEach((site) => {
        let li = document.createElement("li");
        li.textContent = site;

        let unblockBtn = document.createElement("button");
        unblockBtn.textContent = "Unblock";
        unblockBtn.onclick = function () {
          unblockSite(site);
        };

        li.appendChild(unblockBtn);
        blockedList.appendChild(li);
      });
    });
  }

  function loadTimeSpent() {
    chrome.storage.local.get("siteTime", function (data) {
      let siteTime = data.siteTime || {};
      timeList.innerHTML = "";

      // Sort websites by highest time spent first
      let sortedSites = Object.keys(siteTime)
        .filter((site) => site !== "null") // Ignore invalid entries
        .sort((a, b) => siteTime[b] - siteTime[a]); // Sort in descending order

      if (sortedSites.length === 0) {
        timeList.innerHTML = "<li>No activity tracked ⏳</li>";
        return;
      }

      sortedSites.forEach((site, index) => {
        let li = document.createElement("li");
        let minutes = Math.floor(siteTime[site] / 60);
        let seconds = siteTime[site] % 60;

        // Display rank before the website name
        li.innerHTML = `<strong>#${
          index + 1
        }</strong> <span>${site}</span> <span class="time">${minutes}m ${seconds}s</span>`;
        timeList.appendChild(li);
      });
    });
  }

  function unblockSite(site) {
    chrome.storage.local.get("blockedSites", function (data) {
      let sites = data.blockedSites || [];
      let updatedSites = sites.filter((s) => s !== site);

      chrome.storage.local.set({ blockedSites: updatedSites }, function () {
        console.log("Unblocked:", site);
        chrome.runtime.sendMessage({ action: "updateRules" });
        loadBlockedSites();
      });
    });
  }

  addBtn.addEventListener("click", function () {
    let newSite = extractDomain(websiteInput.value.trim());
    if (!newSite) return;

    chrome.storage.local.get("blockedSites", function (data) {
      let sites = data.blockedSites || [];
      if (!sites.includes(newSite)) {
        sites.push(newSite);
        chrome.storage.local.set({ blockedSites: sites }, function () {
          chrome.runtime.sendMessage({ action: "updateRules" });
          loadBlockedSites();
          websiteInput.value = "";
        });
      }
    });
  });

  // Real-time updates
  function updateTimer() {
    loadTimeSpent();
  }

  // Listen for time updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateTime") {
      updateTimer();
    }
  });

  // Start real-time update every second
  setInterval(updateTimer, 1000);

  loadBlockedSites();
  loadTimeSpent();
});
