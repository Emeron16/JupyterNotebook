// Job Application Tracker - Popup Script

document.addEventListener("DOMContentLoaded", async () => {
  await loadApplications()
  setupEventListeners()

  // Add Job button logic
  const addJobBtn = document.getElementById('add-job-btn');
  if (addJobBtn) {
    addJobBtn.addEventListener('click', () => {
      window.open('tracker.html#add-job', '_blank');
    });
  }
})

async function loadApplications() {
  try {
    const result = await window.chrome.storage.local.get(["jobApplications"])
    const applications = result.jobApplications || []

    updateStats(applications)
    displayRecentApplications(applications)
  } catch (error) {
    console.error("Error loading applications:", error)
  }
}

function updateStats(applications) {
  const totalElement = document.getElementById("total-applications")
  const thisWeekElement = document.getElementById("this-week")

  totalElement.textContent = applications.length

  // Calculate applications from this week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const thisWeekCount = applications.filter((app) => {
    const appDate = new Date(app.appliedDate)
    return appDate >= oneWeekAgo
  }).length

  thisWeekElement.textContent = thisWeekCount
}

function displayRecentApplications(applications) {
  const listElement = document.getElementById("applications-list")

  if (applications.length === 0) {
    listElement.innerHTML = `
      <div class="empty-state">
        No applications yet. Start applying for jobs and we'll track them automatically!
      </div>
    `
    return
  }

  // Sort by most recent and take first 5
  const recentApps = applications.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate)).slice(0, 5)

  listElement.innerHTML = recentApps
    .map(
      (app) => `
    <div class="application-item">
      <div class="application-company">${app.company}</div>
      <div class="application-position">${app.position}</div>
      <div class="application-date">${formatDate(app.appliedDate)}</div>
    </div>
  `,
    )
    .join("")
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return "Today"
  if (diffDays === 2) return "Yesterday"
  if (diffDays <= 7) return `${diffDays - 1} days ago`

  return date.toLocaleDateString()
}

function setupEventListeners() {
  const openTrackerBtn = document.getElementById("open-tracker");
  if (openTrackerBtn) {
    openTrackerBtn.addEventListener("click", openTracker);
  }
}

async function exportData() {
  try {
    const result = await window.chrome.storage.local.get(["jobApplications"])
    const applications = result.jobApplications || []

    const csvContent = convertToCSV(applications)
    downloadCSV(csvContent, "job-applications.csv")
  } catch (error) {
    console.error("Error exporting data:", error)
  }
}

function convertToCSV(applications) {
  const headers = ["Company", "Position", "Location", "Salary", "Status", "Applied Date", "Last Update", "Notes", "URL"]
  const rows = applications.map((app) => [
    app.company,
    app.position,
    app.location,
    app.salary,
    app.status,
    app.appliedDate,
    app.lastUpdate,
    app.notes || "",
    app.url,
  ])

  const csvContent = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

  return csvContent
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv" })
  const url = URL.createObjectURL(blob)

  window.chrome.downloads.download({
    url: url,
    filename: filename,
  })
}

function openTracker() {
  window.chrome.tabs.create({
    url: window.chrome.runtime.getURL("tracker.html"),
  })
}
