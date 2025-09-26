// Job Application Tracker - Tracker Page Script

// Make updateStatus available globally
window.updateStatus = async function(applicationId, newStatus) {
  try {
    const result = await chrome.storage.local.get(["jobApplications"])
    const applications = result.jobApplications || []

    const updatedApplications = applications.map((app) => {
      if (app.id === applicationId) {
        return {
          ...app,
          status: newStatus,
          lastUpdate: new Date().toISOString().split("T")[0],
        }
      }
      return app
    })

    await chrome.storage.local.set({ jobApplications: updatedApplications })
    await loadApplications()
  } catch (error) {
    console.error("Error updating status:", error)
    showError("Failed to update status")
  }
}

// Add styles for inline editing
const style = document.createElement('style')
style.textContent = `
  .editable {
    cursor: pointer;
    position: relative;
  }

  .editable:hover {
    background-color: #f3f4f6;
  }

  .editable-text {
    display: block;
    padding: 2px 4px;
  }

  .edit-input {
    width: calc(100% - 16px);
    padding: 8px;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    font-size: 14px;
    background-color: white;
  }

  .edit-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }

  /* Status select styles */
  .status-select {
    width: 100%;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #d1d5db;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  /* Job link button styles */
  .job-link-btn {
    white-space: nowrap;
    padding: 4px 8px;
    font-size: 12px;
    width: 100%;
    text-align: center;
    display: inline-block;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .job-link-btn:hover {
    background: #2563eb;
  }

  /* Expand button styles */
  .expand-notes-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    margin: 0 auto;
  }

  .expand-notes-btn:hover {
    color: #374151;
  }

  .date-cell {
    min-width: 200px;
  }

  .date-input {
    width: 100% !important;
    padding-right: 35px !important;
    position: relative;
  }

  .date-input::-webkit-calendar-picker-indicator {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    padding: 4px;
    opacity: 1;
  }

  /* Match font size and compact padding for date input when editing */
  .edit-input.date-input {
    font-size: 14px;
    padding: 4px 32px 4px 8px !important;
    box-sizing: border-box;
  }

  #company-filter {
    width: 200px;
    max-width: 200px;
  }

  .filters {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .container {
    max-width: 1800px;
    margin: 0 auto;
  }

  .table-container {
    width: 100%;
    overflow-x: auto;
    padding: 0 8px;
    margin: 0 auto;
    max-width: 1800px;
    box-sizing: border-box;
  }

  table {
    table-layout: fixed;
    width: 100%;
    min-width: 1700px;
    margin: 0 auto;
    border-collapse: collapse;
  }

  th, td {
    padding: 12px 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background-color: #f9fafb;
    font-weight: 600;
    text-align: left;
    color: #374151;
  }

  /* Updated column widths */
  th:nth-child(1) { width: 4%; } /* Checkbox */
  th:nth-child(2) { width: 18%; } /* Company */
  th:nth-child(3) { width: 22%; } /* Position */
  th:nth-child(4) { width: 15%; } /* Location */
  th:nth-child(5) { width: 12%; } /* Salary */
  th:nth-child(6) { width: 12%; } /* Status */
  th:nth-child(7) { width: 10%; } /* Applied Date */
  th:nth-child(8) { width: 10%; } /* Last Update */
  th:nth-child(9) { width: 12%; }  /* Actions */
  th:nth-child(10) { width: 4%; }  /* Expand */
`
document.head.appendChild(style)

function setupFilters() {
  const statusFilter = document.getElementById("status-filter")
  const companyFilter = document.getElementById("company-filter")
  const dateFilter = document.getElementById("date-filter")

  statusFilter.addEventListener("change", applyFilters)
  companyFilter.addEventListener("input", applyFilters)
  dateFilter.addEventListener("change", applyFilters)
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadApplications()
  setupEventListeners()
  console.log('About to call setupFilters:', setupFilters);
  setupFilters();
  console.log('Called setupFilters');

  // Open Add Job modal if hash is #add-job
  if (window.location.hash === '#add-job') {
    setTimeout(() => {
      const modal = document.getElementById('add-job-modal');
      if (modal) modal.style.display = 'block';
    }, 300);
  }

  // 2. Import Data button logic
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');

  importBtn.addEventListener('click', () => {
    importFile.value = '';
    importFile.click();
  });

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.XLSX) {
      alert('Excel parser not loaded. Please try again in a moment.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        let rows = [];
        if (file.name.endsWith('.csv')) {
          // Parse CSV using XLSX
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        } else {
          // Parse Excel
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        }
        // Validate and filter rows
        const validRows = rows.filter(row =>
          row.Company && row.Position && row.Status
        );
        if (validRows.length === 0) {
          alert('No valid rows found. Each row must have Company, Position, and Status.');
          return;
        }
        // Helper to parse date from Excel or string (handles MM/DD/YYYY and YYYY-MM-DD)
        function parseImportedDate(val) {
          if (typeof val === 'number') {
            // Excel serial date to JS date (local time, robust)
            const utc_days = Math.floor(val - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            // Correct for timezone offset
            const tzOffset = date_info.getTimezoneOffset() * 60000;
            const localDate = new Date(date_info.getTime() + tzOffset);
            return localDate.getFullYear() + '/' + String(localDate.getMonth() + 1).padStart(2, '0') + '/' + String(localDate.getDate()).padStart(2, '0');
          } else if (typeof val === 'string' && val.trim()) {
            // Try YYYY/MM/DD
            let match = val.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
            if (match) {
              const [_, y, m, d] = match;
              return y + '/' + String(m).padStart(2, '0') + '/' + String(d).padStart(2, '0');
            }
            // Try MM/DD/YYYY
            match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (match) {
              const [_, m, d, y] = match;
              return y + '/' + String(m).padStart(2, '0') + '/' + String(d).padStart(2, '0');
            }
            // Fallback to Date parsing
            const jsDate = new Date(val);
            if (!isNaN(jsDate)) {
              return jsDate.getFullYear() + '/' + String(jsDate.getMonth() + 1).padStart(2, '0') + '/' + String(jsDate.getDate()).padStart(2, '0');
            }
          }
          // fallback to today
          const today = new Date();
          return today.getFullYear() + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0');
        }
        // Map to app structure
        const allowedStatuses = ['applied', 'interview', 'offer', 'rejected', 'withdrawn'];
        // Find the status field key in a case-insensitive way
        function getStatusFieldKey(row) {
          return Object.keys(row).find(k => k.toLowerCase() === 'status');
        }
        const newJobs = validRows.map(row => {
          const statusKey = getStatusFieldKey(row);
          let status = statusKey ? (row[statusKey] || '').toLowerCase() : '';
          if (!allowedStatuses.includes(status)) status = 'applied';
          // Applied Date
          let appliedDate = parseImportedDate(row['Applied Date']);
          if (!row['Applied Date']) {
            const today = new Date();
            appliedDate = today.getFullYear() + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0');
          }
          // Last Update
          let lastUpdate = parseImportedDate(row['Last Update']);
          if (!row['Last Update']) lastUpdate = appliedDate;
          return {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            company: row.Company,
            position: row.Position,
            location: row.Location || '',
            salary: row.Salary || '',
            status,
            appliedDate,
            lastUpdate,
            notes: row.Notes || '',
            url: row.URL || '',
          };
        });
        // Save to storage
        const result = await chrome.storage.local.get(['jobApplications']);
        const applications = result.jobApplications || [];
        await chrome.storage.local.set({ jobApplications: [...applications, ...newJobs] });
        alert(`Imported ${newJobs.length} job application(s).`);
        await loadApplications();
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import data. Please check your file format.');
      }
    };
    reader.readAsBinaryString(file);
  });

  // === Charts Modal Logic ===
  let statusPieChart, locationBarChart, dailyLineChart, weeklyLineChart, monthlyLineChart, salaryLineChart;

  function parseSalary(salaryStr) {
    if (!salaryStr) return null;
    // Remove $ and commas, handle ranges
    const match = salaryStr.replace(/\$/g, '').replace(/,/g, '').match(/(\d{2,6})(?:\s*[-–]\s*(\d{2,6}))?/);
    if (!match) return null;
    const min = parseInt(match[1], 10);
    const max = match[2] ? parseInt(match[2], 10) : min;
    if (isNaN(min) || isNaN(max)) return null;
    return (min + max) / 2;
  }

  function showChartsModal(applications) {
    const modal = document.getElementById('charts-modal');
    modal.style.display = 'block';

    // Prepare data
    const statusCounts = {};
    const locationCounts = {};
    const dailyCounts = {};
    const weeklyCounts = {};
    const monthlyCounts = {};
    const salaryData = [];

    applications.forEach((app) => {
      // Status
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      
      // Location
      const loc = app.location && app.location.trim() ? app.location.trim() : 'Unknown';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      
      // Date calculations
      if (app.appliedDate) {
        const date = new Date(app.appliedDate);
        
        // Daily counts
        const dayKey = date.toISOString().split('T')[0];
        dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
        
        // Weekly counts
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
        
        // Monthly counts
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
      }
      
      // Salary
      const avgSalary = parseSalary(app.salary);
      if (avgSalary) {
        salaryData.push(avgSalary);
      }
    });

    // Pie chart for status
    const statusLabels = Object.keys(statusCounts).map(s => capitalizeFirst(s));
    const statusData = Object.values(statusCounts);
    const statusColors = ['#3b82f6','#f59e42','#22c55e','#ef4444','#a1a1aa'];
    if (statusPieChart) statusPieChart.destroy();
    statusPieChart = new Chart(document.getElementById('statusPieChart').getContext('2d'), {
      type: 'pie',
      data: {
        labels: statusLabels,
        datasets: [{
          data: statusData,
          backgroundColor: statusColors.slice(0, statusLabels.length),
        }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } }
      }
    });

    // Bar chart for locations
    const locLabels = Object.keys(locationCounts);
    const locData = Object.values(locationCounts);
    if (locationBarChart) locationBarChart.destroy();
    locationBarChart = new Chart(document.getElementById('locationBarChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: locLabels,
        datasets: [{
          label: 'Applications',
          data: locData,
          backgroundColor: '#3b82f6',
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 30 } } }
      }
    });

    // Calculate statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    // Calculate daily average (last 30 days)
    const dailyApplications = Object.entries(dailyCounts)
      .filter(([date]) => new Date(date) >= thirtyDaysAgo)
      .reduce((sum, [_, count]) => sum + count, 0);
    const dailyAverage = dailyApplications / 30;

    // Calculate weekly average (last 30 days)
    const weeklyApplications = Object.entries(weeklyCounts)
      .filter(([date]) => new Date(date) >= thirtyDaysAgo)
      .reduce((sum, [_, count]) => sum + count, 0);
    const weeklyAverage = weeklyApplications / 4;

    // Calculate monthly average (last 30 days)
    const monthlyApplications = Object.entries(monthlyCounts)
      .filter(([date]) => new Date(date) >= thirtyDaysAgo)
      .reduce((sum, [_, count]) => sum + count, 0);
    const monthlyAverage = monthlyApplications;

    // Calculate average salary
    const avgSalary = salaryData.length ? 
      Math.round(salaryData.reduce((a, b) => a + b, 0) / salaryData.length) : 0;

    // Update statistics display
    document.getElementById('daily-stats').textContent = dailyAverage.toFixed(1);
    document.getElementById('weekly-stats').textContent = weeklyAverage.toFixed(1);
    document.getElementById('monthly-stats').textContent = monthlyAverage.toFixed(1);
    document.getElementById('salary-stats').textContent = avgSalary ? 
      `$${avgSalary.toLocaleString()}` : 'Not available';
  }

  const chartsBtn = document.getElementById('charts-btn');
  const chartsModal = document.getElementById('charts-modal');
  const closeChartsModal = document.getElementById('close-charts-modal');
  if (chartsBtn && chartsModal && closeChartsModal) {
    chartsBtn.addEventListener('click', async () => {
      const result = await chrome.storage.local.get(["jobApplications"]);
      const applications = result.jobApplications || [];
      showChartsModal(applications);
    });
    closeChartsModal.addEventListener('click', () => {
      chartsModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
      if (event.target === chartsModal) chartsModal.style.display = 'none';
    });
  }
})

async function loadApplications() {
  try {
    const tbody = document.getElementById("applications-table-body")
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">Loading applications...</td>
      </tr>
    `

    const result = await chrome.storage.local.get(["jobApplications"])
    const applications = result.jobApplications || []
    displayApplications(applications)
  } catch (error) {
    console.error("Error loading applications:", error)
    showError("Failed to load applications")
  }
}

function displayApplications(applications) {
  const tbody = document.getElementById("applications-table-body")

  if (applications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">No applications yet. Start applying for jobs and we'll track them automatically!</td>
      </tr>
    `
    return
  }

  // Sort by most recent
  applications.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))

  // Track selected rows
  let selectedIds = new Set();
  const deleteBtn = document.getElementById('delete-selected-btn');
  if (deleteBtn) deleteBtn.style.display = 'none';

  let expandedId = null;
  tbody.innerHTML = applications
    .map(
      (app) => `
    <tr data-id="${app.id}">
      <td><input type="checkbox" class="row-checkbox" data-id="${app.id}"></td>
      <td class="editable" data-field="company" title="${app.company}">
        <span class="editable-text">${app.company}</span>
        <input type="text" class="edit-input" value="${app.company}" style="display: none;">
      </td>
      <td class="editable" data-field="position" title="${app.position}">
        <span class="editable-text">${app.position}</span>
        <input type="text" class="edit-input" value="${app.position}" style="display: none;">
      </td>
      <td class="editable" data-field="location" title="${app.location || 'N/A'}">
        <span class="editable-text">${app.location || "N/A"}</span>
        <input type="text" class="edit-input" value="${app.location || ''}" style="display: none;">
      </td>
      <td class="editable" data-field="salary" title="${app.salary || 'Not specified'}">
        <span class="editable-text">${app.salary || "Not specified"}</span>
        <input type="text" class="edit-input" value="${app.salary || ''}" style="display: none;">
      </td>
      <td>
        <select class="status-select" data-id="${app.id}" style="
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #d1d5db;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background-color: ${getStatusColor(app.status)};
          color: ${getStatusTextColor(app.status)};
        ">
          <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Applied</option>
          <option value="interview" ${app.status === 'interview' ? 'selected' : ''}>Interview</option>
          <option value="offer" ${app.status === 'offer' ? 'selected' : ''}>Offer</option>
          <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </td>
      <td class="editable date-cell" data-field="appliedDate" title="${formatDisplayDate(app.appliedDate)}">
        <span class="editable-text">${formatDisplayDate(app.appliedDate)}</span>
        <input type="date" class="edit-input date-input" value="${formatInputDate(app.appliedDate)}" style="display: none;" placeholder="YYYY/MM/DD">
      </td>
      <td class="editable date-cell" data-field="lastUpdate" title="${formatDisplayDate(app.lastUpdate)}">
        <span class="editable-text">${formatDisplayDate(app.lastUpdate)}</span>
        <input type="date" class="edit-input date-input" value="${formatInputDate(app.lastUpdate)}" style="display: none;" placeholder="YYYY/MM/DD">
      </td>
      <td style="max-width:110px;overflow:hidden;">
        <a href="${app.url}" target="_blank" class="btn job-link-btn" style="max-width:100px;overflow:hidden;text-overflow:ellipsis;">View Job</a>
      </td>
      <td style="width:36px;text-align:center;">
        <button class="expand-notes-btn" data-id="${app.id}" title="Show Notes" style="background:none;border:none;cursor:pointer;font-size:18px;line-height:1;">&#x25BC;</button>
      </td>
    </tr>
    <tr class="notes-row" id="notes-row-${app.id}" style="display:none;background:#f9fafb;">
      <td colspan="10" style="padding:12px 16px;color:#374151;font-size:14px;">
        <div style="display:flex;gap:32px;align-items:flex-start;">
          <div style="flex:1;min-width:0;max-width:60%;overflow:auto;">
            <strong>Job Description:</strong><br>
            <div style="max-height:180px;overflow:auto;font-size:13px;background:#f3f4f6;padding:8px;border-radius:6px;white-space:pre-line;">${app.description ? app.description.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<em>No description</em>'}</div>
          </div>
          <div style="flex:1;min-width:0;max-width:40%;overflow:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong>Notes:</strong>
              <button class="edit-notes-btn" data-id="${app.id}" style="background:none;border:none;cursor:pointer;color:#3b82f6;font-size:12px;padding:4px 8px;border-radius:4px;hover:background:#f3f4f6;">✎ Edit</button>
            </div>
            <div class="notes-content" data-id="${app.id}" style="max-height:180px;overflow:auto;font-size:13px;background:#f3f4f6;padding:8px;border-radius:6px;white-space:pre-line;">${app.notes ? app.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<em>No notes</em>'}</div>
            <textarea class="notes-edit" data-id="${app.id}" style="display:none;width:100%;max-height:180px;min-height:100px;font-size:13px;padding:8px;border-radius:6px;border:1px solid #d1d5db;resize:vertical;margin-top:8px;">${app.notes || ''}</textarea>
            <div class="notes-actions" data-id="${app.id}" style="display:none;margin-top:8px;text-align:right;">
              <button class="save-notes-btn" data-id="${app.id}" style="background:#3b82f6;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:8px;">Save</button>
              <button class="cancel-notes-btn" data-id="${app.id}" style="background:#f3f4f6;color:#374151;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Cancel</button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `,
    )
    .join("")

  // Add event listeners to all status selects
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const applicationId = e.target.dataset.id
      const newStatus = e.target.value
      await updateStatus(applicationId, newStatus)
    })
  })

  // Add event listeners for expand/collapse notes
  document.querySelectorAll('.expand-notes-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const notesRow = document.getElementById('notes-row-' + id);
      const isOpen = notesRow.style.display !== 'none';

      // Collapse all
      document.querySelectorAll('.notes-row').forEach(row => row.style.display = 'none');
      document.querySelectorAll('.expand-notes-btn').forEach(b => b.innerHTML = '&#x25BC;');

      if (!isOpen) {
        // Open this one
        notesRow.style.display = '';
        btn.innerHTML = '&#x25B2;'; // Up arrow
      }
      // If isOpen, do nothing (all are collapsed now)
    });
  });

  // Add event listeners for inline editing
  setupInlineEditing()

  // Checkbox logic
  const checkboxes = document.querySelectorAll('.row-checkbox');
  const selectAll = document.getElementById('select-all-checkbox');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.addEventListener('change', function() {
      checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
      });
      updateDeleteButton();
    });
  }
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateDeleteButton);
  });

  function updateDeleteButton() {
    const checked = Array.from(checkboxes).some(cb => cb.checked);
    if (deleteBtn) deleteBtn.style.display = checked ? 'inline-block' : 'none';
  }

  if (deleteBtn) {
    deleteBtn.onclick = async function() {
      const checkedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.id);
      if (checkedIds.length === 0) return;
      if (!confirm(`Delete ${checkedIds.length} selected job application(s)? This cannot be undone.`)) return;
      const result = await chrome.storage.local.get(["jobApplications"]);
      const applications = result.jobApplications || [];
      const filtered = applications.filter(app => !checkedIds.includes(app.id));
      await chrome.storage.local.set({ jobApplications: filtered });
      await loadApplications();
    }
  }
}

function setupEventListeners() {
  document.getElementById("export-btn").addEventListener("click", exportData)
  document.getElementById("refresh-btn").addEventListener("click", loadApplications)
  
  // Add Job Modal Event Listeners
  const modal = document.getElementById("add-job-modal")
  const addJobBtn = document.getElementById("add-job-btn")
  const closeBtn = document.querySelector(".close")
  const cancelBtn = document.getElementById("cancel-add")
  const addJobForm = document.getElementById("add-job-form")

  addJobBtn.addEventListener("click", () => {
    modal.style.display = "block"
  })

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none"
  })

  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none"
  })

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  })

  addJobForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    
    const newJob = {
      id: Date.now().toString(),
      company: document.getElementById("company").value,
      position: document.getElementById("position").value,
      location: document.getElementById("location").value,
      salary: document.getElementById("salary").value,
      url: document.getElementById("url").value,
      status: document.getElementById("status").value,
      appliedDate: new Date().toISOString().split("T")[0],
      lastUpdate: new Date().toISOString().split("T")[0]
    }

    try {
      const result = await chrome.storage.local.get(["jobApplications"])
      const applications = result.jobApplications || []
      applications.push(newJob)
      await chrome.storage.local.set({ jobApplications: applications })
      
      // Reset form and close modal
      addJobForm.reset()
      modal.style.display = "none"
      
      // Refresh the display
      await loadApplications()
    } catch (error) {
      console.error("Error adding job:", error)
      showError("Failed to add job application")
    }
  })

  // Add event listeners for notes editing
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-notes-btn')) {
      const id = e.target.dataset.id;
      const notesContent = document.querySelector(`.notes-content[data-id="${id}"]`);
      const notesEdit = document.querySelector(`.notes-edit[data-id="${id}"]`);
      const notesActions = document.querySelector(`.notes-actions[data-id="${id}"]`);
      
      notesContent.style.display = 'none';
      notesEdit.style.display = 'block';
      notesActions.style.display = 'block';
      notesEdit.focus();
    }
    
    if (e.target.classList.contains('save-notes-btn')) {
      const id = e.target.dataset.id;
      const notesContent = document.querySelector(`.notes-content[data-id="${id}"]`);
      const notesEdit = document.querySelector(`.notes-edit[data-id="${id}"]`);
      const notesActions = document.querySelector(`.notes-actions[data-id="${id}"]`);
      
      try {
        const result = await chrome.storage.local.get(["jobApplications"]);
        const applications = result.jobApplications || [];
        
        const updatedApplications = applications.map(app => {
          if (app.id === id) {
            return {
              ...app,
              notes: notesEdit.value.trim(),
              lastUpdate: new Date().toISOString().split("T")[0]
            };
          }
          return app;
        });
        
        await chrome.storage.local.set({ jobApplications: updatedApplications });
        
        notesContent.innerHTML = notesEdit.value.trim() ? 
          notesEdit.value.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') : 
          '<em>No notes</em>';
        notesContent.style.display = 'block';
        notesEdit.style.display = 'none';
        notesActions.style.display = 'none';
      } catch (error) {
        console.error("Error saving notes:", error);
        showError("Failed to save notes");
      }
    }
    
    if (e.target.classList.contains('cancel-notes-btn')) {
      const id = e.target.dataset.id;
      const notesContent = document.querySelector(`.notes-content[data-id="${id}"]`);
      const notesEdit = document.querySelector(`.notes-edit[data-id="${id}"]`);
      const notesActions = document.querySelector(`.notes-actions[data-id="${id}"]`);
      
      notesContent.style.display = 'block';
      notesEdit.style.display = 'none';
      notesActions.style.display = 'none';
    }
  });
}

async function applyFilters() {
  const statusFilter = document.getElementById("status-filter").value
  const companyFilter = document.getElementById("company-filter").value.toLowerCase()
  const dateFilter = document.getElementById("date-filter").value

  const result = await chrome.storage.local.get(["jobApplications"])
  let applications = result.jobApplications || []

  // Apply status filter
  if (statusFilter) {
    applications = applications.filter((app) => app.status === statusFilter)
  }

  // Apply company filter
  if (companyFilter) {
    applications = applications.filter((app) => app.company.toLowerCase().includes(companyFilter))
  }

  // Apply date filter
  if (dateFilter) {
    const days = parseInt(dateFilter)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    applications = applications.filter((app) => new Date(app.appliedDate) >= cutoffDate)
  }

  displayApplications(applications)
}

async function exportData() {
  try {
    const result = await chrome.storage.local.get(["jobApplications"])
    const applications = result.jobApplications || []

    const csvContent = convertToCSV(applications)
    downloadCSV(csvContent, "job-applications.csv")
  } catch (error) {
    console.error("Error exporting data:", error)
    showError("Failed to export data")
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

  return [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv" })
  const url = URL.createObjectURL(blob)

  chrome.downloads.download({
    url: url,
    filename: filename,
  })
}

function formatDisplayDate(dateString) {
  if (!dateString) return '';
  // Always expect YYYY/MM/DD
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
}

function formatInputDate(dateString) {
  // For <input type="date">, must be YYYY-MM-DD
  if (!dateString) return '';
  // Convert from YYYY/MM/DD to YYYY-MM-DD
  let match = dateString.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const [_, y, m, d] = match;
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  const d = new Date(dateString);
  if (isNaN(d)) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function parseInputDateToStorage(val) {
  // Accept YYYY-MM-DD or YYYY/MM/DD, return YYYY/MM/DD
  if (!val) return '';
  let match = val.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (match) {
    const [_, y, m, d] = match;
    return y + '/' + String(m).padStart(2, '0') + '/' + String(d).padStart(2, '0');
  }
  // fallback: try Date parsing
  const d = new Date(val);
  if (!isNaN(d)) {
    return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
  }
  return val;
}

function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

function showError(message) {
  // You could implement a more sophisticated error display here
  alert(message)
}

// Update the status color functions
function getStatusColor(status) {
  const colors = {
    applied: '#dbeafe',    // Light blue
    interview: '#fef3c7',  // Light yellow
    offer: '#dcfce7',      // Light green
    rejected: '#fee2e2'    // Light red
  }
  return colors[status] || '#dbeafe'
}

function getStatusTextColor(status) {
  const colors = {
    applied: '#1e40af',    // Dark blue
    interview: '#92400e',  // Dark yellow
    offer: '#166534',      // Dark green
    rejected: '#991b1b'    // Dark red
  }
  return colors[status] || '#1e40af'
}

function setupInlineEditing() {
  document.querySelectorAll('.editable').forEach(cell => {
    const textSpan = cell.querySelector('.editable-text')
    const input = cell.querySelector('.edit-input')
    const field = cell.dataset.field
    const row = cell.closest('tr')
    const applicationId = row.dataset.id

    // Handle click to edit
    cell.addEventListener('click', () => {
      textSpan.style.display = 'none'
      input.style.display = 'block'
      input.focus()
    })

    // Handle input blur (save)
    input.addEventListener('blur', async () => {
      let newValue = input.value.trim();
      const oldValue = textSpan.textContent;
      if (field === 'appliedDate' || field === 'lastUpdate') {
        newValue = parseInputDateToStorage(newValue);
      }
      if (newValue !== oldValue && newValue) {
        try {
          const result = await chrome.storage.local.get(["jobApplications"])
          const applications = result.jobApplications || []

          const updatedApplications = applications.map(app => {
            if (app.id === applicationId) {
              return {
                ...app,
                [field]: newValue,
                lastUpdate: new Date().toISOString().split("T")[0]
              }
            }
            return app
          })

          await chrome.storage.local.set({ jobApplications: updatedApplications })
          textSpan.textContent = formatDisplayDate(newValue)
          textSpan.title = formatDisplayDate(newValue)
        } catch (error) {
          console.error("Error updating field:", error)
          textSpan.textContent = oldValue
          textSpan.title = oldValue
        }
      }
      textSpan.style.display = 'block'
      input.style.display = 'none'
    })

    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur()
      }
    })
  })
} 