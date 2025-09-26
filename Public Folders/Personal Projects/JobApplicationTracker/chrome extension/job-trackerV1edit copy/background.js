// Job Application Tracker - Background Script

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveJobApplication") {
    saveJobApplication(request.data)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true // Keep message channel open for async response
  }
})

// Save job application to storage
async function saveJobApplication(jobData) {
  try {
    // Get existing applications
    const result = await chrome.storage.local.get(["jobApplications"])
    const applications = result.jobApplications || []

    // Add new application with unique ID
    const newApplication = {
      id: Date.now().toString(),
      ...jobData,
    }

    applications.push(newApplication)

    // Save back to storage
    await chrome.storage.local.set({ jobApplications: applications })

    // Show notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Job Application Saved",
      message: `Added ${jobData.position} at ${jobData.company} to your tracker!`,
    })

    return true
  } catch (error) {
    console.error("Error saving job application:", error)
    throw error
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Job Application Tracker installed")
})
