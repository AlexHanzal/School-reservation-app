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

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let isAdminMode = false;
let currentTimetableName = '';
let isEditMode = false;
let customDate = null; // New variable for custom date

function generateCalendar() {
    const calendar = document.getElementById('timetable-calendar');
    const calendarTitle = document.getElementById('timetable-calendar-title');

    calendarTitle.textContent = `${translations[currentLanguage].months[currentMonth]} ${currentYear}`;

    const now = new Date(currentYear, currentMonth);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const table = document.createElement('table');
    table.className = 'calendar-table';
    const tableBody = document.createElement('tbody');

    // Add weekday headers
    const headerRow = document.createElement('tr');
    translations[currentLanguage].weekdays.forEach(weekday => {
        const headerCell = document.createElement('th');
        headerCell.textContent = weekday;
        headerRow.appendChild(headerCell);
    });
    tableBody.appendChild(headerRow);

    // Adjust first day of week to start on Monday
    const adjustedFirstDayOfWeek = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);

    let row = document.createElement('tr');

    // Add previous month days
    for (let i = adjustedFirstDayOfWeek; i > 0; i--) {
        const prevMonthDay = daysInPrevMonth - i + 1;
        const cell = document.createElement('td');
        cell.textContent = prevMonthDay;
        cell.classList.add('prev-month', 'month-dates');
        row.appendChild(cell);
    }

    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('td');
        cell.textContent = day;
        cell.classList.add('hoverable');
        
        // Check if current day
        if (day === currentDate.getDate() && 
            currentMonth === currentDate.getMonth() && 
            currentYear === currentDate.getFullYear()) {
            cell.classList.add('current-day');
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
            cell.textContent = nextMonthDay++;
            cell.classList.add('next-month', 'month-dates');
            row.appendChild(cell);
        }
        tableBody.appendChild(row);
    }

    table.appendChild(tableBody);
    calendar.innerHTML = '';
    calendar.appendChild(table);
}

function selectDate(day = currentDate.getDate()) {
    const selectedDate = new Date(currentYear, currentMonth, day);
    // Clear previous selections
    document.querySelectorAll('.calendar-table td.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    // Add selection to clicked date
    event.target.classList.add('selected');
    // Update timetable week view here
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
        if (isAdminMode) {
            showClassEditMenu(name);
        }
    });
    
    container.appendChild(button);
    container.appendChild(editButton);
    return container;
}

function showTimetable(name) {
    const timeTable = document.querySelector('.time-table');
    const timeTableTitle = timeTable.querySelector('h2');
    timeTableTitle.textContent = timetables[name].className; // Use className from timetables
    timeTable.style.display = 'block';
    generateCalendar();
    currentTimetableName = name;
    
    // Clear any permanent hour styling from previous timetables
    document.querySelectorAll('.week-table tbody td').forEach(cell => {
        cell.classList.remove('permanent-hour');
        delete cell.dataset.permanent;
    });

    const savedData = timetables[name];
    if (savedData) {
        if (savedData.currentWeek) {
            updateTimetableForWeek(new Date(savedData.currentWeek));
        } else {
            updateTimetableForWeek(new Date());
        }
        
        if (savedData.data) {
            const weekData = savedData.data[new Date(savedData.currentWeek).toISOString().split('T')[0]];
            const rows = document.querySelectorAll('.week-table tbody tr');
            
            rows.forEach((row, dayIndex) => {
                const cells = row.querySelectorAll('td:not(:first-child)');
                if (weekData && Array.isArray(weekData[dayIndex])) {
                    weekData[dayIndex].forEach((content, cellIndex) => {
                        cells[cellIndex].textContent = content || '';
                    });
                }
            });
        }
    }
    
    localStorage.setItem('currentTimetable', name);
}

// Update submit button handler
document.getElementById('submit-button').addEventListener('click', async () => {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();
    
    if (name) {
        try {
            const response = await fetch(`${API_URL}/timetables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
            });
            
            const result = await response.json();
            if (result.success) {
                const dynamicButton = createDynamicButton(name);
                const container = document.getElementById('dynamic-links-container');
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
            }
        } catch (error) {
            console.error('Failed to create timetable:', error);
            showCustomAlert('Error', 'Failed to create timetable', 'error');
        }
    }
});

// Load saved timetables on startup
document.addEventListener('DOMContentLoaded', () => {
    loadTimetables().then(() => {
        // Restore previous view state
        const savedTimetable = localStorage.getItem('currentTimetable');
        if (savedTimetable && timetables[savedTimetable]) {
            showTimetable(savedTimetable);
        }
    });

    // Remove nested DOMContentLoaded and move debug menu functionality here
    const debugButton = document.getElementById('debug-button');
    const debugMenu = document.getElementById('debug-menu');
    const debugOverlay = document.getElementById('debug-overlay');
    const closeDebug = document.getElementById('close-debug');

    // Debug menu button handlers
    document.getElementById('debug-reset-all').addEventListener('click', async () => {
        const confirmReset = confirm('Are you sure you want to delete all timetables? This cannot be undone.');
        if (confirmReset) {
            try {
                await fetch(`${API_URL}/timetables`, { method: 'DELETE' });
                timetables = {};
                document.getElementById('dynamic-links-container').innerHTML = '';
                document.querySelector('.time-table').style.display = 'none';
                showCustomAlert('Success', 'All timetables have been deleted', 'success');
            } catch (error) {
                console.error('Failed to reset timetables:', error);
                showCustomAlert('Error', 'Failed to reset timetables', 'error');
            }
        }
        document.getElementById('debug-menu').classList.remove('active');
        document.getElementById('debug-overlay').classList.remove('active');
    });

    document.getElementById('debug-create-new').addEventListener('click', () => {
        const selectScreen = document.getElementById('select-screen');
        selectScreen.classList.add('active');
        setTimeout(() => selectScreen.classList.add('active'), 10);
        generateCalendar();
        debugMenu.classList.remove('active');
        debugOverlay.classList.remove('active');
    });

    document.getElementById('debug-accounts').addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        accountsMenu.classList.add('active');
        accountsOverlay.classList.add('active');
        debugMenu.classList.remove('active');
        debugOverlay.classList.remove('active');
    });

    debugButton.addEventListener('click', () => {
        debugMenu.classList.add('active');
        debugOverlay.classList.add('active');
        debugMenu.style.display = 'block';
        debugOverlay.style.display = 'block';
    });

    document.getElementById('close-debug').addEventListener('click', () => {
        const debugMenu = document.getElementById('debug-menu');
        const debugOverlay = document.getElementById('debug-overlay');
        debugMenu.classList.remove('active');
        debugOverlay.classList.remove('active');
        
        // Add a small delay before hiding to allow the transition to complete
        setTimeout(() => {
            debugMenu.style.display = 'none';
            debugOverlay.style.display = 'none';
        }, 300); // Adjust this timing to match your CSS transition duration
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
        // Allow if in admin mode OR debug mode
        if (isAdminMode || document.body.classList.contains('debug-mode')) {
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
        }
    });

    // Ensure consistent overlay click handling
    const accountsOverlay = document.getElementById('accounts-overlay');
    accountsOverlay.addEventListener('click', () => {
        closeAccountsMenu();
    });

    // Ensure consistent close button handling
    const closeAccountsBtn = document.getElementById('close-accounts');
    closeAccountsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAccountsMenu();
    });

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
        datePickerOverlay.style.display = 'block';
        generateDatePickerCalendar();
        debugMenu.classList.remove('active');
        debugOverlay.classList.remove('active');
    });

    document.getElementById('save-custom-date').addEventListener('click', () => {
        const selectedDate = new Date(currentYear, currentMonth, parseInt(document.querySelector('#date-picker-calendar .selected')?.textContent) || 1);
        if (selectedDate) {
            customDate = selectedDate;
            document.getElementById('customDateText').textContent = selectedDate.toLocaleDateString();
            document.getElementById('customDateNotice').classList.add('active');
            generateCalendar();
            updateTimetableForWeek(customDate);
        }
        document.getElementById('datePickerOverlay').style.display = 'none';
    });

    document.getElementById('cancel-custom-date').addEventListener('click', () => {
        document.getElementById('datePickerOverlay').style.display = 'none';
    });

    document.getElementById('resetDateBtn').addEventListener('click', () => {
        customDate = null;
        document.getElementById('customDateNotice').classList.remove('active');
        generateCalendar();
        updateTimetableForWeek(new Date());
    });

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

// New function for date picker calendar
function generateDatePickerCalendar() {
    const calendar = document.getElementById('date-picker-calendar');
    calendar.innerHTML = ''; // Clear existing content
    
    const now = new Date();
    const table = document.createElement('table');
    table.className = 'calendar-table';
    
    // Generate calendar similar to existing generateCalendar function
    // but with click handlers for date selection
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const tableBody = document.createElement('tbody');

    // Add weekday headers
    const headerRow = document.createElement('tr');
    translations[currentLanguage].weekdays.forEach(weekday => {
        const headerCell = document.createElement('th');
        headerCell.textContent = weekday;
        headerRow.appendChild(headerCell);
    });
    tableBody.appendChild(headerRow);

    // Adjust first day of week to start on Monday
    const adjustedFirstDayOfWeek = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);

    let row = document.createElement('tr');

    // Add previous month days
    for (let i = adjustedFirstDayOfWeek; i > 0; i--) {
        const prevMonthDay = daysInPrevMonth - i + 1;
        const cell = document.createElement('td');
        cell.textContent = prevMonthDay;
        cell.classList.add('prev-month', 'month-dates');
        row.appendChild(cell);
    }

    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('td');
        cell.textContent = day;
        cell.classList.add('hoverable');
        
        cell.addEventListener('click', () => {
            // Clear previous selections
            document.querySelectorAll('#date-picker-calendar td.selected').forEach(cell => {
                cell.classList.remove('selected');
            });
            // Add selection to clicked date
            cell.classList.add('selected');
        });
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
            cell.textContent = nextMonthDay++;
            cell.classList.add('next-month', 'month-dates');
            row.appendChild(cell);
        }
        tableBody.appendChild(row);
    }

    table.appendChild(tableBody);
    calendar.appendChild(table);
}

function getCurrentDate() {
    return customDate || new Date();
}

// Modify existing functions to use getCurrentDate()
function generateCalendar() {
    const currentRealDate = getCurrentDate();
    const calendar = document.getElementById('timetable-calendar');
    const calendarTitle = document.getElementById('timetable-calendar-title');

    calendarTitle.textContent = `${translations[currentLanguage].months[currentMonth]} ${currentYear}`;

    const now = new Date(currentYear, currentMonth);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const table = document.createElement('table');
    table.className = 'calendar-table';
    const tableBody = document.createElement('tbody');

    // Add weekday headers
    const headerRow = document.createElement('tr');
    translations[currentLanguage].weekdays.forEach(weekday => {
        const headerCell = document.createElement('th');
        headerCell.textContent = weekday;
        headerRow.appendChild(headerCell);
    });
    tableBody.appendChild(headerRow);

    // Adjust first day of week to start on Monday
    const adjustedFirstDayOfWeek = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);

    let row = document.createElement('tr');

    // Add previous month days
    for (let i = adjustedFirstDayOfWeek; i > 0; i--) {
        const prevMonthDay = daysInPrevMonth - i + 1;
        const cell = document.createElement('td');
        cell.textContent = prevMonthDay;
        cell.classList.add('prev-month', 'month-dates');
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
            cell.textContent = nextMonthDay++;
            cell.classList.add('next-month', 'month-dates');
            row.appendChild(cell);
        }
        tableBody.appendChild(row);
    }

    table.appendChild(tableBody);
    calendar.innerHTML = '';
    calendar.appendChild(table);
}

function updateTimetableForWeek(selectedDate) {
    const currentRealDate = getCurrentDate();
    // Get Monday of selected week
    const monday = new Date(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    monday.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // Clear all existing content and styles first
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        // Reset the cell completely
        cell.textContent = '';
        cell.className = '';
        cell.removeAttribute('data-permanent');
        cell.style.cssText = ''; // Clear all inline styles
        cell.style.removeProperty('border');
        cell.style.removeProperty('outline');
        cell.style.removeProperty('background-color');
    });

    // Update each row with correct date
    const dayRows = document.querySelectorAll('.week-table tbody tr');
    const days = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];
    
    dayRows.forEach((row, index) => {
        const dateForDay = new Date(monday);
        dateForDay.setDate(monday.getDate() + index);
        const dateString = dateForDay.toISOString().split('T')[0];
        
        // Update first cell with day name and date
        const firstCell = row.querySelector('td:first-child');
        firstCell.textContent = `${days[index]} (${dateForDay.getDate()}.${dateForDay.getMonth() + 1}.)`;
        firstCell.dataset.date = dateString;
        
        // Process cells for this row
        const cells = row.querySelectorAll('td:not(:first-child)');
        cells.forEach((cell, hourIndex) => {
            // Reset cell styling completely
            cell.className = '';
            cell.dataset.date = dateString;
            cell.dataset.hour = hourIndex + 1;
            
            // Check only permanent hours first
            const permanentHours = timetables[currentTimetableName]?.permanentHours?.[index] || {};
            if (permanentHours[hourIndex + 1]) {
                cell.textContent = permanentHours[hourIndex + 1];
                cell.classList.add('permanent-hour');
                cell.dataset.permanent = 'true';
                return; // Skip further processing for this cell
            }

            // If not permanent, check for regular content
            const savedData = timetables[currentTimetableName]?.data?.[dateString]?.[hourIndex];
            if (savedData && !savedData.isPermanent) {
                cell.textContent = savedData.content;
            }
        });

        // Highlight current day
        if (dateForDay.toDateString() === new Date().toDateString()) {
            firstCell.classList.add('current-day');
        } else {
            firstCell.classList.remove('current-day');
        }
    });

    // Store selected week start date
    if (timetables[currentTimetableName]) {
        timetables[currentTimetableName].currentWeek = monday.toISOString();
        saveTimetable(currentTimetableName, timetables[currentTimetableName]);
    }
}

function findPermanentHoursForDay(dayIndex) {
    const permanentHours = {};
    
    // Search through all saved weeks for permanent hours
    if (timetables[currentTimetableName]?.permanentHours?.[dayIndex]) {
        return timetables[currentTimetableName].permanentHours[dayIndex];
    }
    
    return permanentHours;
}

function toggleEditMode() {
    if (isAdminMode) return;
    
    isEditMode = !isEditMode;
    const editButton = document.querySelector('.edit-button');
    editButton.textContent = isEditMode ? 'Cancel' : 'Edit';
    
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        if (!cell.classList.contains('permanent-hour')) {
            cell.setAttribute('contenteditable', isEditMode);
            cell.classList.toggle('editable', isEditMode);
        }
    });
    
    // Show/hide save button based on edit mode
    const saveButton = document.querySelector('.save-button');
    saveButton.style.display = isEditMode ? 'block' : 'none';
}

async function saveTimeTable() {
    if (!currentTimetableName) return;

    // Reset edit and admin modes
    isEditMode = false;
    if (isAdminMode) {
        isAdminMode = false;
        
        // Reset admin button text and style
        const adminBtn = document.getElementById('admin-button');
        adminBtn.innerHTML = 'Admin Mode'; // Reset to default text
        adminBtn.disabled = false;
        adminBtn.classList.remove('admin-active');
        
        // Reset button group sizes and admin styles
        document.querySelectorAll('.button-group').forEach(group => {
            group.classList.remove('admin-active');
            const dynamicBtn = group.querySelector('.dynamic-button');
            if (dynamicBtn) {
                dynamicBtn.style.width = '200px';
            }
        });
        
        // Hide gear icons
        document.querySelectorAll('.gear-icon').forEach(icon => {
            icon.classList.remove('visible');
        });
        
        // Reset edit button
        const editButton = document.querySelector('.edit-button');
        editButton.textContent = 'Edit';
        editButton.style.backgroundColor = '';
        
        // Hide create-new button
        const createNewBtn = document.getElementById('create-new');
        createNewBtn.classList.remove('admin-visible');
        
        // Hide accounts button
        const accountsBtn = document.getElementById('accounts-button');
        accountsBtn.classList.remove('admin-visible');
        
        // Reset accounts menu
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        accountsMenu.classList.remove('active');
        accountsOverlay.classList.remove('active');
        
        // Reset verification window
        const verificationWindow = document.getElementById('verification-window');
        verificationWindow.classList.remove('active');
        document.getElementById('verification-code').value = '';
    }

    const rows = document.querySelectorAll('.week-table tbody tr');
    const editButton = document.querySelector('.edit-button');
    editButton.textContent = 'Edit';
    
    // Make cells non-editable
    document.querySelectorAll('.week-table tbody td:not(:first-child)').forEach(cell => {
        cell.setAttribute('contenteditable', 'false');
        cell.classList.remove('editable');
        if (isAdminMode) {
            cell.removeEventListener('input', adminCellInputHandler);
        }
    });
    
    // Initialize permanent hours structure if it doesn't exist
    if (!timetables[currentTimetableName].permanentHours) {
        timetables[currentTimetableName].permanentHours = {};
    }
    
    // Save table data
    rows.forEach((row, dayIndex) => {
        const dateString = row.querySelector('td:first-child').dataset.date;
        const cells = row.querySelectorAll('td:not(:first-child)');
        
        let hasData = false;
        const dailyData = {};

        cells.forEach((cell, hourIndex) => {
            const cellData = cell.textContent.trim();
            const isPermanent = cell.classList.contains('permanent-hour');
            if (cellData !== '' || isPermanent) {
                hasData = true;
                if (isPermanent) {
                    // Save permanent hours using correct hour index (1-based)
                    if (!timetables[currentTimetableName].permanentHours[dayIndex]) {
                        timetables[currentTimetableName].permanentHours[dayIndex] = {};
                    }
                    timetables[currentTimetableName].permanentHours[dayIndex][hourIndex + 1] = cellData;
                }
                dailyData[hourIndex] = {
                    content: cellData,
                    isPermanent: isPermanent
                };
            }
        });

        if (hasData) {
            if (!timetables[currentTimetableName].data) {
                timetables[currentTimetableName].data = {};
            }
            timetables[currentTimetableName].data[dateString] = dailyData;
        } else {
            // Remove date from data if it exists and has no data
            if (timetables[currentTimetableName].data && timetables[currentTimetableName].data[dateString]) {
                delete timetables[currentTimetableName].data[dateString];
            }
        }
        
        if (!timetables[currentTimetableName].permanentHours[dayIndex]) {
            timetables[currentTimetableName].permanentHours[dayIndex] = {};
        }
    });

    await saveTimetable(currentTimetableName, timetables[currentTimetableName]);
}

const API_URL = (() => {
    const hostname = window.location.hostname;
    // If accessing locally, allow both localhost and local IP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    // For network access, use the actual IP or hostname
    return `http://${hostname}:3000/api`;
})();

async function loadTimetables() {
    try {
        console.log('Fetching timetables from:', `${API_URL}/timetables`);
        const response = await fetch(`${API_URL}/timetables`);
        console.log('Response:', response);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const timetableNames = await response.json();
        console.log('Timetable names:', timetableNames);
        
        // Clear existing buttons first
        document.getElementById('dynamic-links-container').innerHTML = '';

        for (const name of timetableNames) {
            try {
                console.log(`Fetching timetable: ${name}`);
                // Use the className to fetch the timetable
                const timetableResponse = await fetch(`${API_URL}/timetables/${name}`);
                
                if (!timetableResponse.ok) {
                    throw new Error(`HTTP error! status: ${timetableResponse.status}`);
                }

                const data = await timetableResponse.json();
                console.log(`Parsed timetable data for ${name}:`, data);
                
                // Store with fileId to prevent duplicates
                timetables[data.className] = { // Use className as key
                    ...data,
                    data: data.data || {},
                    permanentHours: data.permanentHours || {},
                    calendar: data.calendar || '',
                    currentWeek: data.currentWeek || new Date().toISOString(),
                    fileId: data.fileId // Ensure we keep the fileId
                };
                
                const dynamicButton = createDynamicButton(data.className); // Use className
                document.getElementById('dynamic-links-container').appendChild(dynamicButton);
            } catch (error) {
                console.error(`Failed to load timetable ${name}:`, error);
            }
        }
    } catch (error) {
        console.error('Failed to load timetables:', error);
    }
}

// Update saveTimetable function to always include fileId
async function saveTimetable(name, data) {
    try {
        // Ensure we're sending the fileId
        const dataToSend = {
            ...data,
            fileId: data.fileId || timetables[name]?.fileId
        };

        await fetch(`${API_URL}/timetables/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });
    } catch (error) {
        console.error('Failed to save timetable:', error);
    }
}

function showCustomAlert(title, message, type) {
    const alertBox = document.getElementById('customAlert');
    const alertTitle = alertBox.querySelector('h2');
    const alertMessage = alertBox.querySelector('p');
    const alertOverlay = document.getElementById('alertOverlay');
    
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertBox.className = `custom-alert ${type}`;
    
    // Add active class directly
    alertOverlay.classList.add('active');
    alertBox.classList.add('active');

    // Add keyboard event listener for Enter and Escape
    const handleAlertKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            closeCustomAlert();
            document.removeEventListener('keydown', handleAlertKeyPress);
        }
    };
    document.addEventListener('keydown', handleAlertKeyPress);

    const okButton = alertBox.querySelector('button');
    okButton.onclick = () => {
        closeCustomAlert();
        document.removeEventListener('keydown', handleAlertKeyPress);
    };
}

function closeCustomAlert() {
    const alertBox = document.getElementById('customAlert');
    const alertOverlay = document.getElementById('alertOverlay');
    
    alertBox.classList.remove('active');
    alertOverlay.classList.remove('active');
}

function toggleAdminEditMode() {
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        // Make all cells editable in admin mode
        cell.setAttribute('contenteditable', 'true');
        cell.classList.add('editable');
        
        // Add input event listener for making cells permanent
        cell.addEventListener('input', function() {
            if (isAdminMode && this.textContent.trim() !== '') {
                this.classList.add('permanent-hour');
                this.dataset.permanent = 'true';
            }
        });
    });

    // Change edit button to show admin mode
    const editButton = document.querySelector('.edit-button');
    editButton.textContent = 'Admin Mode';
    editButton.style.backgroundColor = '#ff9800';

    // Add admin-active class to all button groups
    document.querySelectorAll('.button-group').forEach(group => {
        group.classList.toggle('admin-active', isAdminMode);
    });

    // Show/hide create-new button
    const createNewBtn = document.getElementById('create-new');
    createNewBtn.classList.toggle('admin-visible', isAdminMode);

    // Show/hide gear icons
    document.querySelectorAll('.gear-icon').forEach(icon => {
        icon.classList.toggle('visible', isAdminMode);
    });

    // Close accounts menu when exiting admin mode
    if (!isAdminMode) {
        accountsMenu.classList.remove('active');
        accountsOverlay.classList.remove('active');
    }
}

function showClassEditMenu(className) {
    const menu = document.getElementById('classEditMenu');
    const nameInput = document.getElementById('class-name-input');
    const closeBtn = document.getElementById('closeClassEdit');
    const saveBtn = menu.querySelector('.save-class-name');
    const deleteBtn = menu.querySelector('.delete-class');

    // Add escape key handler
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            menu.classList.remove('active');
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    nameInput.value = className;
    menu.classList.add('active');

    closeBtn.onclick = () => {
        menu.classList.remove('active');
        document.removeEventListener('keydown', handleEscKey);
    };

    saveBtn.onclick = async () => {
        const newName = nameInput.value.trim();
        if (newName && newName !== className) {
            await renameClass(className, newName);
            menu.style.display = 'none';
            document.removeEventListener('keydown', handleEscKey);
        }
    };

    deleteBtn.onclick = async () => {
        if (confirm(`Are you sure you want to delete ${className}?`)) {
            await deleteClass(className);
            menu.style.display = 'none';
            document.removeEventListener('keydown', handleEscKey);
        }
    };
}

async function renameClass(oldName, newName) {
    try {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.add('active');

        const currentData = timetables[oldName];
        const url = `${API_URL}/timetables/${encodeURIComponent(newName)}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileId: currentData.fileId,
                data: currentData.data  // Only send the data object
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            // Update local data
            timetables[newName] = {...currentData, className: newName};
            delete timetables[oldName];

            // Update UI
            const container = document.getElementById('dynamic-links-container');
            container.innerHTML = '';
            Object.keys(timetables).forEach(name => {
                container.appendChild(createDynamicButton(name));
            });

            if (currentTimetableName === oldName) {
                currentTimetableName = newName;
                const timeTableTitle = document.querySelector('.time-table h2');
                if (timeTableTitle) {
                    timeTableTitle.textContent = newName;
                }
            }

            localStorage.setItem('currentTimetable', newName);
            showCustomAlert('Success', 'Class renamed successfully', 'success');
        }
    } catch (error) {
        console.error('Rename failed:', error);
        showCustomAlert('Error', 'Failed to rename class', 'error');
    } finally {
        document.getElementById('loadingOverlay').classList.remove('active');
    }
}

async function deleteClass(name) {
    try {
        await fetch(`${API_URL}/timetables/${name}`, {
            method: 'DELETE'
        });

        // Delete from local data
        delete timetables[name];

        // Clear localStorage if deleted class was the current one
        if (localStorage.getItem('currentTimetable') === name) {
            localStorage.removeItem('currentTimetable');
        }

        // Update UI
        const container = document.getElementById('dynamic-links-container');
        container.innerHTML = '';
        Object.keys(timetables).forEach(name => {
            container.appendChild(createDynamicButton(name));
        });

        // Hide timetable if it was showing
        if (currentTimetableName === name) {
            document.querySelector('.time-table').style.display = 'none';
        }

        showCustomAlert('Success', 'Class deleted successfully', 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        showCustomAlert('Error', 'Failed to delete class', 'error');
    }
}

// Update the keyStates object and event handlers - MOVED OUTSIDE OF ANY FUNCTION
const keyStates = {
    Shift: false,
    KeyA: false,
    KeyS: false
};

// Add these event listeners outside of any function to ensure they're always registered
document.addEventListener('keydown', (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        keyStates.Shift = true;
    } else if (e.code === 'KeyA') {
        keyStates.KeyA = true;
    } else if (e.code === 'KeyS') {
        keyStates.KeyS = true;
    }

    // Check if all required keys are pressed
    if (keyStates.Shift && keyStates.KeyA && keyStates.KeyS) {
        document.body.classList.toggle('debug-mode');
        const isDebugMode = document.body.classList.contains('debug-mode');
        
        if (isDebugMode) {
            enableDebugMode();
        } else {
            disableDebugMode();
        }

        // Reset key states to prevent repeat triggers
        resetKeyStates();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        keyStates.Shift = false;
    } else if (e.code === 'KeyA') {
        keyStates.KeyA = false;
    } else if (e.code === 'KeyS') {
        keyStates.KeyS = false;
    }
});

// Update reset function to ensure all keys are properly reset
function resetKeyStates() {
    Object.keys(keyStates).forEach(key => {
        keyStates[key] = false;
    });
}

// Add window blur handler to reset keys when window loses focus
window.addEventListener('blur', resetKeyStates);

// Fix the DOMContentLoaded event handler to properly initialize the Admin button
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Make sure the admin button is initialized properly
    const adminBtn = document.getElementById('admin-button');
    if (adminBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newAdminBtn = adminBtn.cloneNode(true);
        adminBtn.parentNode.replaceChild(newAdminBtn, adminBtn);
        
        newAdminBtn.addEventListener('click', () => {
            if (!isAdminMode) {
                const verificationWindow = document.getElementById('verification-window');
                if (verificationWindow) {
                    verificationWindow.classList.add('active');
                    verificationWindow.style.display = 'flex';
                    document.getElementById('verification-code').focus();
                } else {
                    console.error('Verification window not found in the document');
                }
            }
        });
    } else {
        console.error('Admin button not found in the document');
    }

    // Fix verification window button handlers
    const confirmVerification = document.getElementById('confirm-verification');
    const closeVerification = document.getElementById('close-verification');
    const verificationWindow = document.getElementById('verification-window');
    const verificationCode = document.getElementById('verification-code');

    if (confirmVerification && verificationCode) {
        // Remove any existing event listeners to prevent duplicates
        const newConfirmVerification = confirmVerification.cloneNode(true);
        confirmVerification.parentNode.replaceChild(newConfirmVerification, confirmVerification);
        
        newConfirmVerification.addEventListener('click', () => {
            if (verificationCode.value === '1918') { // Verification code
                isAdminMode = true;
                toggleAdminEditMode();
                verificationWindow.classList.remove('active');
                verificationWindow.style.display = 'none';
                document.getElementById('admin-button').innerHTML = 'Admin Mode <span class="admin-check">✓</span>';
                document.getElementById('admin-button').classList.add('admin-active');
                showCustomAlert('Success', 'Admin mode activated', 'success');
            } else {
                showCustomAlert('Error', 'Invalid verification code', 'error');
            }
            verificationCode.value = '';
        });
    }

    if (closeVerification && verificationWindow) {
        // Remove any existing event listeners to prevent duplicates
        const newCloseVerification = closeVerification.cloneNode(true);
        closeVerification.parentNode.replaceChild(newCloseVerification, closeVerification);
        
        newCloseVerification.addEventListener('click', () => {
            verificationWindow.classList.remove('active');
            verificationWindow.style.display = 'none';
            verificationCode.value = '';
        });
    }

    // Add Enter key support for verification
    if (verificationCode) {
        verificationCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && confirmVerification) {
                e.preventDefault();
                confirmVerification.click();
            }
        });
    }

    // ...existing code...
});

// Fix the enableDebugMode function
function enableDebugMode() {
    // Create debug button if it doesn't exist
    let debugButton = document.getElementById('debug-button');
    if (!debugButton) {
        debugButton = document.createElement('button');
        debugButton.id = 'debug-button';
        debugButton.textContent = 'Debug Menu';
        debugButton.style.padding = '30px 55px';
        debugButton.style.fontSize = '1.6em';
        debugButton.style.display = 'block'; // Make sure it's visible
        document.body.appendChild(debugButton);
        
        debugButton.addEventListener('click', () => {
            const debugMenu = document.getElementById('debug-menu');
            const debugOverlay = document.getElementById('debug-overlay');
            debugMenu.classList.add('active');
            debugMenu.style.display = 'block';
            debugOverlay.classList.add('active');
            debugOverlay.style.display = 'block';
        });
    } else {
        debugButton.style.display = 'block';
    }
    
    // Set admin mode and update UI
    isAdminMode = true;
    toggleAdminEditMode();
    
    // Update admin button
    const adminBtn = document.getElementById('admin-button');
    if (adminBtn) {
        adminBtn.innerHTML = 'Admin Mode <span class="admin-check">✓</span>';
        adminBtn.disabled = true;
        adminBtn.classList.add('admin-active');
    }
    
    // Show admin features
    document.querySelectorAll('.gear-icon').forEach(icon => {
        icon.classList.add('visible');
    });
    
    const createNewBtn = document.getElementById('create-new');
    if (createNewBtn) createNewBtn.classList.add('admin-visible');
    
    const accountsBtn = document.getElementById('accounts-button');
    if (accountsBtn) accountsBtn.classList.add('admin-visible');
}

function disableDebugMode() {
    // Disable admin mode first
    isAdminMode = false;
    
    // Reset admin button
    const adminBtn = document.getElementById('admin-button');
    adminBtn.innerHTML = 'Admin Mode';
    adminBtn.disabled = false;
    adminBtn.classList.remove('admin-active');
    
    // Reset edit button
    const editButton = document.querySelector('.edit-button');
    editButton.textContent = 'Edit';
    editButton.style.backgroundColor = '';
    
    // Hide admin features
    document.querySelectorAll('.gear-icon').forEach(icon => {
        icon.classList.remove('visible');
    });
    document.getElementById('create-new').classList.remove('admin-visible');
    document.getElementById('accounts-button').classList.remove('admin-visible');
    
    // Reset button groups
    document.querySelectorAll('.button-group').forEach(group => {
        group.classList.remove('admin-active');
        const dynamicBtn = group.querySelector('.dynamic-button');
        if (dynamicBtn) {
            dynamicBtn.style.width = '200px';
        }
    });
    
    // Close all menus
    document.getElementById('debug-menu').classList.remove('active');
    document.getElementById('debug-overlay').classList.remove('active');
    document.getElementById('accounts-menu').classList.remove('active');
    document.getElementById('accounts-overlay').classList.remove('active');
    document.getElementById('select-screen').classList.remove('active');
    
    // Reset verification window
    const verificationWindow = document.getElementById('verification-window');
    verificationWindow.classList.remove('active');
    verificationWindow.style.display = 'none';
    document.getElementById('verification-code').value = '';
    
    // Reset table cells
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        cell.setAttribute('contenteditable', 'false');
        cell.classList.remove('editable');
    });
}

// Account creation popup handling
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    const accountsButton = document.getElementById('accounts-button');
    const modifyAccountsBtn = document.getElementById('modify-accounts');
    const removeAccountsBtn = document.getElementById('remove-accounts');
    const createAccountsBtn = document.getElementById('create-accounts');
	const closeAccountsBtn = document.getElementById('close-accounts');

    function toggleAccountsMenu() {
        const isVisible = accountsMenu.classList.contains('active');
        if (isVisible) {
            accountsMenu.classList.remove('active');
            accountsOverlay.classList.remove('active');
        } else {
            accountsMenu.classList.add('active');
            accountsOverlay.classList.add('active');
        }
    }

    accountsButton.addEventListener('click', () => {
        if (isAdminMode || document.body.classList.contains('debug-mode')) {
            toggleAccountsMenu();
        }
    });

    modifyAccountsBtn.addEventListener('click', () => {
        console.log('Modify Accounts button clicked');
        //toggleAccountsMenu();
    });

    removeAccountsBtn.addEventListener('click', () => {
        console.log('Remove Accounts button clicked');
        //toggleAccountsMenu();
    });

    createAccountsBtn.addEventListener('click', () => {
        console.log('Create Accounts button clicked');
        showAccountCreatePopup();
        closeAccountsMenu(); // Close the menu after clicking
    });

	closeAccountsBtn.addEventListener('click', () => {
		toggleAccountsMenu();
	});

    //accountsOverlay.addEventListener('click', () => {
    //    toggleAccountsMenu();
    //});

    // ...existing code...
});

// Add this new function to handle the account creation popup
function showAccountCreatePopup() {
    // Create the popup if it doesn't exist
    let popup = document.getElementById('account-create-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'account-create-popup';
        popup.className = 'account-create-popup';
        
        popup.innerHTML = `
            <h2>Create New Account</h2>
            <div class="input-group">
                <label for="account-name">Full Name</label>
                <input type="text" id="account-name" placeholder="Enter full name">
            </div>
            <div class="input-group">
                <label for="account-abbreviation">Abbreviation</label>
                <input type="text" id="account-abbreviation" placeholder="Enter abbreviation">
            </div>
            <div class="input-group">
                <label for="account-password">Password</label>
                <input type="password" id="account-password" placeholder="Enter password">
            </div>
            <div class="account-create-error" id="account-create-error">Error message will appear here</div>
            <div class="account-create-actions">
                <button id="create-account-btn">Create Account</button>
                <button id="cancel-account-btn">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add event listeners for buttons
        document.getElementById('create-account-btn').addEventListener('click', createNewAccount);
        document.getElementById('cancel-account-btn').addEventListener('click', hideAccountCreatePopup);
        
        // Add keyboard event handlers
        popup.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideAccountCreatePopup();
            } else if (e.key === 'Enter') {
                createNewAccount();
            }
        });
    }
    
    // Clear any previous values and errors
    document.getElementById('account-name').value = '';
    document.getElementById('account-abbreviation').value = '';
    document.getElementById('account-password').value = '';
    document.getElementById('account-create-error').style.display = 'none';
    
    // Show the popup
    popup.style.display = 'block';
    
    // Add overlay if it doesn't exist
    let overlay = document.getElementById('account-create-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'account-create-overlay';
        overlay.className = 'accounts-overlay';
        overlay.addEventListener('click', hideAccountCreatePopup);
        document.body.appendChild(overlay);
    }
    
    // Show the overlay
    overlay.style.display = 'block';
    
    // Focus on the first input field
    document.getElementById('account-name').focus();
}

function hideAccountCreatePopup() {
    const popup = document.getElementById('account-create-popup');
    const overlay = document.getElementById('account-create-overlay');
    
    if (popup) popup.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

function createNewAccount() {
    const nameInput = document.getElementById('account-name');
    const abbreviationInput = document.getElementById('account-abbreviation');
    const passwordInput = document.getElementById('account-password');
    const errorElement = document.getElementById('account-create-error');
    
    const name = nameInput.value.trim();
    const abbreviation = abbreviationInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Clear previous error
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    
    // Validate inputs
    if (!name || !abbreviation || !password) {
        errorElement.textContent = 'All fields are required';
        errorElement.style.display = 'block';
        return;
    }
    
    // Show loading indicator
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = 'Creating account...';
    }
    
    // Create fetch request with retry logic
    const maxRetries = 3;
    let currentRetry = 0;

    function attemptRequest() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        return fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, abbreviation, password }),
            signal: controller.signal
        })
        .then(async response => {
            clearTimeout(timeoutId);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Server error');
            }
            return response.json();
        })
        .then(data => {
            if (loadingOverlay) loadingOverlay.classList.remove('active');
            showCustomAlert('Success', 'Account created successfully', 'success');
            hideAccountCreatePopup();
        })
        .catch(error => {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            
            if (currentRetry < maxRetries && 
                (error.message === 'Failed to fetch' || error.message === 'Network error')) {
                currentRetry++;
                return new Promise(resolve => setTimeout(resolve, 1000))
                    .then(attemptRequest);
            }
            
            throw error;
        });
    }

    attemptRequest().catch(error => {
        console.error('Error creating account:', error);
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        
        let errorMessage = 'Connection error. Please try again.';
        if (error.message.includes('already exists')) {
            errorMessage = 'This abbreviation is already in use';
        } else if (error.message === 'Request timed out') {
            errorMessage = 'Connection timed out. Please try again.';
        }
        
        errorElement.textContent = errorMessage;
        errorElement.style.display = 'block';
    });
}

// Add a function to load users (can be used in admin views later)
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const users = await response.json();
        console.log('Users loaded:', users);
        return users;
    } catch (error) {
        console.error('Failed to load users:', error);
        return [];
    }
}
