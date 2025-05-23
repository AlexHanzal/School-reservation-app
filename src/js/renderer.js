const API_URL = `http://${window.location.hostname}:3000/api`;
let hasAppInitialized = false;

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

        cell.addEventListener('click', (e) => selectDate(day, e));
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

function selectDate(day = currentDate.getDate(), clickEvent) {
    const selectedDate = new Date(currentYear, currentMonth, day);
    
    // Clear previous selections
    document.querySelectorAll('.calendar-table td.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    // Add selection to clicked date
    if (clickEvent && clickEvent.target) {
        clickEvent.target.classList.add('selected');
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
            if (currentUser.isAdmin) {
                showSelectScreen();
            } else {
                showCustomAlert('Access Denied', 'You need admin privileges to create classes', 'error');
            }
        });
    }
    
    // Update debug menu button handlers
    const debugButton = document.getElementById('debug-button');
    const debugMenu = document.getElementById('debug-menu');
    const debugOverlay = document.getElementById('debug-overlay');
    const closeDebug = document.getElementById('close-debug');
    
    // Only set these up if the elements exist
    if (debugButton && debugMenu && debugOverlay && closeDebug) {        // Debug menu button handlers
        const resetAllBtn = document.getElementById('debug-reset-all');
        if (resetAllBtn) {
            // Remove any existing event listeners to avoid duplicates
            const newResetAllBtn = resetAllBtn.cloneNode(true);
            resetAllBtn.parentNode.replaceChild(newResetAllBtn, resetAllBtn);
            
            newResetAllBtn.addEventListener('click', async () => {
                console.log('Reset All button clicked');
                try {
                    await resetAllTimetables();
                    // Close debug menu after reset operation is done
                    debugMenu.classList.remove('active');
                    debugOverlay.classList.remove('active');
                } catch (error) {
                    console.error('Error in resetAllTimetables:', error);
                    showCustomAlert('Error', 'Failed to reset timetables: ' + error.message, 'error');
                }
            });
        }
        
        document.getElementById('debug-create-new').addEventListener('click', () => {
            showSelectScreen();
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        });
        
        document.getElementById('debug-accounts').addEventListener('click', () => {
            const accountsMenu = document.getElementById('accounts-menu');
            const accountsOverlay = document.getElementById('accounts-overlay');
            if (accountsMenu && accountsOverlay) {
                accountsMenu.classList.add('active');
                accountsOverlay.classList.add('active');
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        });
        
        debugButton.addEventListener('click', () => {
            debugMenu.classList.add('active');
            debugOverlay.classList.add('active');
            debugMenu.style.display = 'block';
            debugOverlay.style.display = 'block';
        });
        
        closeDebug.addEventListener('click', () => {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
            setTimeout(() => {
                debugMenu.style.display = 'none';
                debugOverlay.style.display = 'none';
            }, 300);
        });
    }
});

// Fix accounts menu close button
document.getElementById('close-accounts').addEventListener('click', () => {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    accountsMenu.classList.remove('active');
    accountsOverlay.classList.remove('active');
});

// Update accounts button functionality
document.getElementById('accounts-button').addEventListener('click', () => {
    // Allow if user is admin OR in debug mode
    if (currentUser.isAdmin || document.body.classList.contains('debug-mode')) {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');

        if (accountsMenu.style.display !== 'block') {
            accountsMenu.style.display = 'block';
            accountsMenu.style.visibility = 'visible';
            accountsOverlay.style.display = 'block';
            accountsOverlay.style.visibility = 'visible';
        } else {
            accountsMenu.style.display = 'none';
            accountsMenu.style.visibility = 'hidden';
            accountsOverlay.style.display = 'none';
            accountsOverlay.style.visibility = 'hidden';
        }
    } else {
        showCustomAlert('Access Denied', 'You need admin privileges to access accounts', 'error');
    }
});

// Ensure consistent overlay click handling
const accountsOverlay = document.getElementById('accounts-overlay');
if (accountsOverlay) { // Add null check
    accountsOverlay.addEventListener('click', () => {
        closeAccountsMenu();
    });
}

// Ensure consistent close button handling
const closeAccountsBtn = document.getElementById('close-accounts');
if (closeAccountsBtn) { // Add null check
    closeAccountsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAccountsMenu();
    });
}

// Add click handler for accounts overlay
document.getElementById('accounts-overlay').addEventListener('click', closeAccountsMenu);

// Update debug accounts button
document.getElementById('debug-accounts').addEventListener('click', () => {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    accountsMenu.classList.add('active');
    accountsOverlay.classList.add('active');
    debugMenu.classList.remove('active');
    debugOverlay.classList.remove('active');
});

// Add escape key handler for accounts menu
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('accounts-menu').classList.contains('active')) {
        closeAccountsMenu();
    }
});

// Add date picker functionality
document.getElementById('debug-set-date').addEventListener('click', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {
        // When turning on, mark current permanent hours so we can preserve them
        const cells = document.querySelectorAll('.week-table tbody td.permanent-hour');
        cells.forEach(cell => {
            cell.dataset.originalPermanent = 'true';
        });
    }
    
    showCustomAlert(
        'Permanent Hours Mode', 
        `Permanent hours mode is now ${permanentHourModeEnabled ? 'ON' : 'OFF'}`,
        permanentHourModeEnabled ? 'success' : 'info'
    );
}

// Fix the closeAccountsMenu function by putting it in the right location
// Add this before it's first used
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu) {
        accountsMenu.classList.remove('active');
        accountsMenu.style.display = 'none';
        accountsMenu.style.visibility = 'hidden';
    }
    
    if (accountsOverlay) {
        accountsOverlay.classList.remove('active');
        accountsOverlay.style.display = 'none';
        accountsOverlay.style.visibility = 'hidden';
    }
}

// Fix the debug accounts button reference which has a scope error
// Replace the existing debug accounts button event listener
const debugAccountsBtn = document.getElementById('debug-accounts');
if (debugAccountsBtn) {
    debugAccountsBtn.addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        
        if (accountsMenu && accountsOverlay) {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
            
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        }
    });
}

// Fix the datePickerOverlay and customDate references
// Add these variables at the top of the file with the other global variables
let datePickerOverlay = null;
let customDate = null;

// Add a utility function to safely handle element clicks
function safeAddClickListener(elementId, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener('click', callback);
    }
}

// Fix the date picker handlers
// Replace the problematic debug-set-date event listener
safeAddClickListener('debug-set-date', () => {
    datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerOverlay) {
        datePickerOverlay.style.display = 'block';
        
        // Check if generateDatePickerCalendar is defined
        if (typeof generateDatePickerCalendar === 'function') {
            generateDatePickerCalendar();
        } else {
            console.error('generateDatePickerCalendar is not defined');
            // Create a simple fallback
            generateSimpleDatePickerCalendar();
        }
        
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugMenu && debugOverlay) {
            debugMenu.classList.remove('active');
            debugOverlay.classList.remove('active');
        }
    } else {
        console.error('datePickerOverlay element not found');
    }
});

// Add a simple fallback for the date picker calendar
function generateSimpleDatePickerCalendar() {
    const container = document.getElementById('date-picker-calendar');
    if (!container) {
        console.error('Date picker calendar container not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Date Selection</h3>
            <p>Please enter a date:</p>
            <input type="date" id="simple-date-picker" value="${new Date().toISOString().split('T')[0]}">
        </div>
    `;
}

// Fix the class renaming function that's missing
async function renameClass(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        console.log('Invalid rename operation');
        return;
    }
    
    try {
        console.log(`Renaming class from ${oldName} to ${newName}`);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Renaming class...';
        }
        
        // First, get the timetable data
        const fileId = timetables[oldName]?.fileId;
        if (!fileId) {
            throw new Error('Class not found');
        }
        
        const timetableData = { ...timetables[oldName] };
        timetableData.className = newName;
        
        // Update the timetable on the server
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timetableData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Update local timetables
            timetables[newName] = { ...timetableData };
            delete timetables[oldName];
            
            // Update UI
            const button = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
            if (button) {
                button.textContent = newName;
                button.setAttribute('data-name', newName);
            }
            
            // If this was the current timetable, update name
            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                
                // Update timetable title
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }
            
            // Save current timetable name to localStorage
            localStorage.setItem('currentTimetable', currentTimetableName);
            
            showCustomAlert('Success', `Class renamed from ${oldName} to ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to rename class');
        }
    } catch (error) {
        console.error('Failed to rename class:', error);
        showCustomAlert('Error', 'Failed to rename class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Add the missing deleteClass function
async function deleteClass(className) {
    if (!className) {
        console.error('No class name provided for deletion');
        return;
    }
    
    try {
        console.log(`Deleting class: ${className}`);
        
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete the class "${className}"? This cannot be undone.`)) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
            const loadingText = loadingOverlay.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Deleting class...';
        }
        
        // Keep track of deleted classes in local storage
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(className);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        
        // Remove from UI
        const button = document.querySelector(`.dynamic-button[data-name="${className}"]`);
        if (button) {
            const buttonGroup = button.closest('.button-group');
            if (buttonGroup) {
                buttonGroup.remove();
            }
        }
        
        // Remove from memory
        if (timetables[className]) {
            delete timetables[className];
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === className) {
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
            
            // Hide timetable
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
        }
        
        showCustomAlert('Success', `Class "${className}" has been deleted`, 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class: ' + error.message, 'error');
    } finally {
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }
}

// Fix the missing permanentHourModeEnabled variable
// Add this with the other global variables
let permanentHourModeEnabled = false;

// Add the togglePermanentHourMode function
function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.textContent = `Permanent Hours: ${permanentHourModeEnabled ? 'ON' : 'OFF'}`;
        toggleButton.style.backgroundColor = permanentHourModeEnabled ? '#ff9800' : '';
    }
    
    // Update cell styling if we're toggling off
    if (!permanentHourModeEnabled) {
        const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
        cells.forEach(cell => {
            // Don't remove permanent hour class from cells that already had it
            if (cell.classList.contains('permanent-hour') && !cell.dataset.originalPermanent) {
                cell.classList.remove('permanent-hour');
                cell.style.backgroundColor = '';
                cell.style.border = '';
                delete cell.dataset.permanent;
            }
        });
    } else {