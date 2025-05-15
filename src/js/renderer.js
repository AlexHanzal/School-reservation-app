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

function selectDate(day) {
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

// Initialize storage for timetables
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
    timeTableTitle.textContent = name;
    timeTable.style.display = 'block';
    generateCalendar(); // Update calendar when showing timetable
    currentTimetableName = name;
    
    // Clear any permanent hour styling from previous timetables
    document.querySelectorAll('.week-table tbody td').forEach(cell => {
        cell.classList.remove('permanent-hour');
        delete cell.dataset.permanent;
    });

    // Show saved week or current week
    const savedData = timetables[name];
    if (savedData && savedData.currentWeek) {
        updateTimetableForWeek(new Date(savedData.currentWeek));
    } else {
        updateTimetableForWeek(new Date());
    }
    
    // Fix data loading in showTimetable
    if (savedData && savedData.data) {
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

// Add submit button handler
document.getElementById('submit-button').addEventListener('click', async () => {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();
    
    if (name) {
        try {
            await fetch(`${API_URL}/timetables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
            });

            // Create and add dynamic button
            const dynamicButton = createDynamicButton(name);
            const container = document.getElementById('dynamic-links-container');
            container.appendChild(dynamicButton);
            
            // Initialize timetable data
            timetables[name] = {
                data: {},
                calendar: document.getElementById('timetable-calendar').innerHTML
            };
            
            // Show timetable
            showTimetable(name);
            
            // Hide select screen
            document.getElementById('select-screen').style.display = 'none';
            
            // Clear input
            nameInput.value = '';
        } catch (error) {
            console.error('Failed to create timetable:', error);
        }
    }
});

// Load saved timetables on startup
document.addEventListener('DOMContentLoaded', () => {
    loadTimetables();
    // Add pop-up functionality for create-new button
    const createNewBtn = document.getElementById('create-new');
    const popUp = document.getElementById('select-screen');
    const closeBtn = document.getElementById('close-button');

    createNewBtn.addEventListener('click', () => {
        popUp.classList.add('active');
        setTimeout(() => popUp.classList.add('active'), 10);
        generateCalendar(); // Refresh calendar when showing
    });

    closeBtn.addEventListener('click', () => {
        popUp.classList.remove('active');
        setTimeout(() => popUp.style.display = 'none', 300);
    });

    // Add navigation button handlers
    document.querySelector('.timetable-calendar .prev-button').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        generateCalendar();
    });

    document.querySelector('.timetable-calendar .next-button').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar();
    });

    // Add edit button handler
    document.querySelector('.edit-button').addEventListener('click', toggleEditMode);
    
    // Add save button handler
    document.querySelector('.save-button').addEventListener('click', saveTimeTable);

    // Add admin button functionality
    const adminBtn = document.getElementById('admin-button');
    const verificationWindow = document.getElementById('verification-window');
    const closeVerification = document.getElementById('close-verification');
    const confirmVerification = document.getElementById('confirm-verification');
    const verificationCode = document.getElementById('verification-code');

    adminBtn.addEventListener('click', () => {
        verificationWindow.classList.add('active');
        setTimeout(() => verificationWindow.classList.add('active'), 10);
        // Focus the input field when window opens
        verificationCode.focus();
    });

    // Add Enter key functionality
    verificationCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmVerification.click();
        }
    });

    closeVerification.addEventListener('click', () => {
        verificationWindow.classList.remove('active');
        setTimeout(() => {
            verificationWindow.style.display = 'none';
            document.getElementById('verification-code').value = '';
        }, 300);
    });

    confirmVerification.addEventListener('click', () => {
        const code = document.getElementById('verification-code').value;
        if (code === '1918') {
            isAdminMode = true;
            toggleAdminEditMode();
            // Show gear icons
            document.querySelectorAll('.gear-icon').forEach(icon => {
                icon.classList.add('visible');
            });
            verificationWindow.style.display = 'none';
            document.getElementById('verification-code').value = '';
            showCustomAlert('Success', 'Admin mode activated', 'success');
        } else {
            showCustomAlert('Error', 'Invalid verification code', 'error');
        }
    });

    // Update reset all button handler
    document.getElementById('reset-all').addEventListener('click', async () => {
        const confirmReset = confirm('Are you sure you want to delete all timetables? This cannot be undone.');
        if (confirmReset) {
            try {
                const response = await fetch(`${API_URL}/timetables`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    // Clear local data
                    timetables = {};
                    
                    // Clear UI
                    const container = document.getElementById('dynamic-links-container');
                    container.innerHTML = '';
                    
                    // Hide timetable view
                    document.querySelector('.time-table').style.display = 'none';
                    
                    showCustomAlert('Success', 'All timetables have been deleted', 'success');
                } else {
                    throw new Error('Failed to reset timetables');
                }
            } catch (error) {
                console.error('Failed to reset timetables:', error);
                showCustomAlert('Error', 'Failed to reset timetables', 'error');
            }
        }
    });
});

function updateTimetableForWeek(selectedDate) {
    // Get Monday of selected week
    const monday = new Date(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    monday.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // Clear all existing content and styles first
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('permanent-hour');
        delete cell.dataset.permanent;
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
        
        // Apply permanent hours first
        const permanentHours = timetables[currentTimetableName]?.permanentHours?.[index] || {};
        const cells = row.querySelectorAll('td:not(:first-child)');
        
        cells.forEach((cell, hourIndex) => {
            cell.dataset.date = dateString;
            cell.dataset.hour = hourIndex + 1;
            
            if (permanentHours[hourIndex]) {
                cell.textContent = permanentHours[hourIndex];
                cell.classList.add('permanent-hour');
                cell.dataset.permanent = 'true';
            } else {
                // Only apply regular content if there's no permanent hour
                const dateString = cell.dataset.date;
                const hour = cell.dataset.hour - 1;
                const savedData = timetables[currentTimetableName]?.data?.[dateString]?.[hour];
                if (savedData) {
                    cell.textContent = savedData.content;
                    if (savedData.isPermanent) {
                        cell.classList.add('permanent-hour');
                        cell.dataset.permanent = 'true';
                    } else {
                        cell.classList.remove('permanent-hour');
                        delete cell.dataset.permanent;
                    }
                } else {
                    cell.textContent = ''; // Clear cell if no data
                    cell.classList.remove('permanent-hour');
                    delete cell.dataset.permanent;
                }
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
    if (isAdminMode) return; // Don't toggle if in admin mode
    
    isEditMode = !isEditMode;
    const editButton = document.querySelector('.edit-button');
    editButton.textContent = isEditMode ? 'Cancel' : 'Edit';
    
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        // Only allow editing of non-permanent cells in edit mode
        if (!cell.classList.contains('permanent-hour')) {
            cell.setAttribute('contenteditable', isEditMode);
            cell.classList.toggle('editable', isEditMode);
        } else {
            cell.setAttribute('contenteditable', 'false');
            cell.classList.remove('editable');
        }
    });
}

async function saveTimeTable() {
    if (!currentTimetableName) return;

    // Reset edit and admin modes
    isEditMode = false;
    if (isAdminMode) {
        isAdminMode = false;
        document.querySelectorAll('.button-group').forEach(group => {
            group.classList.remove('admin-active');
        });
        const editButton = document.querySelector('.edit-button');
        editButton.textContent = 'Edit';
        editButton.style.backgroundColor = '';
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

        for (const name of timetableNames) {
            try {
                console.log(`Fetching timetable: ${name}`);
                const timetableResponse = await fetch(`${API_URL}/timetables/${name}`);
                console.log(`Timetable ${name} response:`, timetableResponse);
                
                if (!timetableResponse.ok) {
                    throw new Error(`HTTP error! status: ${timetableResponse.status}`);
                }

                const text = await timetableResponse.text();
                console.log(`Raw timetable data for ${name}:`, text);
                
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error(`JSON parse error for ${name}:`, e);
                    continue;
                }

                console.log(`Parsed timetable data for ${name}:`, data);
                
                timetables[name] = {
                    data: data.data || {},
                    permanentHours: data.permanentHours || {},
                    calendar: data.calendar || '',
                    currentWeek: data.currentWeek || new Date().toISOString()
                };
                
                const dynamicButton = createDynamicButton(name);
                document.getElementById('dynamic-links-container').appendChild(dynamicButton);
            } catch (error) {
                console.error(`Failed to load timetable ${name}:`, error);
            }
        }
    } catch (error) {
        console.error('Failed to load timetables:', error);
    }
}

async function saveTimetable(name, data) {
    try {
        await fetch(`${API_URL}/timetables/${name}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
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
        const url = `${API_URL}/timetables/${encodeURIComponent(oldName)}/rename`;
        console.log('Sending rename request to:', url);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newName })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to rename class');
        }

        // Update local data
        timetables[newName] = {...timetables[oldName]};
        delete timetables[oldName];

        // Update UI
        const container = document.getElementById('dynamic-links-container');
        container.innerHTML = '';
        Object.keys(timetables).forEach(name => {
            container.appendChild(createDynamicButton(name));
        });

        // Update current timetable name if it was the renamed one
        if (currentTimetableName === oldName) {
            currentTimetableName = newName;
            const timeTableTitle = document.querySelector('.time-table h2');
            if (timeTableTitle) {
                timeTableTitle.textContent = newName;
            }
        }

        showCustomAlert('Success', 'Class renamed successfully', 'success');
    } catch (error) {
        console.error('Rename failed:', error);
        showCustomAlert('Error', error.message || 'Failed to rename class', 'error');
    }
}

async function deleteClass(name) {
    try {
        await fetch(`${API_URL}/timetables/${name}`, {
            method: 'DELETE'
        });

        // Delete from local data
        delete timetables[name];

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
