// Job Application Tracker - Content Script
;(() => {
  // Check if extension is properly loaded
  function isExtensionLoaded() {
    try {
      return typeof chrome !== 'undefined' && 
             chrome.runtime && 
             chrome.runtime.id && 
             chrome.runtime.sendMessage;
    } catch (error) {
      console.error("Error checking extension status:", error);
      return false;
    }
  }

  // Function to validate job data
  function isValidJobData(jobData) {
    if (!jobData) {
      console.error("Job data is null or undefined")
      return false
    }

    if (typeof jobData !== 'object') {
      console.error("Job data is not an object:", typeof jobData)
      return false
    }

    // Log the actual job data for debugging
    console.log("Job data received:", {
      company: jobData.company,
      position: jobData.position,
      location: jobData.location,
      salary: jobData.salary,
      url: jobData.url,
      site: jobData.site
    })

    // Always return true to allow manual entry
    return true
  }

  // Site-specific selectors for job information (expanded for salary/location)
  const siteSelectors = {
    "linkedin.com": {
      company:
        ".job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name, .topcard__org-name-link, .topcard__flavor-row a, .topcard__org-name-link",
      position:
        ".job-details-jobs-unified-top-card__job-title h1, .jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__job-title, .topcard__title, h1.topcard__title",
      location:
        ".job-details-jobs-unified-top-card__primary-description-container .job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .topcard__flavor-row, .topcard__flavor--bullet, .topcard__flavor--metadata, .topcard__flavor, .job-details-jobs-unified-top-card__location, .jobs-unified-top-card__location",
      salary: ".job-details-jobs-unified-top-card__salary, .jobs-unified-top-card__salary, .salary, .compensation__salary, .compensation__salary-amount, .job-criteria__text--criteria, .job-criteria__text, .job-criteria__item--salary",
      applyButtons: ['[data-control-name="jobdetails_topcard_inapply"]', ".jobs-apply-button", '[aria-label*="Apply"]'],
    },
    "indeed.com": {
      company:
        '[data-testid="inlineHeader-companyName"] a, .jobsearch-CompanyInfoWithoutHeaderImage a, .jobsearch-InlineCompanyRating + a, .jobsearch-CompanyInfoWithoutHeaderImage div, .jobsearch-CompanyInfoContainer a',
      position:
        '[data-testid="jobsearch-JobInfoHeader-title"] h1, .jobsearch-JobInfoHeader-title h1, h1[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title, h1',
      location:
        '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle div, .jobsearch-CompanyInfoContainer div, .jobsearch-JobInfoHeader-subtitle, .jobsearch-CompanyInfoWithoutHeaderImage div, .jobsearch-JobInfoHeader-subtitle span',
      salary: '[data-testid="jobsearch-JobMetadataHeader-item"], .jobsearch-JobMetadataHeader-item, .attribute_snippet, .salary-snippet-container, .jobsearch-JobMetadataHeader-item--salary, .jobsearch-JobMetadataHeader-item--pay, .jobsearch-JobMetadataHeader-item--compensation',
      applyButtons: [
        "[data-jk] .ia-IndeedApplyButton",
        ".indeed-apply-button",
        '[aria-label*="Apply"]',
        'input[value*="Apply"]',
      ],
    },
    "glassdoor.com": {
      company: '.employerName, [data-test="employer-name"], .employer-name, .css-16nw49e, .css-1vg6q84',
      position: '.jobTitle, [data-test="job-title"], .job-title h1, .css-17x2pwl, h1',
      location: '.location, [data-test="job-location"], .job-location, .css-56kyx5, .css-1v5elnn, .css-1v5elnn span',
      salary: '.salary, [data-test="salary"], .salary-estimate, .css-1bluz6i, .css-1imh2hq, .css-1imh2hq span',
      applyButtons: [
        '[data-test="apply-btn"]',
        ".apply-btn",
        '[data-test="easy-apply-button"]',
        'button[title*="Apply"]',
      ],
    },
    "monster.com": {
      company: '.company-name, [data-testid="company-name"], .company',
      position: '.job-title, [data-testid="job-title"] h1, .title, h1',
      location: '.location, [data-testid="location"], .job-location, .job-header .location, .job-header .location span',
      salary: '.salary, [data-testid="salary"], .compensation, .job-salary, .job-salary span',
      applyButtons: ['[data-testid="apply-button"]', ".apply-button", 'button[title*="Apply"]'],
    },
    "ziprecruiter.com": {
      company: '.company_name, [data-testid="company-name"], .company, .job-header .company',
      position: '.job_title, [data-testid="job-title"] h1, .title, h1',
      location: '.location, [data-testid="location"], .job-location, .job-header .location, .job-header .location span',
      salary: '.salary, [data-testid="salary"], .compensation, .job-salary, .job-salary span',
      applyButtons: ['[data-testid="apply-button"]', ".apply_button", 'button[title*="Apply"]'],
    },
  }

  // Get current site
  const currentSite = Object.keys(siteSelectors).find((site) => window.location.hostname.includes(site))

  if (!currentSite) return

  const selectors = siteSelectors[currentSite]

  // Function to extract text from element (expanded fallback)
  function extractText(selector) {
    const element = document.querySelector(selector)
    return element ? element.textContent.trim() : ""
  }

  // Fallback: search for label in visible text
  function extractByLabel(label) {
    // Try to find a label in the page text
    const regex = new RegExp(label + '[:\s]+([^\n\r]+)', 'i');
    const bodyText = document.body.innerText;
    const match = bodyText.match(regex);
    if (match) {
      return match[1].trim();
    }
    return '';
  }

  // Function to extract job description (robust)
  function extractDescription() {
    // Site-specific selectors first
    const siteSpecificSelectors = {
      "linkedin.com": [
        ".job-details-about-the-job-module__description",
        ".job-details-jobs-unified-top-card__description",
        ".jobs-description__container",
        ".jobs-description",
        ".job-description"
      ],
      "indeed.com": [
        "#jobDescriptionText",
        ".jobsearch-jobDescriptionText",
        ".jobsearch-JobComponent-description",
        ".jobsearch-JobDescriptionSection-sectionItem"
      ]
    };

    // Try site-specific selectors first
    if (currentSite && siteSpecificSelectors[currentSite]) {
      for (const selector of siteSpecificSelectors[currentSite]) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 40) {
          return el.textContent.trim();
        }
      }
    }

    // Fallback to common selectors
    const commonSelectors = [
      '.description__text',
      '.job-description',
      '.job-desc',
      '.jobDescriptionContent',
      '.job-description-content',
      '.description',
      '[data-testid="jobDescriptionText"]',
      '[data-attr="job-description"]',
      '.jobDescription',
      '.job-desc',
      '.job-body',
      '.job-content',
      '.job-details',
      '.job-details-content',
      '.job-details__content',
      '.job-details__description',
      '.job-details__main-content',
      '.job-details__text',
      '.job-details__body',
      '.job-details__section',
      '.job-details__section--description',
      '.job-details__section-content',
      '.job-details__section-body',
      '.job-details__section-text',
      '.job-details__section-main',
      '.job-details__section-description'
    ];

    for (const sel of commonSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 40) {
        return el.textContent.trim();
      }
    }

    // Fallback: look for a large block of text in the body
    const paragraphs = Array.from(document.querySelectorAll('p'));
    const longPara = paragraphs.find(p => p.textContent && p.textContent.trim().length > 40);
    if (longPara) return longPara.textContent.trim();

    // Fallback: use a chunk of the body text
    const bodyText = document.body.innerText;
    if (bodyText && bodyText.length > 100) {
      return bodyText.slice(0, 1000) + (bodyText.length > 1000 ? '...' : '');
    }

    return '';
  }

  // Function to extract job information (with fallback)
  function extractJobInfo() {
    const company = extractText(selectors.company)
    const position = extractText(selectors.position)
    let location = extractText(selectors.location)
    let salary = extractText(selectors.salary)
    const description = extractDescription();

    // Fallbacks if not found
    if (!location) {
      location = extractByLabel('Location') || extractByLabel('Office') || extractByLabel('City')
    }
    if (!salary) {
      salary = extractByLabel('Salary') || extractByLabel('Compensation') || extractByLabel('Pay')
    }

    // Log the extracted values for debugging
    console.log("Extracted job info:", {
      company,
      position,
      location,
      salary,
      description,
      url: window.location.href,
      site: currentSite
    })

    return {
      company: company || "Unknown Company",
      position: position || "Unknown Position",
      location: location || "Unknown Location",
      salary: salary || "Not specified",
      description: description || "",
      url: window.location.href,
      site: currentSite,
      extractedAt: new Date().toISOString(),
    }
  }

  // Add a flag to track if we're currently showing a modal
  let isModalShowing = false

  // Function to show error message in the modal
  function showErrorMessage(modal, message) {
    const errorMsg = document.createElement("div")
    errorMsg.className = "job-tracker-error"
    errorMsg.textContent = message
    modal.querySelector(".job-tracker-content").appendChild(errorMsg)
  }

  // Function to show success message in the modal
  function showSuccessMessage(modal) {
    const successMsg = document.createElement("div")
    successMsg.className = "job-tracker-success"
    successMsg.textContent = "✅ Job application added to tracker!"
    modal.querySelector(".job-tracker-content").appendChild(successMsg)
  }

  // Function to show job capture modal
  function showJobCaptureModal(jobData) {
    // Don't show if we're already showing a modal
    if (isModalShowing) return

    // Check if extension is loaded
    if (!isExtensionLoaded()) {
      console.error("Extension not properly loaded")
      // Show a user-friendly message
      const errorDiv = document.createElement("div")
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #fee2e2;
        color: #dc2626;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 9999;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `
      errorDiv.textContent = "Please refresh the page to use the job tracker"
      document.body.appendChild(errorDiv)
      setTimeout(() => errorDiv.remove(), 5000)
      return
    }

    // Remove existing modal if present
    const existingModal = document.getElementById("job-tracker-modal")
    if (existingModal) {
      existingModal.remove()
    }

    isModalShowing = true

    // Create modal HTML
    const modal = document.createElement("div")
    modal.id = "job-tracker-modal"
    modal.innerHTML = `
      <div class="job-tracker-overlay">
        <div class="job-tracker-modal">
          <div class="job-tracker-header">
            <h3>🎯 Add Job Application</h3>
            <button class="job-tracker-close">&times;</button>
          </div>
          <div class="job-tracker-content">
            <p>We detected you're applying for a job! Would you like to add it to your tracker?</p>
            <form id="job-tracker-form">
              <div class="job-tracker-field">
                <label>Company:</label>
                <input type="text" id="company" value="${jobData.company}" required>
              </div>
              <div class="job-tracker-field">
                <label>Position:</label>
                <input type="text" id="position" value="${jobData.position}" required>
              </div>
              <div class="job-tracker-field">
                <label>Location:</label>
                <input type="text" id="location" value="${jobData.location}">
              </div>
              <div class="job-tracker-field">
                <label>Salary:</label>
                <input type="text" id="salary" value="${jobData.salary}">
              </div>
              <div class="job-tracker-field">
                <label>Notes:</label>
                <textarea id="notes" placeholder="Add any notes about this application..." rows="3"></textarea>
              </div>
              <div class="job-tracker-actions">
                <button type="button" class="job-tracker-btn-secondary" id="cancel-btn">Cancel</button>
                <button type="submit" class="job-tracker-btn-primary">Add to Tracker</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Add event listeners
    const closeBtn = modal.querySelector(".job-tracker-close")
    const cancelBtn = modal.querySelector("#cancel-btn")
    const form = modal.querySelector("#job-tracker-form")
    const overlay = modal.querySelector(".job-tracker-overlay")

    function closeModal() {
      modal.remove()
      isModalShowing = false
    }

    closeBtn.addEventListener("click", closeModal)
    cancelBtn.addEventListener("click", closeModal)

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal()
    })

    form.addEventListener("submit", (e) => {
      e.preventDefault()

      // Validate form data
      const company = document.getElementById("company").value.trim()
      const position = document.getElementById("position").value.trim()
      
      if (!company || !position) {
        showErrorMessage(modal, "❌ Company and Position are required")
        return
      }

      // Get local date in YYYY/MM/DD
      function getLocalDateString() {
        const today = new Date();
        return today.getFullYear() + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0');
      }

      const formData = {
        company,
        position,
        location: document.getElementById("location").value.trim(),
        salary: document.getElementById("salary").value.trim(),
        notes: document.getElementById("notes").value.trim(),
        url: jobData.url,
        site: jobData.site,
        status: "applied",
        appliedDate: getLocalDateString(),
        lastUpdate: getLocalDateString(),
      }

      // Function to handle the message sending with retry
      function sendMessageWithRetry(retryCount = 0) {
        if (!isExtensionLoaded()) {
          showErrorMessage(modal, "❌ Extension not properly loaded. Please refresh the page and try again.")
          return
        }

        try {
          chrome.runtime.sendMessage(
            {
              action: "saveJobApplication",
              data: formData,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError)
                if (retryCount < 3) {
                  // Retry after a short delay
                  setTimeout(() => sendMessageWithRetry(retryCount + 1), 1000)
                } else {
                  showErrorMessage(modal, "❌ Failed to save job application. Please refresh the page and try again.")
                }
                return
              }

              if (response && response.success) {
                showSuccessMessage(modal)
                setTimeout(closeModal, 2000)
              } else {
                showErrorMessage(modal, "❌ Failed to save job application. Please try again.")
              }
            }
          )
        } catch (error) {
          console.error("Error in sendMessageWithRetry:", error)
          if (retryCount < 3) {
            // Retry after a short delay
            setTimeout(() => sendMessageWithRetry(retryCount + 1), 1000)
          } else {
            showErrorMessage(modal, "❌ Failed to save job application. Please refresh the page and try again.")
          }
        }
      }

      // Start the message sending process
      sendMessageWithRetry()
    })
  }

  // Function to detect apply button clicks
  function setupApplyDetection() {
    // Use event delegation on the document level
    document.addEventListener("click", (e) => {
      // Check if the clicked element or its parent matches any of our apply button selectors
      const isApplyButton = selectors.applyButtons.some(selector => {
        const matches = e.target.matches(selector) || e.target.closest(selector)
        if (matches) {
          console.log("Apply button found:", {
            selector,
            element: e.target.outerHTML
          })
        }
        return matches
      })

      if (isApplyButton) {
        console.log("Apply button clicked, waiting for job details...")
        // Small delay to ensure page has loaded job details
        setTimeout(() => {
          const jobData = extractJobInfo()
          showJobCaptureModal(jobData)
        }, 1000)
      }
    }, true) // Use capture phase to ensure we catch the event early
  }

  // Initialize when page loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupApplyDetection)
  } else {
    setupApplyDetection()
  }

  // Add styles for messages
  const style = document.createElement("style")
  style.textContent = `
    .job-tracker-error {
      color: #dc2626;
      background-color: #fee2e2;
      padding: 8px 12px;
      border-radius: 4px;
      margin-top: 12px;
      font-size: 14px;
    }
    
    .job-tracker-success {
      color: #166534;
      background-color: #dcfce7;
      padding: 8px 12px;
      border-radius: 4px;
      margin-top: 12px;
      font-size: 14px;
    }
  `
  document.head.appendChild(style)

  // Remove the mutation observer since we're using event delegation
  // The event listener will work with dynamically added content
})()
