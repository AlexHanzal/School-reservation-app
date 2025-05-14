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
    const button = document.createElement('button');
    button.className = 'dynamic-button';
    button.textContent = name;
    button.addEventListener('click', () => showTimetable(name));
    return button;
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
    if (savedData && savedData.data && savedData.currentWeek && savedData.data[savedData.currentWeek]) {
        const weekData = savedData.data[savedData.currentWeek];
        const rows = document.querySelectorAll('.week-table tbody tr');
        
        rows.forEach((row, dayIndex) => {
            const cells = row.querySelectorAll('td:not(:first-child)');
            if (Array.isArray(weekData[dayIndex])) {
                weekData[dayIndex].forEach((content, cellIndex) => {
                    cells[cellIndex].textContent = content.content || '';
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
        popUp.style.display = 'block';
        generateCalendar(); // Refresh calendar when showing
    });

    closeBtn.addEventListener('click', () => {
        popUp.style.display = 'none';
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

    adminBtn.addEventListener('click', () => {
        verificationWindow.style.display = 'flex';
    });

    closeVerification.addEventListener('click', () => {
        verificationWindow.style.display = 'none';
        document.getElementById('verification-code').value = '';
    });

    confirmVerification.addEventListener('click', () => {
        const code = document.getElementById('verification-code').value;
        if (code === '1918') {
            isAdminMode = true;
            toggleAdminEditMode();
            verificationWindow.style.display = 'none';
            document.getElementById('verification-code').value = '';
            showCustomAlert('Success', 'Admin mode activated', 'success');
        } else {
            showCustomAlert('Error', 'Invalid verification code', 'error');
        }
    });

    // Add reset all button handler
    document.getElementById('reset-all').addEventListener('click', async () => {
        const confirmReset = confirm('Are you sure you want to delete all timetables? This cannot be undone.');
        if (confirmReset) {
            try {
                // Delete each timetable individually
                for (const name of Object.keys(timetables)) {
                    await fetch(`${API_URL}/timetables/${name}`, {
                        method: 'DELETE'
                    });
                }

                // Clear local data
                timetables = {};
                
                // Clear UI
                const container = document.getElementById('dynamic-links-container');
                container.innerHTML = '';
                
                // Hide timetable view
                document.querySelector('.time-table').style.display = 'none';
                
                showCustomAlert('Success', 'All timetables have been deleted', 'success');
                
            } catch (error) {
                console.error('Failed to reset timetables:', error);
                showCustomAlert('Error', 'Failed to reset timetables', 'error');
            }
        }
    });
});

function updateTimetableForWeek(selectedDate) {
    const monday = new Date(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    monday.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const dayRows = document.querySelectorAll('.week-table tbody tr');
    const days = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'];
    
    dayRows.forEach((row, index) => {
        const dateForDay = new Date(monday);
        dateForDay.setDate(monday.getDate() + index);
        const dateString = dateForDay.toISOString().split('T')[0];
        
        const firstCell = row.querySelector('td:first-child');
        firstCell.textContent = `${days[index]} (${dateForDay.getDate()}.${dateForDay.getMonth() + 1}.)`;
        firstCell.dataset.date = dateString;
        
        // Find permanent hours for this day of week
        const permanentHours = findPermanentHoursForDay(index);
        
        const hourCells = row.querySelectorAll('td:not(:first-child)');
        hourCells.forEach((cell, hourIndex) => {
            // Clear any previous permanent styling
            cell.classList.remove('permanent-hour');
            delete cell.dataset.permanent;
            
            cell.dataset.date = dateString;
            cell.dataset.hour = hourIndex + 1;
            
            // Check for permanent hour first
            const permanentData = permanentHours[hourIndex];
            if (permanentData) {
                cell.textContent = permanentData.content;
                cell.classList.add('permanent-hour');
                cell.dataset.permanent = 'true';
            } else {
                // Load regular saved data if no permanent hour exists
                const savedData = timetables[currentTimetableName]?.data?.[dateString]?.[hourIndex];
                if (savedData) {
                    cell.textContent = savedData.content || '';
                    if (savedData.isPermanent) {
                        cell.classList.add('permanent-hour');
                        cell.dataset.permanent = 'true';
                    }
                } else {
                    cell.textContent = '';
                    cell.classList.remove('permanent-hour');
                    delete cell.dataset.permanent;
                }
            }
        });

        if (dateForDay.toDateString() === new Date().toDateString()) {
            firstCell.classList.add('current-day');
        } else {
            firstCell.classList.remove('current-day');
        }
    });

    if (timetables[currentTimetableName]) {
        timetables[currentTimetableName].currentWeek = monday.toISOString();
        localStorage.setItem('timetables', JSON.stringify(timetables));
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
        
        if (!timetables[currentTimetableName].data) {
            timetables[currentTimetableName].data = {};
        }
        if (!timetables[currentTimetableName].data[dateString]) {
            timetables[currentTimetableName].data[dateString] = {};
        }
        if (!timetables[currentTimetableName].permanentHours[dayIndex]) {
            timetables[currentTimetableName].permanentHours[dayIndex] = {};
        }

        cells.forEach((cell, hourIndex) => {
            // Save regular data
            const cellData = {
                content: cell.textContent.trim(),
                isPermanent: cell.classList.contains('permanent-hour')
            };
            timetables[currentTimetableName].data[dateString][hourIndex] = cellData;
            
            // Save permanent hours separately
            if (cell.classList.contains('permanent-hour')) {
                timetables[currentTimetableName].permanentHours[dayIndex][hourIndex] = cellData;
            }
        });
    });

    await saveTimetable(currentTimetableName, timetables[currentTimetableName]);
}

const API_URL = 'http://localhost:3000/api';

async function loadTimetables() {
    try {
        const response = await fetch(`${API_URL}/timetables`);
        timetables = await response.json();
        // Recreate buttons for saved timetables
        Object.keys(timetables).forEach(name => {
            const dynamicButton = createDynamicButton(name);
            document.getElementById('dynamic-links-container').appendChild(dynamicButton);
        });
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
    
    alertOverlay.style.display = 'block';
    alertBox.style.display = 'block';

    // Add click event listener to the OK button
    const okButton = alertBox.querySelector('button');
    okButton.onclick = closeCustomAlert;
}

function closeCustomAlert() {
    const alertBox = document.getElementById('customAlert');
    const alertOverlay = document.getElementById('alertOverlay');
    alertBox.style.display = 'none';
    alertOverlay.style.display = 'none';
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
}
