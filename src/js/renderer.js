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
    
    // Show saved week or current week
    const savedData = timetables[name];
    if (savedData && savedData.currentWeek) {
        updateTimetableForWeek(new Date(savedData.currentWeek));
    } else {
        updateTimetableForWeek(new Date());
    }
    
    // Load saved data for the current week if it exists
    if (savedData && savedData.data && savedData.currentWeek && savedData.data[savedData.currentWeek]) {
        const weekData = savedData.data[savedData.currentWeek];
        const rows = document.querySelectorAll('.week-table tbody tr');
        
        rows.forEach((row, dayIndex) => {
            const cells = row.querySelectorAll('td:not(:first-child)');
            weekData[dayIndex].forEach((content, cellIndex) => {
                cells[cellIndex].textContent = content;
            });
        });
    }
}

// Add submit button handler
document.getElementById('submit-button').addEventListener('click', () => {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();
    
    if (name) {
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
        
        // Save timetable data
        localStorage.setItem('timetables', JSON.stringify(timetables));
    }
});

// Load saved timetables on startup
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('timetables');
    if (saved) {
        timetables = JSON.parse(saved);
        // Recreate buttons for saved timetables
        Object.keys(timetables).forEach(name => {
            const dynamicButton = createDynamicButton(name);
            document.getElementById('dynamic-links-container').appendChild(dynamicButton);
        });
    }
    generateCalendar();

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
});

function updateTimetableForWeek(selectedDate) {
    // Get Monday of selected week
    const monday = new Date(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    monday.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

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
        
        // Update all hour cells with the date
        const hourCells = row.querySelectorAll('td:not(:first-child)');
        hourCells.forEach((cell, hourIndex) => {
            cell.dataset.date = dateString;
            cell.dataset.hour = hourIndex + 1;
            
            // Load saved data for this date and hour if it exists
            if (timetables[currentTimetableName]?.data?.[dateString]?.[hourIndex]) {
                cell.textContent = timetables[currentTimetableName].data[dateString][hourIndex];
            } else {
                cell.textContent = '';
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
        localStorage.setItem('timetables', JSON.stringify(timetables));
    }
}

let isEditMode = false;
let currentTimetableName = '';

function toggleEditMode() {
    isEditMode = !isEditMode;
    const editButton = document.querySelector('.edit-button');
    editButton.textContent = isEditMode ? 'Cancel' : 'Edit';
    
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        if (isEditMode) {
            cell.setAttribute('contenteditable', 'true');
            cell.classList.add('editable');
            // Remove auto-save listener
        } else {
            cell.setAttribute('contenteditable', 'false');
            cell.classList.remove('editable');
        }
    });
}

function saveTimeTable() {
    if (!currentTimetableName) return;

    const rows = document.querySelectorAll('.week-table tbody tr');
    
    rows.forEach(row => {
        const dateString = row.querySelector('td:first-child').dataset.date;
        const cells = row.querySelectorAll('td:not(:first-child)');
        
        if (!timetables[currentTimetableName].data) {
            timetables[currentTimetableName].data = {};
        }
        if (!timetables[currentTimetableName].data[dateString]) {
            timetables[currentTimetableName].data[dateString] = {};
        }

        cells.forEach((cell, hourIndex) => {
            timetables[currentTimetableName].data[dateString][hourIndex] = cell.textContent;
        });
    });

    localStorage.setItem('timetables', JSON.stringify(timetables));
    
    // Don't exit edit mode after saving
    // if (isEditMode) toggleEditMode();
}
