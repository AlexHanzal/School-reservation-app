const API_URL = `http://${window.location.hostname}:3000/api`;

const translations = {
    cs: {
        weekdays: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
        months: ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 
                'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
    },
    en: {
        weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        months: ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']
    }
};

let currentLanguage = 'cs'; // Default language

// Add current user tracking
let currentUser = {
    name: null,
    abbreviation: null,
    isLoggedIn: false
};

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let isAdminMode = false;
let currentTimetableName = '';
let isEditMode = false;

function generateCalendar() {
    const currentRealDate = new Date(); // Was getCurrentDate()
    const calendar = document.getElementById('timetable-calendar');
    const calendarTitle = document.getElementById('timetable-calendar-title');

    // Use month names instead of shortened versions for larger calendar
    const months = translations[currentLanguage]?.months || [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    calendarTitle.textContent = `${months[currentMonth]} ${currentYear}`;

    // Clear the calendar first to ensure fresh generation
    if (calendar) {
        calendar.innerHTML = '';
    } else {
        console.error('Calendar container not found');
        return;
    }

    const now = new Date(currentYear, currentMonth);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const table = document.createElement('table');
    table.className = 'calendar-table';
    
    const tableHead = document.createElement('thead');
    const tableBody = document.createElement('tbody');

    // Add weekday headers
    const headerRow = document.createElement('tr');
    const weekdays = translations[currentLanguage]?.weekdays || ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
    
    weekdays.forEach(weekday => {
        const headerCell = document.createElement('th');
        headerCell.textContent = weekday;
        headerRow.appendChild(headerCell);
    });
    tableHead.appendChild(headerRow);
    table.appendChild(tableHead);

    // Adjust first day of week to start on Monday
    const adjustedFirstDayOfWeek = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);

    let row = document.createElement('tr');

    // Add previous month days
    for (let i = adjustedFirstDayOfWeek; i > 0; i--) {
        const prevMonthDay = daysInPrevMonth - i + 1;
        const cell = document.createElement('td');
        cell.textContent = prevMonthDay;
        cell.classList.add('prev-month', 'month-dates');
        
        // Add click event to previous month days too
        const prevMonthDate = new Date(currentYear, currentMonth - 1, prevMonthDay);
        cell.addEventListener('click', () => {
            // Go to previous month and select this day
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar();
            selectDate(prevMonthDay);
        });
        
        row.appendChild(cell);
    }

    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('td');
        cell.textContent = day;
        cell.classList.add('hoverable');
        
        // Check if current day
        if (day === currentRealDate.getDate() && 
            currentMonth === currentRealDate.getMonth() && 
            currentYear === currentRealDate.getFullYear()) {
            cell.classList.add('current-day');
        }
        
        // Check if this day is the currently selected week
        if (currentTimetableName && timetables[currentTimetableName]) {
            const currentWeek = new Date(timetables[currentTimetableName].currentWeek);
            const dayDate = new Date(currentYear, currentMonth, day);
            
            // Highlight the entire week that contains the current week's Monday
            const mondayOfDay = new Date(dayDate);
            const dayOfWeek = dayDate.getDay();
            mondayOfDay.setDate(dayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            const mondayOfCurrentWeek = new Date(currentWeek);
            
            if (mondayOfDay.toDateString() === mondayOfCurrentWeek.toDateString()) {
                cell.classList.add('selected');
            }
        }

        cell.addEventListener('click', () => selectDate(day));
        row.appendChild(cell);

        // Start new row every 7 days
        if ((adjustedFirstDayOfWeek + day) % 7 === 0) {
            tableBody.appendChild(row);
            row = document.createElement('tr');
        }
    }

    // Add next month days if needed
    if (row.children.length > 0) {
        let nextMonthDay = 1;
        while (row.children.length < 7) {
            const cell = document.createElement('td');
            cell.textContent = nextMonthDay;
            cell.classList.add('next-month', 'month-dates');
            
            // Add click event to next month days too
            cell.addEventListener('click', () => {
                // Go to next month and select this day
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                generateCalendar();
                selectDate(nextMonthDay);
            });
            
            row.appendChild(cell);
            nextMonthDay++;
        }
        tableBody.appendChild(row);
    }

    table.appendChild(tableBody);
    calendar.appendChild(table);
    
    // Add event listeners for calendar navigation buttons
    const prevButton = document.querySelector('.timetable-calendar .prev-button');
    const nextButton = document.querySelector('.timetable-calendar .next-button');
    
    if (prevButton) {
        prevButton.onclick = function() {
            // Save current state before changing month
            if (currentTimetableName && timetables[currentTimetableName]) {
                saveTimeTableSilently();
            }
            
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar();
        };
    }
    
    if (nextButton) {
        nextButton.onclick = function() {
            // Save current state before changing month
            if (currentTimetableName && timetables[currentTimetableName]) {
                saveTimeTableSilently();
            }
            
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateCalendar();
        };
    }
    
    console.log('Calendar generated successfully for', months[currentMonth], currentYear);
}

// Ensure the calendar is generated when showing a timetable
function showTimetable(name) {
    console.log('Showing timetable:', name);
    if (!timetables[name]) {
        console.error('Timetable not found:', name);
        showCustomAlert('Error', 'Timetable not found', 'error');
        return;
    }

    const timeTable = document.querySelector('.time-table');
    const timeTableTitle = timeTable.querySelector('h2');
    timeTableTitle.textContent = timetables[name].className;
    timeTable.style.display = 'block';
    
    // Reset current month/year to today before generating calendar
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    
    // Generate calendar with logging
    console.log('Generating calendar...');
    generateCalendar();
    console.log('Calendar generation completed');
    
    currentTimetableName = name;
    localStorage.setItem('currentTimetable', name);
    
    // Make sure calendar and buttons are visible if logged in
    if (currentUser && currentUser.isLoggedIn) {
        document.body.classList.remove('not-logged-in');
        timeTable.classList.remove('not-logged-in');
        
        // Force show the bottom content and calendar
        const bottomContent = document.querySelector('.bottom-content');
        const calendar = document.querySelector('.timetable-calendar');
        const editButton = document.querySelector('.edit-button');
        const calendarPlaceholder = document.querySelector('.calendar-placeholder');
        
        if (bottomContent) bottomContent.style.display = 'grid';
        if (calendar) calendar.style.display = 'block';
        if (editButton) editButton.style.display = 'block';
        if (calendarPlaceholder) calendarPlaceholder.style.display = 'none';
    } else {
        document.body.classList.add('not-logged-in');
        timeTable.classList.add('not-logged-in');
    }
    
    // Update the week view with the saved data
    updateTimetableForWeek(new Date(timetables[name].currentWeek || new Date().toISOString()));
}

// Add a function to initialize the calendar on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add other initialization code
    
    // Make sure the calendar is properly generated on load
    const timeTable = document.querySelector('.time-table');
    if (timeTable && timeTable.style.display !== 'none') {
        generateCalendar();
    }
    
    // Ensure navigation buttons work
    const prevButton = document.querySelector('.timetable-calendar .prev-button');
    const nextButton = document.querySelector('.timetable-calendar .next-button');
    
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar();
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateCalendar();
        });
    }
});

function selectDate(day = currentDate.getDate()) {
    const selectedDate = new Date(currentYear, currentMonth, day);
    
    // Clear previous selections
    document.querySelectorAll('.calendar-table td.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    // Add selection to clicked date
    if (event && event.target) {
        event.target.classList.add('selected');
    }
    
    console.log(`Selected date: ${selectedDate.toDateString()}`);
    
    // Save the current state before changing the week
    if (currentTimetableName && timetables[currentTimetableName]) {
        saveTimeTableSilently();
    }
    
    // Update timetable week view with the newly selected date
    updateTimetableForWeek(selectedDate);
}

// Update timetables initialization
let timetables = {};

function createDynamicButton(name) {
    const container = document.createElement('div');
    container.className = 'button-group';
    
    const button = document.createElement('button');
    button.className = 'dynamic-button';
    button.textContent = name;
    button.addEventListener('click', () => showTimetable(name));
    
    const editButton = document.createElement('button');
    editButton.className = 'gear-icon';
    editButton.innerHTML = '✎';
    editButton.title = 'Edit class';
    editButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the timetable show
        console.log('Edit button clicked for class:', name, 'Admin mode:', isAdminMode);
        if (isAdminMode) {
            showClassEditMenu(name);
        }
    });
    
    // Make sure the edit button is visible in admin mode
    if (isAdminMode) {
        editButton.classList.add('visible');
    }
    
    container.appendChild(button);
    container.appendChild(editButton);
    return container;
}

document.getElementById('submit-button').addEventListener('click', async () => {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();
    
    if (name) {
        try {
            // Show loading overlay during API call
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('active');
                loadingOverlay.style.display = 'flex';
                const loadingText = loadingOverlay.querySelector('.loading-text');
                if (loadingText) loadingText.textContent = 'Creating class...';
            }
            
            const response = await fetch(`${API_URL}/timetables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
            });
            
            const result = await response.json();
            
            // Hide loading overlay - make sure this happens regardless of success
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
                loadingOverlay.style.display = 'none';
            }
            
            if (result.success) {
                // Clear any existing button with the same name first
                const existingButton = document.querySelector(`.dynamic-button[data-name="${name}"]`);
                if (existingButton) {
                    const container = existingButton.closest('.button-group');
                    if (container) {
                        container.remove();
                    }
                }
                
                // Create a new button
                const dynamicButton = createDynamicButton(name);
                const container = document.getElementById('dynamic-links-container');
                
                // Add data attribute for identification
                const buttonElement = dynamicButton.querySelector('.dynamic-button');
                if (buttonElement) {
                    buttonElement.setAttribute('data-name', name);
                }
                
                container.appendChild(dynamicButton);
                
                timetables[name] = {
                    className: name,
                    fileId: result.fileId,
                    data: {},
                    calendar: document.getElementById('timetable-calendar').innerHTML
                };
                
                showTimetable(name);
                document.getElementById('select-screen').style.display = 'none';
                nameInput.value = '';
                
                // Show success message
                showCustomAlert('Success', 'New class created successfully', 'success');
            } else {
                showCustomAlert('Error', result.error || 'Failed to create class', 'error');
            }
        } catch (error) {
            console.error('Failed to create timetable:', error);
            
            // Ensure loading overlay is hidden on error
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
                loadingOverlay.style.display = 'none';
            }
            
            showCustomAlert('Error', 'Failed to create timetable: ' + (error.message || 'Unknown error'), 'error');
        }
    } else {
        showCustomAlert('Error', 'Please enter a class name', 'error');
    }
});

// Load saved timetables on startup
document.addEventListener('DOMContentLoaded', () => {
    // Initialize timetables
    loadTimetables().then(() => {
        // Restore previous view state
        const savedTimetable = localStorage.getItem('currentTimetable');
        if (savedTimetable && timetables[savedTimetable]) {
            showTimetable(savedTimetable);
        }
    }).catch(error => {
        console.error('Error during initialization:', error);
        showCustomAlert('Error', 'Failed to initialize application', 'error');
    });
    
    // Add event listener for the create-new button to show select screen
    const createNewBtn = document.getElementById('create-new');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            showSelectScreen();
        });
    }

    // We need to make sure this only runs once
    console.log('Document loaded, initializing...');
    
    // Load timetables first - single source of truth for initialization
    loadTimetables().then(() => {
        console.log('Timetables loaded, restoring previous state...');
        const savedTimetable = localStorage.getItem('currentTimetable');
        if (savedTimetable && timetables[savedTimetable]) {
            showTimetable(savedTimetable);
        }
    }).catch(error => {
        console.error('Error during initialization:', error);
        showCustomAlert('Error', 'Failed to initialize application', 'error');
    });

    setupVerificationWindow();
    
    // Set initial state for edit button and calendar visibility
    if (!currentUser || !currentUser.isLoggedIn) {
        document.body.classList.add('not-logged-in');
    } else {
        document.body.classList.remove('not-logged-in');
    }
});

function updateTimetableForWeek(selectedDate) {
    const currentRealDate = new Date();
    // Get Monday of selected week
    const monday = new Date(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    monday.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // Store the current week in timetable data for persistence
    if (currentTimetableName && timetables[currentTimetableName]) {
        timetables[currentTimetableName].currentWeek = monday.toISOString();
    }

    // Clear all existing content and styles first
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        // Reset the cell completely
        cell.textContent = '';
        cell.className = '';
        cell.removeAttribute('data-permanent');
        cell.style.cssText = ''; // Clear all inline styles
    });

    // Update each row with correct date
    const dayRows = document.querySelectorAll('.week-table tbody tr');
    const days = ['Po', 'Út', 'St', 'Čt', 'Pá']; // Short day names
    
    dayRows.forEach((row, index) => {
        const dateForDay = new Date(monday);
        dateForDay.setDate(monday.getDate() + index);
        const dateString = dateForDay.toISOString().split('T')[0];
        
        // Update first cell with day name and date in a more compact format
        const firstCell = row.querySelector('td:first-child');
        firstCell.textContent = `${days[index]} ${dateForDay.getDate()}.${dateForDay.getMonth() + 1}`; // Even more compact
        firstCell.dataset.date = dateString;
        
        // Process cells for this row
        const cells = row.querySelectorAll('td:not(:first-child)');
        cells.forEach((cell, hourIndex) => {
            // Reset cell styling completely
            cell.className = '';
            cell.dataset.date = dateString;
            cell.dataset.hour = hourIndex + 1;
            cell.dataset.rowIndex = index;
            cell.dataset.columnIndex = hourIndex;
            
            // First check for permanent hours
            const permanentHours = timetables[currentTimetableName]?.permanentHours || {};
            if (permanentHours[index] && permanentHours[index][hourIndex + 1]) {
                cell.textContent = permanentHours[index][hourIndex + 1];
                cell.classList.add('permanent-hour');
                cell.dataset.permanent = 'true';
            } 
            // Then check for date-specific data
            else if (timetables[currentTimetableName]?.data?.[dateString]) {
                const dayData = timetables[currentTimetableName].data[dateString][index];
                if (dayData && dayData[hourIndex] !== undefined) {
                    cell.textContent = dayData[hourIndex];
                }
            }
        });

        // Highlight current day
        if (dateForDay.toDateString() === currentRealDate.toDateString()) {
            firstCell.classList.add('current-day');
        } else {
            firstCell.classList.remove('current-day');
        }
    });

    // Log the current state after updating
    console.log(`Updated timetable for week of ${monday.toDateString()}`);
}

function findPermanentHoursForDay(dayIndex) {
    const permanentHours = {};
    
    // Search through all saved weeks for permanent hours
    if (timetables[currentTimetableName]?.permanentHours?.[dayIndex]) {
        return timetables[currentTimetableName].permanentHours[dayIndex];
    }
    
    return permanentHours;
}

function toggleAdminEditMode() {
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        // Make all cells editable in admin mode
        cell.setAttribute('contenteditable', 'true');
        cell.classList.add('editable');
        
        // Enhance styling for permanent hours when in admin mode
        if (cell.classList.contains('permanent-hour')) {
            cell.style.backgroundColor = '#fff3e0'; // Light orange background
            cell.style.border = '2px solid #ff9800'; // Orange border
        }
        
        // Add input event listener for making cells permanent only when toggle is enabled
        cell.addEventListener('input', function() {
            if (isAdminMode && permanentHourModeEnabled && this.textContent.trim() !== '') {
                this.classList.add('permanent-hour');
                this.dataset.permanent = 'true';
                this.style.backgroundColor = '#fff3e0'; // Light orange background
                this.style.border = '2px solid #ff9800'; // Orange border
            }
        });
    });    // Change edit button to show admin mode
    const editButton = document.querySelector('.edit-button');
    editButton.textContent = 'Admin Mode';
    editButton.style.backgroundColor = '#ff9800';
    
    // Show the save button when in admin mode
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.style.display = 'block';
    }
      // Add permanent hour toggle button if it doesn't exist
    let toggleButton = document.getElementById('toggle-permanent-btn');
    if (!toggleButton) {
        toggleButton = document.createElement('button');
        toggleButton.id = 'toggle-permanent-btn';
        toggleButton.className = 'toggle-permanent-btn';
        toggleButton.textContent = 'Permanent Hours: OFF';
        toggleButton.onclick = togglePermanentHourMode;
        toggleButton.style.display = 'inline-block'; // Ensure it's visible
        
        // Insert the button next to the save button
        const timeTableButtons = document.querySelector('.time-table-buttons');
        if (timeTableButtons) {
            timeTableButtons.appendChild(toggleButton);
        } else {
            // If time-table-buttons doesn't exist, create it and append to time-table
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                const newButtonContainer = document.createElement('div');
                newButtonContainer.className = 'time-table-buttons';
                newButtonContainer.appendChild(toggleButton);
  
                
                // Insert after the title
                const title = timeTable.querySelector('h2');
                if (title && title.nextSibling) {
                    timeTable.insertBefore(newButtonContainer, title.nextSibling);
                } else {
                    timeTable.appendChild(newButtonContainer);
                }
            }
        }
    } else {
        toggleButton.style.display = 'inline-block'; // Ensure it's visible
    }

    // Add admin-active class to all button groups
    document.querySelectorAll('.button-group').forEach(group => {
        group.classList.toggle('admin-active', isAdminMode);
    });

    // Show gear icons for all classes
    document.querySelectorAll('.gear-icon').forEach(icon => {
        icon.classList.toggle('visible', isAdminMode);
    });

    // Add admin-active class to all button groups
    document.querySelectorAll('.button-group').forEach(group => {
        group.classList.toggle('admin-active', isAdminMode);
    });

    // Show/hide create-new button and accounts button
    const createNewBtn = document.getElementById('create-new');
    const accountsBtn = document.getElementById('accounts-button');
    
    if (createNewBtn) createNewBtn.classList.toggle('admin-visible', isAdminMode);
    if (accountsBtn) {
        accountsBtn.classList.toggle('admin-visible', isAdminMode);
        accountsBtn.style.display = isAdminMode ? 'block' : 'none';
    }

    // Show/hide gear icons
    document.querySelectorAll('.gear-icon').forEach(icon => {
        icon.classList.toggle('visible', isAdminMode);
    });

    // Close accounts menu when exiting admin mode
    if (!isAdminMode) {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.remove('active');
            accountsOverlay.classList.remove('active');
            accountsMenu.style.display = 'none';
            accountsOverlay.style.display = 'none';
        }
    }
}

// Add this new event listener for the Edit button
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Add Edit button functionality
    const editButton = document.querySelector('.edit-button');
    if (editButton) {
        editButton.addEventListener('click', () => {
            if (!isAdminMode) {
                isEditMode = !isEditMode;
                editButton.textContent = isEditMode ? 'Cancel' : 'Edit';
                
                const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
                cells.forEach(cell => {                if (!cell.classList.contains('permanent-hour')) {
                    cell.setAttribute('contenteditable', isEditMode);
                    cell.classList.toggle('editable', isEditMode);
                }
            });
            
            // Apply cell editing with abbreviation support when in edit mode
            if (isEditMode) {
                setupCellEditing();
            }
            
            // Show/hide save button based on edit mode
            const saveButton = document.querySelector('.save-button');
            if (saveButton) {
                saveButton.style.display = isEditMode ? 'block' : 'none';
            }
            }
        });
    }    // Add Save button handler
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveTimeTable();
            isEditMode = false;
            const editButton = document.querySelector('.edit-button');
            if (editButton) {
                editButton.textContent = 'Edit';
            }
            saveButton.style.display = 'none';
            
            // Make cells non-editable and remove edited-cell class
            const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
            cells.forEach(cell => {
                cell.setAttribute('contenteditable', 'false');
                cell.classList.remove('editable');
                cell.classList.remove('edited-cell');
            });
        });
    }

    // Accounts menu button event listeners
    const modifyAccountsBtn = document.getElementById('modify-accounts');
    const removeAccountsBtn = document.getElementById('remove-accounts');
    const createAccountsBtn = document.getElementById('create-accounts');

    if (modifyAccountsBtn) {
        modifyAccountsBtn.addEventListener('click', () => {
            console.log('Modify Accounts button clicked');
            closeAccountsMenu(); // Close the menu after clicking
        });
    }

    if (removeAccountsBtn) {
        removeAccountsBtn.addEventListener('click', () => {
            console.log('Remove Accounts button clicked');
            closeAccountsMenu(); // Close the menu after clicking
        });
    }

    if (createAccountsBtn) {
        createAccountsBtn.addEventListener('click', () => {
            console.log('Create Accounts button clicked');
            showAccountCreatePopup();
            closeAccountsMenu(); // Close the menu after clicking
        });
    }
});

// Fix user abbreviation display
function addAbbreviationToCell(cell, abbreviation) {
  // Remove any existing abbreviation first
  const existingAbbr = cell.querySelector('.user-abbreviation');
  if (existingAbbr) {
    existingAbbr.remove();
  }
  
  // Get current cell content
  const cellText = cell.textContent;
  
  // Create span for content
  const contentSpan = document.createElement('span');
  contentSpan.textContent = cellText;
  contentSpan.className = 'cell-content';
  
  // Create span for abbreviation
  const abbrSpan = document.createElement('span');
  abbrSpan.textContent = abbreviation;
  abbrSpan.className = 'user-abbreviation';
  
  // Clear the cell and add the new structure
  cell.textContent = '';
  cell.appendChild(contentSpan);
  cell.appendChild(abbrSpan);
  
  // Add class for proper styling
  cell.classList.add('edited-cell-with-abbr');
}

// Process cells with abbreviation support when in edit mode
function setupCellEditingWithAbbreviation() {
  const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
  cells.forEach(cell => {
    cell.addEventListener('input', function() {
      // Mark the cell as edited
      this.classList.add('edited-cell');
      
      // Add abbreviation if logged in and the cell has content
      if (currentUser && currentUser.isLoggedIn && this.textContent.trim() !== '') {
        addAbbreviationToCell(this, currentUser.abbreviation);
        
        // Make sure the abbreviation doesn't get edited
        const abbrSpan = this.querySelector('.user-abbreviation');
        if (abbrSpan) {
          abbrSpan.contentEditable = false;
        }
      }
    });
  });
}

// Update saveTimeTable function to properly handle cells with abbreviations
async function saveTimeTable() {
  if (!currentTimetableName || !timetables[currentTimetableName]) {
    showCustomAlert('Error', 'No timetable selected', 'error');
    return;
  }

  const rows = document.querySelectorAll('.week-table tbody tr');
  
  // Make sure we have the proper data structure
  if (!timetables[currentTimetableName].data) {
    timetables[currentTimetableName].data = {};
  }
  
  // Get the current week's Monday date
  const currentDate = new Date(timetables[currentTimetableName].currentWeek);
  
  // Process each day of the week
  rows.forEach((row, dayIndex) => {
    const dayDate = new Date(currentDate);
    dayDate.setDate(currentDate.getDate() + dayIndex);
    const dateString = dayDate.toISOString().split('T')[0];
    
    // Initialize the data structure for this date if needed
    if (!timetables[currentTimetableName].data[dateString]) {
      timetables[currentTimetableName].data[dateString] = [];
    }
    
    // Process each cell in the row
    const cells = row.querySelectorAll('td:not(:first-child)');
    
    // Make sure we have an array for this day
    if (!Array.isArray(timetables[currentTimetableName].data[dateString][dayIndex])) {
      timetables[currentTimetableName].data[dateString][dayIndex] = [];
    }
    
    // Process cells and add abbreviations
    cells.forEach((cell, hourIndex) => {
      // Get the proper content, handling cells with abbreviation spans
      let cellContent = '';
      let abbreviation = '';
      
      const contentSpan = cell.querySelector('.cell-content');
      const abbrSpan = cell.querySelector('.user-abbreviation');
      
      if (contentSpan && abbrSpan) {
        // Extract from spans
        cellContent = contentSpan.textContent.trim();
        abbreviation = abbrSpan.textContent.trim();
      } else {
        // Direct content
        cellContent = cell.textContent.trim();
      }
      
      // Store the content in the data structure
      timetables[currentTimetableName].data[dateString][dayIndex][hourIndex] = cellContent;
      
      // Store abbreviation in a separate metadata structure if needed
      if (abbreviation && !timetables[currentTimetableName].cellMetadata) {
        timetables[currentTimetableName].cellMetadata = {};
      }
      
      if (abbreviation) {
        if (!timetables[currentTimetableName].cellMetadata[dateString]) {
          timetables[currentTimetableName].cellMetadata[dateString] = {};
        }
        
        if (!timetables[currentTimetableName].cellMetadata[dateString][dayIndex]) {
          timetables[currentTimetableName].cellMetadata[dateString][dayIndex] = {};
        }
        
        timetables[currentTimetableName].cellMetadata[dateString][dayIndex][hourIndex] = {
          abbreviation: abbreviation
        };
      }
      
      // Handle permanent hours
      if (cell.classList.contains('permanent-hour')) {
        if (!timetables[currentTimetableName].permanentHours) {
          timetables[currentTimetableName].permanentHours = {};
        }
        
        if (!timetables[currentTimetableName].permanentHours[dayIndex]) {
          timetables[currentTimetableName].permanentHours[dayIndex] = {};
        }
        
        timetables[currentTimetableName].permanentHours[dayIndex][hourIndex + 1] = cellContent;
      }
      
      // Remove editing indicators
      cell.classList.remove('edited-cell');
    });
  });
  
  // Proceed with saving logic...
  // Rest of the saveTimeTable function remains the same
}