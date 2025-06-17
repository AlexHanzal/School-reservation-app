// Configure API URL - will be set by config.js
const API_BASE_URL = window.API_BASE_URL || `http://${window.location.hostname}:3000`;
const API_URL = `${API_BASE_URL}/api`;

const translations = {
    cs: {
        weekdays: ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'],
        months: ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 
                'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'],
        timetable: {
            selectDate: 'Vyberte datum',
            noDateSelected: 'Žádné datum není vybráno',
            weekView: 'Týdenní zobrazení'
        }
    },
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
let customDate = null; // New variable for custom date
let pendingPermanentHour = null; // Store pending permanent hour data

// Update function to generate calendar - now with better timetable integration
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

        // Find if this day is the selected day for the current timetable
        if (currentTimetableName && timetables[currentTimetableName]) {
            const timetableDate = new Date(timetables[currentTimetableName].currentWeek);
            if (day === timetableDate.getDate() && 
                currentMonth === timetableDate.getMonth() && 
                currentYear === timetableDate.getFullYear()) {
                cell.classList.add('selected');
            }
        }

        cell.addEventListener('click', (e) => {
            selectDate(day, e);
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
    calendar.innerHTML = '';
    calendar.appendChild(table);
    
    // Add navigation for months if it doesn't exist
    if (!document.querySelector('.calendar-nav')) {
        addCalendarNavigation(calendar);
    }
}

// Add calendar navigation buttons
function addCalendarNavigation(calendar) {
    const navigation = document.createElement('div');
    navigation.className = 'calendar-nav';
    
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo;';
    prevBtn.className = 'calendar-nav-btn prev';
    prevBtn.addEventListener('click', () => {
        navigateMonth(-1);
    });
    
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&raquo;';
    nextBtn.className = 'calendar-nav-btn next';
    nextBtn.addEventListener('click', () => {
        navigateMonth(1);
    });
    
    const todayBtn = document.createElement('button');
    todayBtn.textContent = 'Dnes';
    todayBtn.className = 'calendar-nav-btn today';
    todayBtn.addEventListener('click', () => {
        const today = new Date();
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        generateCalendar();
    });
    
    navigation.appendChild(prevBtn);
    navigation.appendChild(todayBtn);
    navigation.appendChild(nextBtn);
    
    // Insert navigation before the calendar
    const calendarContainer = calendar.parentNode;
    calendarContainer.insertBefore(navigation, calendar);
}

// Navigate months in the calendar
function navigateMonth(direction) {
    currentMonth += direction;
    
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    generateCalendar();
}

// Function to get the current date (with support for custom date if set)
function getCurrentDate() {
    return customDate || new Date();
}

// Updated selectDate function that better integrates with timetables
function selectDate(day = currentDate.getDate(), event) {
    if (!currentTimetableName) {
        showCustomAlert('Chyba', 'Není vybrán žádný rozvrh', 'error');
        return;
    }
    
    const selectedDate = new Date(currentYear, currentMonth, day);
    
    // Clear previous selections
    document.querySelectorAll('.calendar-table td.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    // Add selection to clicked date
    if (event && event.target) {
        event.target.classList.add('selected');
    } else {
        // Find and select the cell manually if no event is provided
        const cells = document.querySelectorAll('.calendar-table td.hoverable');
        for (const cell of cells) {
            if (parseInt(cell.textContent) === day) {
                cell.classList.add('selected');
                break;
            }
        }
    }
    
    // Store the selected date for the current timetable
    if (timetables[currentTimetableName]) {
        timetables[currentTimetableName].currentWeek = selectedDate.toISOString();
    }
    
    // Update timetable week view
    updateTimetableForWeek(selectedDate);
    
    // Update week view title to show the selected date range
    updateWeekViewTitle(selectedDate);
}

// Function to update the week view title
function updateWeekViewTitle(selectedDate) {
    const weekViewTitle = document.getElementById('week-view-title');
    if (!weekViewTitle) return;
    
    const startOfWeek = getStartOfWeek(selectedDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startMonth = translations[currentLanguage].months[startOfWeek.getMonth()];
    const endMonth = translations[currentLanguage].months[endOfWeek.getMonth()];
    
    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        weekViewTitle.textContent = `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    } else {
        weekViewTitle.textContent = `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    }
}

// Helper function to get the start of the week (Monday) for a given date
function getStartOfWeek(date) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    result.setDate(diff);
    return result;
}

// Update the showTimetable function to properly use the calendar
function showTimetable(name) {
    console.log('Zobrazuji rozvrh:', name);
    if (!timetables[name]) {
        console.error('Rozvrh nenalezen:', name);
        showCustomAlert('Chyba', 'Rozvrh nenalezen', 'error');
        return;
    }

    const timeTable = document.querySelector('.time-table');
    const timeTableTitle = timeTable.querySelector('h2');
    timeTableTitle.textContent = timetables[name].className;
    timeTable.style.display = 'block';
      currentTimetableName = name;
    
    // Update class info display - ensure it shows immediately
    updateClassInfo(timetables[name]);
    
    // Display the calendar for this timetable
    generateCalendar();
    
    // Clear any permanent hour styling from previous timetables
    document.querySelectorAll('.week-table tbody td').forEach(cell => {
        cell.classList.remove('permanent-hour');
        delete cell.dataset.permanent;
    });    const savedData = timetables[name];
    if (savedData) {
        // Always ensure we have a current week - default to today if not set or invalid
        const today = new Date();
        let selectedDate;
        
        if (!savedData.currentWeek) {
            // No week saved - use today
            selectedDate = today;
            savedData.currentWeek = today.toISOString();
        } else {
            // Check if saved week is valid
            const savedDate = new Date(savedData.currentWeek);
            if (isNaN(savedDate.getTime())) {
                // Invalid date - use today
                selectedDate = today;
                savedData.currentWeek = today.toISOString();
            } else {
                // Valid saved date - use it
                selectedDate = savedDate;
            }
        }
        
        // Update the calendar to show the month containing the selected date
        currentMonth = selectedDate.getMonth();
        currentYear = selectedDate.getFullYear();
        
        // Regenerate calendar with the correct month/year
        generateCalendar();
        
        // Select the date in the calendar (without an event object)
        selectDate(selectedDate.getDate());
        
        // Update week view with the selected date
        updateTimetableForWeek(selectedDate);
        
        // Update the week view title
        updateWeekViewTitle(selectedDate);
    } else {
        // No saved data at all - initialize with current week
        const today = new Date();
        timetables[name].currentWeek = today.toISOString();
        
        // Update calendar and week view to current week
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        generateCalendar();
        selectDate(today.getDate());
        updateTimetableForWeek(today);
        updateWeekViewTitle(today);
    }
    
    localStorage.setItem('currentTimetable', name);
}

// New function to update the class info display
function updateClassInfo(timetableData) {
    const classInfoContent = document.getElementById('class-info-content');
    const classInfoBox = document.getElementById('class-info-box');
    if (!classInfoContent || !classInfoBox) return;

    // Remove the info box title completely
    const titleElement = classInfoBox.querySelector('h4');
    if (titleElement) {
        titleElement.style.display = 'none';
    }

    let infoHtml = `<div class="class-name"><strong>${timetableData.className}</strong></div>`;
    if (timetableData.info && timetableData.info.trim()) {
        infoHtml += `<div class="class-description"><p>${timetableData.info}</p></div>`;
    } else {
        infoHtml += `<div class="class-description"><p><em>Popis není k dispozici</em></p></div>`;
    }
    // Removed the fileId display line completely
    classInfoContent.innerHTML = infoHtml;
    console.log('Updated class info for:', timetableData.className, 'with info:', timetableData.info);
}

// Update the updateTimetableForWeek function to better handle the calendar integration
function updateTimetableForWeek(date) {
    if (!currentTimetableName) return;
    
    const startOfWeek = getStartOfWeek(date);
    
    // Store the date in the timetable object
    timetables[currentTimetableName].currentWeek = startOfWeek.toISOString();
    
    // Update the weekday headers in the timetable (which now also updates the hour cells)
    updateWeekdayHeaders(startOfWeek);
    
    // Update week view title
    updateWeekViewTitle(startOfWeek);
    
    // Display timetable data for this week
    displayTimetableDataForWeek(startOfWeek);
}

// Function to update weekday headers with actual dates - now showing HOURS at the top
function updateWeekdayHeaders(startOfWeek) {
    const headerCells = document.querySelectorAll('.week-table thead th:not(:first-child)');
    if (!headerCells.length) return;
    
    // Define the hours for the day (8:00 to 15:00) - removed 16:00
    const hours = [
        '8:00', '8:55', '10:00', '10:55', '11:50', '12:45', '13:40', '14:35'
    ];
    
    // First cell shows empty cell or a label
    const firstHeaderCell = document.querySelector('.week-table thead th:first-child');
    if (firstHeaderCell) {
        firstHeaderCell.textContent = '';  // Empty for the corner cell
    }
    
    // Set the hour headers
    for (let i = 0; i < Math.min(headerCells.length, hours.length); i++) {
        headerCells[i].innerHTML = `<strong>${hours[i]}</strong>`;
        headerCells[i].style.display = '';
    }
    
    // Hide any extra columns beyond our hours
    for (let i = hours.length; i < headerCells.length; i++) {
        headerCells[i].style.display = 'none';
    }
    
    // Now update the day cells in the first column (Mon-Fri with dates)
    updateDayCells(startOfWeek);
}

// New function to initialize the day cells in the first column
function updateDayCells(startOfWeek) {
    const dayCells = document.querySelectorAll('.week-table tbody tr td:first-child');
    
    // Only use Monday through Friday (first 5 weekdays)
    const weekdays = translations[currentLanguage].weekdays.slice(0, 5);
    
    // Get today's date for highlighting
    const today = new Date();
    const todayDateStr = today.getDate() + '-' + today.getMonth() + '-' + today.getFullYear();
    
    // Set the weekday for each cell
    dayCells.forEach((cell, index) => {
        if (index < weekdays.length) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            
            cell.innerHTML = `<strong>${weekdays[index]}</strong><br><small>${dayDate.getDate()}.${dayDate.getMonth() + 1}.</small>`;
            cell.style.display = '';
            
            // Highlight today's date with more visible styling
            const cellDateStr = dayDate.getDate() + '-' + dayDate.getMonth() + '-' + dayDate.getFullYear();
            if (cellDateStr === todayDateStr) {
                cell.classList.add('today-cell');
                cell.style.backgroundColor = '#a7a7a7'; // Yellow highlight
                cell.style.fontWeight = 'bold';
                cell.style.borderLeft = '4px solidrgb(8, 6, 1)'; // Orange border
                
                // Also highlight the entire row
                const row = cell.parentElement;
                if (row) {
                    row.classList.add('today-row');
                    row.style.backgroundColor = '#fff8e1'; // Light yellow background
                }
            } else {
                cell.classList.remove('today-cell');
                cell.style.backgroundColor = '';
                cell.style.fontWeight = '';
                cell.style.borderLeft = '';
                
                // Remove highlight from non-today rows
                const row = cell.parentElement;
                if (row) {
                    row.classList.remove('today-row');
                    row.style.backgroundColor = '';
                }
            }
            
            // Show the corresponding row
            const row = cell.parentElement;
            if (row) {
                row.style.display = '';
            }
        } else {
            // Hide extra rows
            const row = cell.parentElement;
            if (row) {
                row.style.display = 'none';
            }
        }
    });
}

// Function to display timetable data for the selected week - modified for flipped structure
function displayTimetableDataForWeek(startOfWeek) {
    if (!currentTimetableName || !timetables[currentTimetableName]) return;
    
    const timetableData = timetables[currentTimetableName];
    const dateString = startOfWeek.toISOString().split('T')[0];
    
    // Clear previous data - only in cells that aren't in the first column
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('has-data');
        cell.classList.remove('permanent-hour');
        delete cell.dataset.permanent;
    });
    
    // Apply permanent hours from ALL weeks - these appear everywhere
    if (timetableData.data) {
        for (const weekDate in timetableData.data) {
            const weekData = timetableData.data[weekDate];
            
            // Handle both array and object formats for finding permanent hours
            if (Array.isArray(weekData)) {
                for (let dayIndex = 0; dayIndex < Math.min(weekData.length, 5); dayIndex++) {
                    const dayData = weekData[dayIndex];
                    if (!dayData) continue;
                    
                    Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
                        if (hourObj && hourObj.isPermanent) {
                            // Check if the permanent hour should apply to this week
                            if (shouldApplyPermanentHour(hourObj, startOfWeek)) {
                                const row = document.querySelectorAll('.week-table tbody tr')[dayIndex];
                                if (row) {
                                    const colIndex = parseInt(hourIndex) - 1;
                                    const cell = row.querySelectorAll('td:not(:first-child)')[colIndex];
                                    if (cell && !cell.textContent) {
                                        cell.textContent = hourObj.content;
                                        cell.classList.add('permanent-hour');
                                        cell.dataset.permanent = 'true';
                                    }
                                }
                            }
                        }
                    });
                }
            } else {
                // Handle object format for days
                Object.entries(weekData).forEach(([dayIndex, dayData]) => {
                    const dayIdx = parseInt(dayIndex);
                    if (dayIdx >= 5 || !dayData) return;
                    
                    Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
                        if (hourObj && hourObj.isPermanent) {
                            // Check if the permanent hour should apply to this week
                            if (shouldApplyPermanentHour(hourObj, startOfWeek)) {
                                const row = document.querySelectorAll('.week-table tbody tr')[dayIdx];
                                if (row) {
                                    const colIndex = parseInt(hourIndex) - 1;
                                    const cell = row.querySelectorAll('td:not(:first-child)')[colIndex];
                                    if (cell && !cell.textContent) {
                                        cell.textContent = hourObj.content;
                                        cell.classList.add('permanent-hour');
                                        cell.dataset.permanent = 'true';
                                    }
                                }
                            }
                        }
                    });
                });
            }
        }
    }

    // Then apply data for the specific week if it exists - limit to first 5 days (Mon-Fri)
    if (timetableData.data && timetableData.data[dateString]) {
        const weekData = timetableData.data[dateString];
        
        // Handle both array and object formats
        if (Array.isArray(weekData)) {
            // Process only Monday through Friday
            const daysToProcess = Math.min(weekData.length, 5);
            
            for (let dayIndex = 0; dayIndex < daysToProcess; dayIndex++) {
                const dayData = weekData[dayIndex];
                if (!dayData) continue;
                
                const row = document.querySelectorAll('.week-table tbody tr')[dayIndex];
                if (!row) continue;
                
                const cells = row.querySelectorAll('td:not(:first-child)');
                
                // Handle object format with hour indices as keys
                Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
                    const colIndex = parseInt(hourIndex) - 1;
                    const cell = cells[colIndex];
                    if (!cell) return;
                    
                    if (hourObj && typeof hourObj === 'object' && hourObj.content) {
                        cell.textContent = hourObj.content;
                        cell.classList.add('has-data');
                        if (hourObj.isPermanent) {
                            cell.classList.add('permanent-hour');
                            cell.dataset.permanent = 'true';
                        }
                    }
                });
            }
        } else {
            // Handle object format for days
            Object.entries(weekData).forEach(([dayIndex, dayData]) => {
                const dayIdx = parseInt(dayIndex);
                if (dayIdx >= 5) return; // Skip weekend days
                
                const row = document.querySelectorAll('.week-table tbody tr')[dayIdx];
                if (!row || !dayData) return;
                
                const cells = row.querySelectorAll('td:not(:first-child)');
                
                Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
                    const colIndex = parseInt(hourIndex) - 1;
                    const cell = cells[colIndex];
                    if (!cell) return;
                    
                    if (hourObj && typeof hourObj === 'object' && hourObj.content) {
                        cell.textContent = hourObj.content;
                        cell.classList.add('has-data');
                        if (hourObj.isPermanent) {
                            cell.classList.add('permanent-hour');
                            cell.dataset.permanent = 'true';
                        }
                    }
                });
            });
        }
    }
}

// New function to check if a permanent hour should apply to a specific week
function shouldApplyPermanentHour(hourObj, weekDate) {
    // If no date range is specified or allWeeks is true, apply to all weeks
    if (!hourObj.dateRange || hourObj.dateRange.allWeeks) {
        return true;
    }
    
    // Check if the week falls within the specified date range
    if (hourObj.dateRange.fromDate && hourObj.dateRange.toDate) {
        const weekStart = new Date(weekDate);
        const fromDate = new Date(hourObj.dateRange.fromDate);
        const toDate = new Date(hourObj.dateRange.toDate);
        
        return weekStart >= fromDate && weekStart <= toDate;
    }
    
    return true; // Default to applying if no valid range
}

// New function to show permanent hour date range selector
function showPermanentDateSelector(dayIndex, hourIndex, content) {
    pendingPermanentHour = {
        dayIndex: dayIndex,
        hourIndex: hourIndex,
        content: content
    };
    
    const overlay = document.getElementById('permanentDateOverlay');
    const fromDate = document.getElementById('permanent-from-date');
    const toDate = document.getElementById('permanent-to-date');
    const allWeeksCheckbox = document.getElementById('permanent-all-weeks');
    
    // Set default dates to current week
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    fromDate.value = today.toISOString().split('T')[0];
    toDate.value = nextMonth.toISOString().split('T')[0];
    allWeeksCheckbox.checked = true;
    
    overlay.style.display = 'flex';
}

// Function to save permanent hour with date range
async function savePermanentHourWithRange() {
    if (!pendingPermanentHour || !currentTimetableName) return;
    
    const fromDate = document.getElementById('permanent-from-date').value;
    const toDate = document.getElementById('permanent-to-date').value;
    const allWeeks = document.getElementById('permanent-all-weeks').checked;
    
    const { dayIndex, hourIndex, content } = pendingPermanentHour;
    
    // Get current week date
    const startOfWeek = getStartOfWeek(new Date(timetables[currentTimetableName].currentWeek));
    const dateString = startOfWeek.toISOString().split('T')[0];
    
    // Initialize data structure if needed
    if (!timetables[currentTimetableName].data) {
        timetables[currentTimetableName].data = {};
    }
    if (!timetables[currentTimetableName].data[dateString]) {
        timetables[currentTimetableName].data[dateString] = [];
    }
    
    // Ensure the day array exists
    while (timetables[currentTimetableName].data[dateString].length <= dayIndex) {
        timetables[currentTimetableName].data[dateString].push({});
    }
    
    // Create permanent hour object with date range
    const permanentHourObj = {
        content: content,
        isPermanent: true,
        dateRange: allWeeks ? { allWeeks: true } : {
            fromDate: fromDate,
            toDate: toDate,
            allWeeks: false
        }
    };
    
    // Save the permanent hour
    timetables[currentTimetableName].data[dateString][dayIndex][hourIndex] = permanentHourObj;
    
    // Save to server
    try {        const response = await fetch(`${API_URL}/timetables/${currentTimetableName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },            body: JSON.stringify({
                fileId: timetables[currentTimetableName].fileId,
                data: timetables[currentTimetableName].data,
                info: timetables[currentTimetableName].info || ''
            })
        });
        
        if (response.ok) {
            showCustomAlert('Úspěch', 'Trvalá hodina byla úspěšně uložena', 'success');
            // Refresh the display
            displayTimetableDataForWeek(startOfWeek);
        } else {
            showCustomAlert('Chyba', 'Nepodařilo se uložit trvalou hodinu', 'error');
        }
    } catch (error) {
        console.error('Nepodařilo se uložit trvalou hodinu:', error);
        showCustomAlert('Chyba', 'Nepodařilo se uložit trvalou hodinu', 'error');
    }
    
    // Close the overlay
    document.getElementById('permanentDateOverlay').style.display = 'none';
    pendingPermanentHour = null;
}

// submit button handler
document.getElementById('submit-button').addEventListener('click', async () => {
    const nameInput = document.getElementById('name-input');
    const typeSelect = document.getElementById('type-select');
    const descriptionInput = document.getElementById('description-input');
    
    const name = nameInput.value.trim();
    const type = typeSelect.value;
    const info = descriptionInput.value.trim();
    
    if (name) {
        try {
            // Show loading overlay during API call
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('active');
                loadingOverlay.style.display = 'flex';
            }
            
            const response = await fetch(`${API_URL}/timetables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    name: name,
                    info: info 
                })
            });
            
            const result = await response.json();
            
            // Hide loading overlay
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
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
                    info: info,
                    calendar: document.getElementById('timetable-calendar').innerHTML
                };
                
                // Also save the info to the server
                const updateResponse = await fetch(`${API_URL}/timetables/${encodeURIComponent(name)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileId: result.fileId,
                        data: {},
                        info: info
                    })
                });
                
                if (!updateResponse.ok) {
                    console.error('Failed to save info to server');
                }
                showTimetable(name);
                document.getElementById('select-screen').style.display = 'none';
                nameInput.value = '';
                descriptionInput.value = '';
                
                // Show success message
                showCustomAlert('Úspěch', 'Nová třída byla úspěšně vytvořena', 'success');
            } else {
                showCustomAlert('Chyba', result.error || 'Nepodařilo se vytvořit třídu', 'error');
            }
        } catch (error) {
            console.error('Nepodařilo se vytvořit rozvrh:', error);
            showCustomAlert('Chyba', 'Nepodařilo se vytvořit rozvrh', 'error');
            
            // Hide loading overlay on error
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
        }
    } else {
        showCustomAlert('Chyba', 'Prosím zadejte název třídy', 'error');
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
        console.error('Chyba během inicializace:', error);
        showCustomAlert('Chyba', 'Nepodařilo se inicializovat aplikaci', 'error');
    });
    
    // Add event listener for the create-new button to show select screen
    const createNewBtn = document.getElementById('create-new');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            showSelectScreen();
        });
    }

    // Fix accounts menu close button
    document.getElementById('close-accounts').addEventListener('click', () => {
        const accountsMenu = document.getElementById('accounts-menu');
        const accountsOverlay = document.getElementById('accounts-overlay');
        accountsMenu.classList.remove('active');
        accountsOverlay.classList.remove('active');
    });

    // Update accounts button functionality
    const accountsButton = document.getElementById('accounts-button');
    if (accountsButton) {
        // Remove any existing event listeners
        const newAccountsButton = accountsButton.cloneNode(true);
        accountsButton.parentNode.replaceChild(newAccountsButton, accountsButton);
        
        newAccountsButton.addEventListener('click', () => {
            if (isAdminMode) {
                showAccountCreatePopup();
            }
        });
    }
});

// Login functionality
async function handleLogin() {
    const userSelect = document.getElementById('user-select');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    
    loginError.style.display = 'none';
    
    if (!userSelect.value || !passwordInput.value) {
        loginError.textContent = 'Prosím vyplňte všechna pole';
        loginError.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                abbreviation: userSelect.value,
                password: passwordInput.value
            })
        });

        const data = await response.json();
        if (response.ok) {
            const loginButton = document.getElementById('login-button');
            loginButton.textContent = data.name; // Show user name
            loginButton.title = "Klikněte pro odhlášení"; // Add tooltip text
            loginButton.setAttribute('aria-label', `${data.name} (Klikněte pro odhlášení)`); // Accessibility
            loginButton.classList.add('logged-in');
            
            // Store user information in our global object including admin status
            currentUser = {
                name: data.name,
                abbreviation: userSelect.value,
                isLoggedIn: true,
                isAdmin: !!data.isAdmin
            };
            console.log('User logged in:', currentUser);
            
            // Check if user is an admin and enable admin mode if true
            if (data.isAdmin === true) {
                console.log("Zjištěn administrátorský uživatel - povoluje se režim administrátora");
                isAdminMode = true;
                enableDebugMode(); // This function activates all admin UI elements
                
                // Ensure admin button is updated
                const adminButton = document.getElementById('admin-button');
                if (adminButton) {
                    adminButton.innerHTML = 'Režim administrátora <span class="admin-check">✓</span>';
                    adminButton.disabled = true;
                    adminButton.classList.add('admin-active');
                }
                
                // Make accounts button visible immediately
                const accountsButton = document.getElementById('accounts-button');
                if (accountsButton) {
                    accountsButton.style.display = 'block';
                    accountsButton.classList.add('admin-visible');
                    // Remove or comment out this line if present:
                    // accountsButton.disabled = true;
                }
                
                // Create permanent hours toggle button if it doesn't exist
                let toggleButton = document.getElementById('toggle-permanent-btn');
                if (!toggleButton) {
                    toggleButton = document.createElement('button');
                    toggleButton.id = 'toggle-permanent-btn';
                    toggleButton.className = 'toggle-permanent-btn';
                    toggleButton.textContent = 'Permanent Hours: OFF';
                    toggleButton.addEventListener('click', togglePermanentHourMode);
                    
                    const timeTableButtons = document.querySelector('.time-table-buttons');
                    if (timeTableButtons) {
                        timeTableButtons.appendChild(toggleButton);
                    }
                }
                toggleButton.style.display
                
                showCustomAlert('Režim administrátora', 'Administrátorská oprávnění aktivována', 'success');
            }
            
            // Close login menu immediately after successful login
            const loginMenu = document.getElementById('login-menu');
            const loginOverlay = document.getElementById('login-overlay');
            const passwordInput = document.getElementById('password-input');
            
            // Remove active classes and reset input
            loginMenu.classList.remove('active');
            loginOverlay.classList.remove('active');
            loginMenu.style.display = 'none';
            loginOverlay.style.display = 'none';
            passwordInput.value = '';            
            
            // Load the timetables now that the user is logged in
            loadTimetables().then(() => {
                // Restore previous view state if possible
                const savedTimetable = localStorage.getItem('currentTimetable');
                if (savedTimetable && timetables[savedTimetable]) {
                    showTimetable(savedTimetable);
                    
                    // Fix the edit functionality after login and timetable is loaded
                    setTimeout(() => {
                        console.log('Nastavení funkce úprav s prodlevou po přihlášení');
                        enableCellEditingAfterLogin();
                    }, 500); // Small delay to ensure DOM is ready
                }
            });
            
            showCustomAlert('Úspěch', 'Úspěšně přihlášen', 'success');
        } else {
            loginError.textContent = data.error || 'Neplatné heslo';
            loginError.style.display = 'block';
        }
    } catch (error) {
        console.error('Přihlášení selhalo:', error);
        loginError.textContent = 'Chyba připojení. Prosím zkuste to znovu.';
        loginError.style.display = 'block';
    }
}

function closeLoginMenu() {
    const loginMenu = document.getElementById('login-menu');
    const loginOverlay = document.getElementById('login-overlay');
    
    if (loginMenu) loginMenu.classList.remove('active');
    if (loginOverlay) loginOverlay.classList.remove('active');
}

function setupLoginHandlers() {
    const loginButton = document.getElementById('login-button');
    const loginMenu = document.getElementById('login-menu');
    const loginOverlay = document.getElementById('login-overlay');
    const closeLoginButton = document.getElementById('close-login');
    
    if (loginButton && loginMenu && loginOverlay) {        loginButton.addEventListener('click', () => {
            if (!loginButton.classList.contains('logged-in')) {
                loginMenu.style.display = 'block';
                loginOverlay.style.display = 'block';
                loginMenu.classList.add('active');
                loginOverlay.classList.add('active');
                // Load users immediately when opening menu
                loadUserOptions();
            } else {
                // If already logged in, show logout confirmation
                showLogoutConfirmation();
            }
        });
        
        // Fix close button
        if (closeLoginButton) {
            closeLoginButton.addEventListener('click', (e) => {
                e.preventDefault();
                loginMenu.style.display = 'none';
                loginOverlay.style.display = 'none';
                loginMenu.classList.remove('active');
                loginOverlay.classList.remove('active');
                document.getElementById('password-input').value = '';
                document.getElementById('login-error').style.display = 'none';
            });
        }
        
        // Submit button handler
        const submitButton = document.getElementById('submit-login');
        if (submitButton) {
            submitButton.addEventListener('click', handleLogin);
        }
        
        // Enter key handler for password input
        const passwordInput = document.getElementById('password-input');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // We need to make sure this only runs once
    console.log('Dokument načten, inicializuji...');
    
    // Load timetables first - single source of truth for initialization
    loadTimetables().then(() => {
        console.log('Rozvrhy načteny, obnovuji předchozí stav...');
        const savedTimetable = localStorage.getItem('currentTimetable');
        if (savedTimetable && timetables[savedTimetable]) {
            showTimetable(savedTimetable);
        }
    }).catch(error => {
        console.error('Chyba během inicializace:', error);
        showCustomAlert('Chyba', 'Nepodařilo se inicializovat aplikaci', 'error');
    });

    // Then load users and set up other handlers
    loadUserOptions();
    setupLoginHandlers();
    setupVerificationWindow();
    
    // Add mobile touch support
    addMobileTouchSupport();
});

// Add touch support for permanent hour toggle and popups
function addMobileTouchSupport() {
    // Touch for permanent hour toggle
    const toggleBtn = document.getElementById('toggle-permanent-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            togglePermanentHourMode();
        });
    }
    // Touch for closing popups
    document.querySelectorAll('.close-menu, #close-login, .close-select, .close-verification-button, .close-permanent-date').forEach(btn => {
        btn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            btn.click();
        });
    });
    // Touch for overlays to close
    document.querySelectorAll('.accounts-overlay, .login-overlay, .custom-alert-overlay, #logout-overlay, #class-edit-overlay').forEach(overlay => {
        overlay.addEventListener('touchstart', function(e) {
            if (e.target === overlay) overlay.click();
        });
    });
    // Prevent zoom on double-tap for main buttons
    document.querySelectorAll('button').forEach(btn => {
        let lastTouch = 0;
        btn.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouch < 350) {
                e.preventDefault();
            }
            lastTouch = now;
        });
    });
    // Ensure popups are scrolled into view on mobile
    document.querySelectorAll('.select-window, .menu-content, .account-create-popup, .date-picker-window, .custom-alert, .class-edit-popup, .logout-confirm-content, .permanent-date-window').forEach(popup => {
        popup.addEventListener('touchstart', function() {
            popup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

// Fix the enableDebugMode function - remove debug button creation
function enableDebugMode() {
    // Set admin mode and update UI
    isAdminMode = true;
    toggleAdminEditMode();
    
    // Update admin button
    const adminBtn = document.getElementById('admin-button');
    if (adminBtn) {
        adminBtn.innerHTML = 'Režim administrátora <span class="admin-check">✓</span>';
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

// Add this function to handle admin edit mode toggles
function toggleAdminEditMode() {
    // Make cells editable if in admin mode
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        cell.setAttribute('contenteditable', isAdminMode ? 'true' : 'false');
        cell.classList.toggle('editable', isAdminMode);
    });
    
    // Show/hide save button based on admin mode
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.style.display = isAdminMode ? 'block' : 'none';
    }
    
    // Update edit button text
    const editButton = document.querySelector('.edit-button');
    if (editButton) {
        editButton.textContent = isAdminMode ? 'Admin Edit' : 'Edit';
        editButton.style.backgroundColor = isAdminMode ? '#ff9800' : '';
    }
    
    // Create permanent hours toggle button if it doesn't exist and admin mode is active
    if (isAdminMode) {
        let toggleButton = document.getElementById('toggle-permanent-btn');
        if (!toggleButton) {
            toggleButton = document.createElement('button');
            toggleButton.id = 'toggle-permanent-btn';
            toggleButton.className = 'toggle-permanent-btn';
            toggleButton.textContent = 'Permanent Hours: OFF';
            toggleButton.addEventListener('click', togglePermanentHourMode);
            
            const timeTableButtons = document.querySelector('.time-table-buttons');
            if (timeTableButtons) {
                timeTableButtons.appendChild(toggleButton);
            }
        }
        toggleButton.style.display = 'block';
    }
    
    // Setup specialized cell editing for admin mode with permanent hour support
    if (isAdminMode) {
        setupCellEditing();
    }
    
    console.log('Režim administrátora přepnut:', isAdminMode);
}

function disableDebugMode() {
    // Disable admin mode first
    isAdminMode = false;
    
    // Reset admin button - only if it exists
    const adminBtn = document.getElementById('admin-button');
    if (adminBtn) {
        adminBtn.innerHTML = 'Režim administrátora';
        adminBtn.disabled = false;
        adminBtn.classList.remove('admin-active');
    }
    
    // Reset edit button
    const editButton = document.querySelector('.edit-button');
    if (editButton) {
        editButton.textContent = 'Upravit';
        editButton.style.backgroundColor = '';
    }
    
    // Hide permanent hour toggle button
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.style.display = 'none';
    }
    
    // Reset permanent hour mode
    permanentHourModeEnabled = false;
    
    // Hide admin features
    document.querySelectorAll('.gear-icon').forEach(icon => {
        icon.classList.remove('visible');
    });
    
    const createNewBtn = document.getElementById('create-new');
    if (createNewBtn) {
        createNewBtn.classList.remove('admin-visible');
        createNewBtn.style.display = 'none'; // Explicitly hide it
    }
    
    const accountsBtn = document.getElementById('accounts-button');
    if (accountsBtn) {
        accountsBtn.classList.remove('admin-visible');
        accountsBtn.style.display = 'none'; // Explicitly hide it
    }
    
    // Reset button groups
    document.querySelectorAll('.button-group').forEach(group => {
        group.classList.remove('admin-active');
        const dynamicBtn = group.querySelector('.dynamic-button');
        if (dynamicBtn) {
            dynamicBtn.style.width = '200px';
        }
    });
    
    // Close all menus
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    if (accountsMenu) accountsMenu.classList.remove('active');
    if (accountsOverlay) accountsOverlay.classList.remove('active');
    
    const selectScreen = document.getElementById('select-screen');
    if (selectScreen) selectScreen.classList.remove('active');
    
    // Reset verification window
    const verificationWindow = document.getElementById('verification-window');
    if (verificationWindow) {
        verificationWindow.classList.remove('active');
        verificationWindow.style.display = 'none';
    }
    const verificationCode = document.getElementById('verification-code');
    if (verificationCode) verificationCode.value = '';
    
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
        if (isAdminMode) {
            showAccountCreatePopup();
        }
    });

    modifyAccountsBtn.addEventListener('click', () => {
        console.log('Tlačítko Upravit účty kliknuto');
        //toggleAccountsMenu();
    });

    removeAccountsBtn.addEventListener('click', () => {
        console.log('Tlačítko Odebrat účty kliknuto');
        //toggleAccountsMenu();
    });

    createAccountsBtn.addEventListener('click', () => {
        console.log('Tlačítko Vytvořit účty kliknuto');
        showAccountCreatePopup();
        closeAccountsMenu();
    });

	closeAccountsBtn.addEventListener('click', () => {
		toggleAccountsMenu();
	});

    //accountsOverlay.addEventListener('click', () => {
    //    toggleAccountsMenu();
    //});

    // ...existing code...
});

// Fix: Ensure showAccountCreatePopup always creates and shows the popup and overlay
function showAccountCreatePopup() {
    let popup = document.getElementById('account-create-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'account-create-popup';
        popup.className = 'account-create-popup';        popup.innerHTML = `
            <h2>Vytvořit nový účet</h2>
            <div class="input-group">
                <label for="account-name">Celé jméno</label>
                <input type="text" id="account-name" placeholder="Zadejte celé jméno">
            </div>
            <div class="input-group">
                <label for="account-abbreviation">Zkratka</label>
                <input type="text" id="account-abbreviation" placeholder="Zadejte zkratku">
            </div>
            <div class="input-group">
                <label for="account-password">Heslo</label>
                <input type="password" id="account-password" placeholder="Zadejte heslo">
            </div>
            <div class="input-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="account-is-admin">
                    <span class="checkmark"></span>
                    Administrátorský účet
                </label>
            </div>
            <div class="account-create-error" id="account-create-error">Zde se zobrazí chybová zpráva</div>
            <div class="account-create-actions">
                <button id="create-account-btn">Vytvořit účet</button>
                <button id="cancel-account-btn">Zrušit</button>
            </div>
        `;

        document.body.appendChild(popup);

        document.getElementById('create-account-btn').addEventListener('click', createNewAccount);
        document.getElementById('cancel-account-btn').addEventListener('click', hideAccountCreatePopup);

        popup.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideAccountCreatePopup();
            } else if (e.key === 'Enter') {
                createNewAccount();
            }
        });
    }

    // Always show the popup and overlay
    popup.style.display = 'block';
    popup.style.visibility = 'visible';
    popup.style.zIndex = 3000;

    // Add overlay if it doesn't exist
    let overlay = document.getElementById('account-create-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'account-create-overlay';
        overlay.className = 'accounts-overlay';
        overlay.addEventListener('click', hideAccountCreatePopup);
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
    overlay.style.visibility = 'visible';
    overlay.style.zIndex = 2999;
    
    // Add active class for proper animation
    setTimeout(() => {
        overlay.classList.add('active');
        popup.classList.add('active');
    }, 10);

    // Clear any previous values and errors
    document.getElementById('account-name').value = '';
    document.getElementById('account-abbreviation').value = '';
    document.getElementById('account-password').value = '';
    document.getElementById('account-is-admin').checked = false;
    document.getElementById('account-create-error').style.display = 'none';

    // Focus on the first input field
    document.getElementById('account-name').focus();
}

function hideAccountCreatePopup() {
    const popup = document.getElementById('account-create-popup');
    const overlay = document.getElementById('account-create-overlay');
    
    if (popup) {
        popup.classList.remove('active');
        popup.style.display = 'none';
        popup.style.visibility = 'hidden';
    }
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
    }
}

function createNewAccount() {
    const nameInput = document.getElementById('account-name');
    const abbreviationInput = document.getElementById('account-abbreviation');
    const passwordInput = document.getElementById('account-password');
    const isAdminCheckbox = document.getElementById('account-is-admin');
    const errorElement = document.getElementById('account-create-error');
    
    const name = nameInput.value.trim();
    const abbreviation = abbreviationInput.value.trim();
    const password = passwordInput.value.trim();
    const isAdmin = isAdminCheckbox.checked;
    
    console.log('Vytváření účtu s isAdmin:', isAdmin);
    
    // Clear previous error
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    
    // Validate inputs
    if (!name || !abbreviation || !password) {
        errorElement.textContent = 'Všechna pole jsou povinná';
        errorElement.style.display = 'block';
        return;
    }
    
    // Show loading indicator
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = 'Vytváření účtu...';
    }
    
    // Create fetch request with retry logic
    const maxRetries = 3;
    let currentRetry = 0;

    function attemptRequest() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);        return fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, abbreviation, password, isAdmin }),
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
            showCustomAlert('Úspěch', 'Účet byl úspěšně vytvořen', 'success');
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
        console.error('Chyba při vytváření účtu:', error);
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        
        let errorMessage = 'Chyba připojení. Prosím zkuste to znovu.';
        if (error.message.includes('already exists')) {
            errorMessage = 'Tato zkratka je již používána';
        } else if (error.message === 'Request timed out') {
            errorMessage = 'Časový limit připojení vypršel. Prosím zkuste to znovu.';
        }
        
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        });
    };

async function loadUserOptions() {
    try {
        console.log('Načítání uživatelů...');
        const response = await fetch(`${API_URL}/users`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const users = await response.json();
        console.log('Přijato uživatele:', users);
        
        const userSelect = document.getElementById('user-select');
        if (!userSelect) {
            console.error('Element pro výběr uživatele nenalezen');
            return;
        }
        
        // Clear existing options
        userSelect.innerHTML = '<option value="">Vyberte uživatele</option>';
        
        // Add user options
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.abbreviation;
            option.textContent = user.name;
            userSelect.appendChild(option);
            console.log('Přidán uživatel:', user.name);
        });
    } catch (error) {
        console.error('Nepodařilo se načíst uživatele:', error);
    }
}

// Fix verification window functionality
function setupVerificationWindow() {
    const verificationWindow = document.getElementById('verification-window');
    const verificationCode = document.getElementById('verification-code');
    const confirmVerification = document.getElementById('confirm-verification');
    const closeVerification = document.getElementById('close-verification');
    
    if (!verificationWindow || !verificationCode || !confirmVerification || !closeVerification) {
        console.error('Verification window elements not found');
        return;
    }

    // Handle verification code submission
    function verifyAdminCode() {
        const code = verificationCode.value;
        if (code === '1918') {
            isAdminMode = true;
            toggleAdminEditMode();
            closeVerificationWindow();
            const adminButton = document.getElementById('admin-button');
            if (adminButton) {
                adminButton.innerHTML = 'Režim administrátora <span class="admin-check">✓</span>';
                adminButton.classList.add('admin-active');
            }
            showCustomAlert('Úspěch', 'Režim administrátora aktivován', 'success');
        } else {
            showCustomAlert('Chyba', 'Neplatný ověřovací kód', 'error');
        }
        verificationCode.value = '';
    }

    // Close verification window
    function closeVerificationWindow() {
        verificationWindow.classList.remove('active');
        verificationWindow.style.display = 'none';
        verificationCode.value = '';
    }

    // Add event listeners
    confirmVerification.addEventListener('click', verifyAdminCode);
    closeVerification.addEventListener('click', closeVerificationWindow);
    verificationCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyAdminCode();
        }
    });

    // Add event listener to admin button
    const adminButton = document.getElementById('admin-button');
    if (adminButton) {
        adminButton.addEventListener('click', () => {
            if (!isAdminMode) {
                verificationWindow.classList.add('active');
                verificationWindow.style.display = 'flex';
                verificationCode.value = '';
                verificationCode.focus();
            }
        });
    }
}

// Update DOMContentLoaded to include new setup functions
document.addEventListener('DOMContentLoaded', () => {
    setupLoginHandlers();
    setupVerificationWindow();
    loadTimetables().then(() => {
        const savedTimetable = localStorage.getItem('currentTimetable');
        if (savedTimetable && timetables[savedTimetable]) {
            showTimetable(savedTimetable);
        }
    });
      // Set up close button for select screen
    const closeSelectBtn = document.getElementById('close-select');
    if (closeSelectBtn) {
        closeSelectBtn.addEventListener('click', () => {
            const selectScreen = document.getElementById('select-screen');
            if (selectScreen) {
                selectScreen.style.display = 'none';
                selectScreen.style.visibility = 'hidden';
                selectScreen.style.opacity = '0';
                selectScreen.classList.remove('active');
            }
        });
    }
    
    // ...existing code...
});

// Fix accounts menu close functionality
function closeAccountsMenu() {
    const accountsMenu = document.getElementById('accounts-menu');
    const accountsOverlay = document.getElementById('accounts-overlay');
    
    if (accountsMenu && accountsOverlay) {
        accountsMenu.style.display = 'none';
        accountsOverlay.style.display = 'none';
        accountsMenu.classList.remove('active');
        accountsOverlay.classList.remove('active');
    }
}

async function loadTimetables() {
    try {
        // First, clear existing buttons to prevent duplicates
        document.querySelectorAll('.button-group').forEach(group => {
            group.remove();
        });
        
        // Clear existing timetables from memory
        timetables = {};
        const container = document.getElementById('dynamic-links-container');
        if (container) {
            container.innerHTML = '';
        }
        
        // Check if user is logged in - if not, don't load any classes
        if (!currentUser.isLoggedIn) {
            console.log('User not logged in, hiding all classes');
            // Show message in the container indicating login is required in Czech
            const loginMessage = document.createElement('div');
            loginMessage.className = 'login-required-message';
            loginMessage.textContent = 'Přihlaste se, abyste zobrazil/a učebny';
            loginMessage.style.textAlign = 'center';
            loginMessage.style.padding = '20px';
            loginMessage.style.color = '#777';
            container.appendChild(loginMessage);
            return; // Exit early - don't load any classes
        }
        
        // Get the list of locally deleted classes
        const deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        console.log('Locally deleted classes:', deletedClasses);
        
        // First get list of timetable names - ensure we only get unique names
        const response = await fetch(`${API_URL}/timetables`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get unique timetable names and filter out deleted ones
        let timetableNames = await response.json();
        // Filter out any classes that are in our deleted list
        timetableNames = timetableNames.filter(name => !deletedClasses.includes(name));
        // Ensure uniqueness by converting to Set and back to array
        timetableNames = [...new Set(timetableNames)];
        console.log('Found unique timetables (after filtering deleted):', timetableNames);
        
        // Create a Map to track the newest version of each class
        const newestTimetables = new Map();

        // Load each timetable's full data
        for (const name of timetableNames) {
            try {
                const timetableResponse = await fetch(`${API_URL}/timetables/${encodeURIComponent(name)}`);
                if (!timetableResponse.ok) {
                    console.error('Failed to load timetable', name);
                    continue;
                }

                const timetableData = await timetableResponse.json();                // Store in memory
                timetables[name] = {
                    className: name,
                    fileId: timetableData.fileId,
                    data: timetableData.data || {},
                    info: timetableData.info || '',
                    permanentHours: timetableData.permanentHours || {},
                    currentWeek: timetableData.currentWeek || new Date().toISOString(),
                    createdAt: timetableData.createdAt || new Date().toISOString()
                };
                
                // Store this timetable in our map (will overwrite older versions with same name)
                newestTimetables.set(name, timetableData);
                
                console.log(`Loaded timetable: ${name} with info: ${timetableData.info || 'No info'}`);
            } catch (error) {
                console.error(`Error loading timetable ${name}:`, error);
            }
        }
          // Only now create buttons for the unique classes
        newestTimetables.forEach((timetableData, name) => {
            // Check if button for this class already exists
            const existingButton = document.querySelector(`.dynamic-button[data-name="${name}"]`);
            if (existingButton) {
                console.log(`Button for ${name} already exists, skipping creation`);
                return; // Skip creating a new button
            }
            
            const dynamicButton = createDynamicButton(name);
            
            // Set data attribute for identification
            const buttonElement = dynamicButton.querySelector('.dynamic-button');
            if (buttonElement) {
                buttonElement.setAttribute('data-name', name);
            }
            
            if (container) {
                container.appendChild(dynamicButton);
            }
        });
        
        console.log('Finished loading all timetables');
    } catch (error) {
        console.error('Failed to load timetables:', error);
        showCustomAlert('Chyba', 'Nepodařilo se načíst rozvrhy', 'error');
    }
}

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
    editButton.title = 'Upravit třídu';
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

async function saveTimetable(name, data) {
    try {
        const response = await fetch(`${API_URL}/timetables/${encodeURIComponent(name)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },            body: JSON.stringify({
                fileId: data.fileId,
                data: data.data,
                info: data.info || ''
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await response.json();
        showCustomAlert('Úspěch', 'Změny byly úspěšně uloženy', 'success');
    } catch (error) {
        console.error('Nepodařilo se uložit rozvrh:', error);
        showCustomAlert('Chyba', 'Nepodařilo se uložit změny', 'error');
    }
}

// Function to save the timetable, including permanent hours as objects in the data field
async function saveTimeTable() {
    if (!currentTimetableName || !timetables[currentTimetableName]) {
        showCustomAlert('Chyba', 'Není vybrán žádný rozvrh', 'error');
        return;
    }

    const rows = document.querySelectorAll('.week-table tbody tr');
    const currentDate = new Date(timetables[currentTimetableName].currentWeek);
    const dateString = currentDate.toISOString().split('T')[0];

    // Initialize the data structure if it doesn't exist
    if (!timetables[currentTimetableName].data) {
        timetables[currentTimetableName].data = {};
    }
    if (!timetables[currentTimetableName].data[dateString]) {
        timetables[currentTimetableName].data[dateString] = {};
    }

    // Collect permanent hours that need to be propagated to all weeks
    const permanentHours = {};

    // Save each cell as an object with content and isPermanent
    rows.forEach((row, dayIndex) => {
        const cells = row.querySelectorAll('td:not(:first-child)');
        timetables[currentTimetableName].data[dateString][dayIndex] = {};
        cells.forEach((cell, hourIndex) => {
            const content = cell.textContent.trim();
            if (content !== '') {
                const isPermanent = cell.classList.contains('permanent-hour');
                timetables[currentTimetableName].data[dateString][dayIndex][hourIndex + 1] = {
                    content: content,
                    isPermanent: isPermanent
                };

                // If this is a permanent hour, collect it for propagation
                if (isPermanent) {
                    if (!permanentHours[dayIndex]) {
                        permanentHours[dayIndex] = {};
                    }
                    permanentHours[dayIndex][hourIndex + 1] = {
                        content: content,
                        isPermanent: true
                    };
                }
            }
        });
    });

    // Propagate permanent hours to ALL existing weeks
    if (Object.keys(permanentHours).length > 0) {
        for (const weekDate in timetables[currentTimetableName].data) {
            if (weekDate === dateString) continue; // Skip current week as it's already saved above

            // Ensure the week data structure exists
            if (!timetables[currentTimetableName].data[weekDate]) {
                timetables[currentTimetableName].data[weekDate] = {};
            }

            // Apply permanent hours to this week
            for (const dayIndex in permanentHours) {
                if (!timetables[currentTimetableName].data[weekDate][dayIndex]) {
                    timetables[currentTimetableName].data[weekDate][dayIndex] = {};
                }

                for (const hourIndex in permanentHours[dayIndex]) {
                    timetables[currentTimetableName].data[weekDate][dayIndex][hourIndex] = permanentHours[dayIndex][hourIndex];
                }
            }
        }
    }

    // Also remove permanent hours from other weeks if they were removed from current week
    // Check all weeks for permanent hours that no longer exist in current week
    for (const weekDate in timetables[currentTimetableName].data) {
        if (weekDate === dateString) continue;

        const weekData = timetables[currentTimetableName].data[weekDate];
        for (const dayIndex in weekData) {
            if (!weekData[dayIndex]) continue;
            
            for (const hourIndex in weekData[dayIndex]) {
                const cellData = weekData[dayIndex][hourIndex];
                if (cellData && cellData.isPermanent) {
                    // Check if this permanent hour still exists in current week
                    const currentWeekCell = timetables[currentTimetableName].data[dateString][dayIndex]?.[hourIndex];
                    if (!currentWeekCell || !currentWeekCell.isPermanent) {
                        // This permanent hour was removed, delete it from all weeks
                        delete weekData[dayIndex][hourIndex];
                    }
                }
            }
        }
    }

    // Update permanentHours for backward compatibility
    timetables[currentTimetableName].permanentHours = {};
    rows.forEach((row, dayIndex) => {
        const cells = row.querySelectorAll('td:not(:first-child)');
        timetables[currentTimetableName].permanentHours[dayIndex] = {};
        cells.forEach((cell, hourIndex) => {
            if (cell.classList.contains('permanent-hour')) {
                timetables[currentTimetableName].permanentHours[dayIndex][hourIndex + 1] = cell.textContent.trim();
            }
        });
    });

    await saveTimetable(currentTimetableName, timetables[currentTimetableName]);
}

// Function to show and initialize the select screen
function showSelectScreen() {
    const selectScreen = document.getElementById('select-screen');
    if (!selectScreen) return;
    
    // Reset and prepare the select screen
    const nameInput = document.getElementById('name-input');
    const typeSelect = document.getElementById('type-select');
    
    // Clear previous input
    if (nameInput) nameInput.value = '';
    if (typeSelect) typeSelect.selectedIndex = 0;
    
    // Make sure the select screen is fully visible with proper styling
    selectScreen.style.display = 'flex';
    selectScreen.style.visibility = 'visible';
    selectScreen.style.opacity = '1';
    selectScreen.style.zIndex = '1000';
    selectScreen.style.position = 'fixed';
    selectScreen.style.top = '0';
    selectScreen.style.left = '0';
    selectScreen.style.width = '100%';
    selectScreen.style.height = '100%';
    selectScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    selectScreen.style.justifyContent = 'center';
    selectScreen.style.alignItems = 'center';
    
    // Style the select window
    const selectWindow = selectScreen.querySelector('.select-window');
    if (selectWindow) {
        selectWindow.style.backgroundColor = 'white';
        selectWindow.style.padding = '20px';
        selectWindow.style.borderRadius = '5px';
        selectWindow.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        selectWindow.style.minWidth = '300px';
    }
    
    // Focus on the name input field
    if (nameInput) {
        nameInput.focus();
    }
}

function setupCellEditing() {
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        // Remove any existing input event listeners
        const newCell = cell.cloneNode(true);
        cell.parentNode.replaceChild(newCell, cell);

        // Add new event listener - with user abbreviation support
        newCell.addEventListener('input', function() {
            // Mark the cell as edited
            this.classList.add('edited-cell');
            
            // In admin mode, handle permanent hours if toggle is on
            if (isAdminMode && permanentHourModeEnabled && this.textContent.trim() !== '') {
                // Remove any existing abbreviations when making permanent
                let content = this.textContent.trim();
                if (currentUser.abbreviation && content.includes(' - ' + currentUser.abbreviation)) {
                    content = content.replace(' - ' + currentUser.abbreviation, '');
                    this.textContent = content;
                }

                // Get cell position for permanent hour creation
                const row = this.parentElement;
                const rowIndex = Array.from(row.parentElement.children).indexOf(row);
                const colIndex = Array.from(row.children).indexOf(this);

                // Show the permanent hour date range selector
                showPermanentDateSelector(rowIndex, colIndex, content);
            }
            // Only add abbreviation if NOT in permanent hour mode and NOT already a permanent hour
            else if (currentUser.isLoggedIn && currentUser.abbreviation && this.textContent.trim() && 
                !this.classList.contains('permanent-hour') && 
                !(isAdminMode && permanentHourModeEnabled)) {
                const content = this.textContent.trim();
                const abbrev = currentUser.abbreviation;
                
                // Only add abbreviation if it's not already there and content is not just the abbreviation
                if (!content.includes(abbrev) && content !== abbrev) {
                    this.textContent = content + ' - ' + abbrev;
                }
            }
        });

        // Add click handler for toggling permanent status in admin mode
        if (isAdminMode) {
            newCell.addEventListener('click', function(e) {
                // If in admin mode with permanent hours toggle on, ctrl+click toggles permanent status
                if (isAdminMode && permanentHourModeEnabled && e.ctrlKey) {
                    e.preventDefault();
                    if (this.classList.contains('permanent-hour')) {
                        this.classList.remove('permanent-hour');
                        delete this.dataset.permanent;
                    } else if (this.textContent.trim() !== '') {
                        // When making a cell permanent, show the date range selector
                        const row = this.parentElement;
                        const rowIndex = Array.from(row.parentElement.children).indexOf(row);
                        const colIndex = Array.from(row.children).indexOf(this);
                        
                        let content = this.textContent.trim();
                        if (currentUser.abbreviation && content.includes(' - ' + currentUser.abbreviation)) {
                            content = content.replace(' - ' + currentUser.abbreviation, '');
                            this.textContent = content;
                        }

                        showPermanentDateSelector(rowIndex, colIndex, content);
                    }
                }
            });
        }
        
        // Prevent line breaks from creating actual new lines
        newCell.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    });
}

// Function to handle the reset all button
async function resetAllTimetables() {
    console.log("Reset all timetables function called");
    const confirmReset = confirm('Opravdu chcete smazat všechny rozvrhy? Tato akce je nevratná.');
    if (!confirmReset) return;
    
    try {
        console.log("Resetting all timetables...");
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
        }
        
        // First delete on server
        const response = await fetch(`${API_URL}/timetables`, { 
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        console.log("Server response received, clearing UI elements...");
          // Clear ALL in-memory data
        timetables = {};
        currentTimetableName = '';
        localStorage.removeItem('currentTimetable');
        localStorage.removeItem('deletedClasses'); // Also clear the list of deleted classes
        
        // Remove ALL buttons from UI
        document.querySelectorAll('.button-group').forEach(group => {
            group.remove();
        });
        
        // Also ensure container is empty
        const container = document.getElementById('dynamic-links-container');
        if (container) {
            container.innerHTML = '';
        }
        
        // Hide the timetable view
        const timeTable = document.querySelector('.time-table');
        if (timeTable) {
            timeTable.style.display = 'none';
        }
        
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        console.log("Reset completed successfully");
        showCustomAlert('Úspěch', 'Všechny rozvrhy byly smazány', 'success');
    } catch (error) {
        console.error('Failed to reset timetables:', error);
        
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        showCustomAlert('Chyba', 'Nepodařilo se resetovat rozvrhy', 'error');
    }
}

// Flag to track if app has been initialized
let hasAppInitialized = false;

// Consolidated DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', () => {
    // Prevent multiple initializations
    if (hasAppInitialized) {
        console.log('App already initialized, skipping duplicate initialization');
        return;
    }
    
    console.log('Initializing app - ONE TIME ONLY');
    hasAppInitialized = true;
    
    // Initialize timetables
    loadTimetables().then(() => {
        // Restore previous view state
        const savedTimetable = localStorage.getItem('currentTimetable');
        if (savedTimetable && timetables[savedTimetable]) {
            showTimetable(savedTimetable);
        }
    }).catch(error => {
        console.error('Chyba během inicializace:', error);
        showCustomAlert('Chyba', 'Nepodařilo se inicializovat aplikaci', 'error');
    });
    
    // Set up all other handlers
    setupLoginHandlers();
    setupVerificationWindow();
    setupUIHandlers();
});

// Setup general UI handlers
function setupUIHandlers() {
    // Add event listener for the create-new button to show select screen
    const createNewBtn = document.getElementById('create-new');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            showSelectScreen();
        });
    }

    // Add event listeners for permanent hour date range selector
    const permanentDateOverlay = document.getElementById('permanentDateOverlay');
    const closePermanentDate = document.getElementById('closePermanentDate');
    const savePermanentRange = document.getElementById('save-permanent-range');
    const cancelPermanentRange = document.getElementById('cancel-permanent-range');
    const allWeeksCheckbox = document.getElementById('permanent-all-weeks');

    if (closePermanentDate) {
        closePermanentDate.addEventListener('click', () => {
            permanentDateOverlay.style.display = 'none';
            pendingPermanentHour = null;
        });
    }

    if (cancelPermanentRange) {
        cancelPermanentRange.addEventListener('click', () => {
            permanentDateOverlay.style.display = 'none';
            pendingPermanentHour = null;
        });
    }

    if (savePermanentRange) {
        savePermanentRange.addEventListener('click', savePermanentHourWithRange);
    }

    if (allWeeksCheckbox) {
        allWeeksCheckbox.addEventListener('change', (e) => {
            const fromDate = document.getElementById('permanent-from-date');
            const toDate = document.getElementById('permanent-to-date');
            
            if (e.target.checked) {
                fromDate.disabled = true;
                toDate.disabled = true;
                fromDate.style.opacity = '0.5';
                toDate.style.opacity = '0.5';
            } else {
                fromDate.disabled = false;
                toDate.disabled = false;
                fromDate.style.opacity = '1';
                toDate.style.opacity = '1';
            }
        });
    }

    // Close overlay when clicking outside
    if (permanentDateOverlay) {
        permanentDateOverlay.addEventListener('click', (e) => {
            if (e.target === permanentDateOverlay) {
                permanentDateOverlay.style.display = 'none';
                pendingPermanentHour = null;
            }
        });
    }
    
    // Fix accounts menu close button
    const closeAccountsBtn = document.getElementById('close-accounts');
    if (closeAccountsBtn) {
        closeAccountsBtn.addEventListener('click', () => {
            const accountsMenu = document.getElementById('accounts-menu');
            const accountsOverlay = document.getElementById('accounts-overlay');
            if (accountsMenu && accountsOverlay) {
                accountsMenu.classList.remove('active');
                accountsOverlay.classList.remove('active');
            }
        });
    }
    
    // Update accounts button functionality
    const accountsButton = document.getElementById('accounts-button');
    if (accountsButton) {
        // Remove any existing event listeners
        const newAccountsButton = accountsButton.cloneNode(true);
        accountsButton.parentNode.replaceChild(newAccountsButton, accountsButton);
        
        newAccountsButton.addEventListener('click', () => {
            if (isAdminMode) {
                showAccountCreatePopup();
            }
        });
    }
    
    // Ensure consistent overlay click handling
    const accountsOverlay = document.getElementById('accounts-overlay');
    if (accountsOverlay) {
        accountsOverlay.addEventListener('click', () => {
            closeAccountsMenu();
        });
    }
    
    // Set up close button for select screen
    const closeSelectBtn = document.getElementById('close-select');
    if (closeSelectBtn) {
        closeSelectBtn.addEventListener('click', () => {
            const selectScreen = document.getElementById('select-screen');
            if (selectScreen) {
                selectScreen.style.display = 'none';
                selectScreen.style.visibility = 'hidden';
                selectScreen.style.opacity = '0';
                selectScreen.classList.remove('active');
            }
        });
    }
    
    // Add Edit button functionality
    const editButton = document.querySelector('.edit-button');
    if (editButton) {
        // First remove any existing event listeners to avoid duplicates
        const newEditButton = editButton.cloneNode(true);
        if (editButton.parentNode) {
            editButton.parentNode.replaceChild(newEditButton, editButton);
        }
        
        newEditButton.addEventListener('click', function() {
            console.log('Edit button clicked');
            if (!isAdminMode) {
                isEditMode = !isEditMode;
                console.log('Edit mode toggled:', isEditMode);
                this.textContent = isEditMode ? 'Zrušit' : 'Upravit';
                
                const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
                cells.forEach(cell => {                
                    if (!cell.classList.contains('permanent-hour')) {
                                               cell.setAttribute('contenteditable', isEditMode ? 'true' : 'false');

                        cell.classList.toggle('editable', isEditMode);
                        console.log('Cell editable set to:', cell.getAttribute('contenteditable'));
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
    }
    
    // Add Save button handler
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveTimeTable();
            isEditMode = false;
            const editButton = document.querySelector('.edit-button');
            if (editButton) {
                editButton.textContent = 'Upravit';
            }
            saveButton.style.display = 'none';
            
            // Make cells non-editable and remove edited-cell class
            const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
            cells.forEach(cell => {
                cell.setAttribute('contenteditable', 'false');
                cell.classList.remove('editable');
                cell.classList.remove('edited-cell');
            });
        });    }
      // Accounts menu button event listeners - moved to main DOMContentLoaded handler to avoid duplicates
    // The accounts button and menu handlers are now set up in the main DOMContentLoaded event listener
}

// Function to enable editing after login
function enableCellEditingAfterLogin() {
    console.log('Enabling cell editing after login');
    
    // Fix the edit button functionality first
    const editButton = document.querySelector('.edit-button');
    if (!editButton) {
        console.error('Edit button not found');
        return;
    }
    
    // First, remove any existing event listeners to avoid duplicates
    const newEditButton = editButton.cloneNode(true);
    if (editButton.parentNode) {
        editButton.parentNode.replaceChild(newEditButton, editButton);
    }
    
    // Make sure the edit button properly toggles edit mode
    newEditButton.addEventListener('click', function() {
        console.log('Edit button clicked after login');
        if (!isAdminMode) {
            // Toggle edit mode
            isEditMode = !isEditMode;
            console.log('Edit mode toggled to:', isEditMode);
            
            // Update button text
            this.textContent = isEditMode ? 'Zrušit' : 'Upravit';
            
            // Make cells editable or non-editable
            const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
            cells.forEach(cell => {
                if (!cell.classList.contains('permanent-hour')) {
                    cell.setAttribute('contenteditable', isEditMode ? 'true' : 'false');
                    cell.classList.toggle('editable', isEditMode);
                    console.log('Cell editable set to:', cell.getAttribute('contenteditable'));
                }
            });
            
            // Set up cell editing with proper event handlers
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
}

// Function to show class edit menu for admin operations
function showClassEditMenu(name) {
    console.log('Opening class edit menu for:', name);
    
    // Create popup if it doesn't exist
    let popup = document.getElementById('class-edit-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'class-edit-popup';
        popup.className = 'class-edit-popup';
          popup.innerHTML = `
            <h2>Upravit třídu</h2>
            <div class="input-group">
                <label for="class-name-edit">Název třídy</label>
                <input type="text" id="class-name-edit" placeholder="Zadejte nový název třídy">
            </div>
            <div class="input-group">
                <label for="class-description-edit">Popis třídy</label>
                <textarea id="class-description-edit" placeholder="Zadejte popis třídy" rows="3"></textarea>
            </div>
            <div class="class-edit-error" id="class-edit-error"></div>
            <div class="class-edit-actions">
                <button id="rename-class-btn" class="primary-btn">Přejmenovat třídu</button>
                <button id="delete-class-btn" class="danger-btn">Smazat třídu</button>
                <button id="cancel-class-edit-btn">Zrušit</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add event listener for the cancel button
        document.getElementById('cancel-class-edit-btn').addEventListener('click', hideClassEditMenu);
        
        // Add overlay if it doesn't exist
        let overlay = document.getElementById('class-edit-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'class-edit-overlay';
            overlay.className = 'accounts-overlay';
            overlay.addEventListener('click', hideClassEditMenu);
            document.body.appendChild(overlay);
        }
    }    // Set current class name and description
    const nameInput = document.getElementById('class-name-edit');
    const descriptionInput = document.getElementById('class-description-edit');
    nameInput.value = name;
    descriptionInput.value = timetables[name]?.info || '';
    
    // Clear any previous errors
    const errorElement = document.getElementById('class-edit-error');
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    
    // Set data attribute to keep track of which class we're editing
    popup.dataset.className = name;
    
    // Set up event handlers for rename and delete buttons
    const renameBtn = document.getElementById('rename-class-btn');
    renameBtn.onclick = () => renameClass(name);
    
    const deleteBtn = document.getElementById('delete-class-btn');
    deleteBtn.onclick = () => deleteClass(name);
    
    // Show the popup and overlay
    popup.style.display = 'block';
    document.getElementById('class-edit-overlay').style.display = 'block';
}

// Function to hide the class edit menu
function hideClassEditMenu() {
    const popup = document.getElementById('class-edit-popup');
    const overlay = document.getElementById('class-edit-overlay');
    
    if (popup) popup.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

// Function to rename a class
async function renameClass(oldName) {
    const nameInput = document.getElementById('class-name-edit');
    const descriptionInput = document.getElementById('class-description-edit');
    const errorElement = document.getElementById('class-edit-error');
    const newName = nameInput.value.trim();
    const newDescription = descriptionInput.value.trim();
    
    // Clear previous error
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    
    // Validate new name
    if (!newName) {
        errorElement.textContent = 'Prosím zadejte název třídy';
        errorElement.style.display = 'block';
        return;
    }
    
    if (newName === oldName) {
        hideClassEditMenu();
        return; // No change needed
    }
    
    // Check if the new name already exists
    if (timetables[newName]) {
        errorElement.textContent = 'Třída s tímto názvem již existuje';
        errorElement.style.display = 'block';
        return;
    }
    
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        // Clone the timetable data with the new name
        const timetableData = { ...timetables[oldName] };
        
        // Create new timetable with the new name
        const response = await fetch(`${API_URL}/timetables`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newName })
        });
        
        if (!response.ok) {
            throw new Error('Nepodařilo se vytvořit novou třídu');
        }
        
        const result = await response.json();        // Update the data for the new class
        const updateResponse = await fetch(`${API_URL}/timetables/${encodeURIComponent(newName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileId: result.fileId,
                data: timetableData.data || {}, // Ensure we have at least an empty object
                info: newDescription, // Include the new description as "info"
                permanentHours: timetableData.permanentHours || {},
                currentWeek: timetableData.currentWeek || new Date().toISOString()
            })
        });
        
        if (!updateResponse.ok) {
            throw new Error('Nepodařilo se aktualizovat data třídy');
        }
          // Delete the old class - using the correct API format
        const deleteResponse = await fetch(`${API_URL}/timetables`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: oldName })
        });
        
        if (!deleteResponse.ok) {
            throw new Error(`Nepodařilo se smazat starou třídu: ${deleteResponse.status}`);
        }        // Update local data
        timetables[newName] = {
            ...timetableData,
            className: newName,
            fileId: result.fileId,
            info: newDescription
        };
        delete timetables[oldName];
        
        // Update UI
        const existingButton = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
        if (existingButton) {
            const container = existingButton.closest('.button-group');
            if (container) {
                container.remove();
            }
        }
        
        // Create new button
        const dynamicButton = createDynamicButton(newName);
        const container = document.getElementById('dynamic-links-container');
        
        // Set data attribute
        const buttonElement = dynamicButton.querySelector('.dynamic-button');
        if (buttonElement) {
            buttonElement.setAttribute('data-name', newName);
        }
        
        container.appendChild(dynamicButton);
        
        // Update current timetable name if we're renaming the active timetable
        if (currentTimetableName === oldName) {
            currentTimetableName = newName;
            localStorage.setItem('currentTimetable', newName);
            
            // Update title
            const timeTableTitle = document.querySelector('.time-table h2');
            if (timeTableTitle) {
                timeTableTitle.textContent = newName;
            }
        }
        
        // Hide loading overlay and edit menu
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        hideClassEditMenu();
        showCustomAlert('Úspěch', 'Třída byla úspěšně přejmenována', 'success');
          } catch (error) {
        console.error('Nepodařilo se přejmenovat třídu:', error);
        
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        // Show detailed error in UI
        errorElement.textContent = `Nepodařilo se přejmenovat třídu: ${error.message}`;
        errorElement.style.display = 'block';
        
        // Show alert with error details
        showCustomAlert('Chyba', `Nepodařilo se přejmenovat třídu. Prosím zkuste to znovu. (${error.message})`, 'error');
    }
}

// Function to delete a class
async function deleteClass(name) {
    // Ask for confirmation
    const confirmDelete = confirm(`Opravdu chcete smazat třídu "${name}"? Tato akce je nevratná.`);
    if (!confirmDelete) return;
    
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        console.log(`Attempting to delete class: ${name}`);
        
        // We'll focus only on local deletion as server deletion is problematic
        console.log(`Performing local deletion and tracking in localStorage`);
        
        // Make a best-effort background request to delete on server but don't wait for it
        const fileId = timetables[name]?.fileId;
        if (fileId) {
            try {
                console.log(`Sending background delete request for fileId: ${fileId}`);
                fetch(`${API_URL}/timetables/file/${fileId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }).then(response => {
                    console.log(`Background delete request completed with status: ${response.status}`);
                }).catch(error => {
                    console.log(`Error in background delete request: ${error}`);
                });
            } catch (fetchError) {
                console.log(`Error initiating background delete request: ${fetchError}`);
                // Ignore fetch errors - we'll still proceed with local deletion
            }
        }
        
        // Remove from local data
        delete timetables[name];
        
        // Add an entry to localStorage to track deleted classes
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(name);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        console.log(`Added ${name} to deleted classes list in localStorage`);
        
        // Remove button from UI
        const existingButton = document.querySelector(`.dynamic-button[data-name="${name}"]`);
        if (existingButton) {
            const container = existingButton.closest('.button-group');
            if (container) {
                container.remove();
            }
        }
        
        // If this was the current timetable, hide it
        if (currentTimetableName === name) {
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
            currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
        }
        
        // Hide loading overlay and edit menu
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        hideClassEditMenu();
        showCustomAlert('Úspěch', 'Třída byla úspěšně smazána', 'success');
    } catch (error) {
        console.error('Nepodařilo se smazat třídu:', error);
        
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        // Show detailed error in UI
        const errorElement = document.getElementById('class-edit-error');
        errorElement.textContent = `Nepodařilo se smazat třídu: ${error.message}`;
        errorElement.style.display = 'block';
        
        // Show alert with error details
        showCustomAlert('Chyba', `Nepodařilo se smazat třídu. Prosím zkuste to znovu. (${error.message})`, 'error');
    }
}

// Function to show custom alerts
function showCustomAlert(title, message, type = 'info') {
    // Create the alert element if it doesn't exist
    let customAlert = document.getElementById('custom-alert');
    if (!customAlert) {
        customAlert = document.createElement('div');
        customAlert.id = 'custom-alert';
        customAlert.className = 'custom-alert';
        
        customAlert.innerHTML = `
            <h2></h2>
            <p></p>
            <button>OK</button>
        `;
        
        document.body.appendChild(customAlert);
        
        // Add event listener to close button
        customAlert.querySelector('button').addEventListener('click', () => {
            customAlert.classList.remove('active');
            const overlay = document.getElementById('custom-alert-overlay');
            if (overlay) overlay.classList.remove('active');
        });
        
        // Create overlay if it doesn't exist
        let overlay = document.getElementById('custom-alert-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'custom-alert-overlay';
            overlay.className = 'custom-alert-overlay';
            document.body.appendChild(overlay);
        }
    }
    
    // Set the content and type
    customAlert.querySelector('h2').textContent = title;
    customAlert.querySelector('p').textContent = message;
    
    // Remove any existing type classes
    customAlert.classList.remove('info', 'error', 'success', 'warning');
    
    // Add the appropriate type class
    customAlert.classList.add(type);
    
    // Make the alert visible
    customAlert.classList.add('active');
    
    // Make the overlay visible
    const overlay = document.getElementById('custom-alert-overlay');
    if (overlay) overlay.classList.add('active');
    
    // Auto-hide after 3 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            customAlert.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }, 3000);
    }
}

// Function to show logout confirmation
function showLogoutConfirmation() {
    // Create the confirmation popup if it doesn't exist
    let confirmPopup = document.getElementById('logout-confirm');
    if (!confirmPopup) {
        confirmPopup = document.createElement('div');
        confirmPopup.id = 'logout-confirm';
        confirmPopup.className = 'logout-confirm';
        
        confirmPopup.innerHTML = `
            <div class="logout-confirm-content">
                <h3>Potvrďte odhlášení</h3>
                <p>Opravdu chcete odhlásit?</p>
                <div class="logout-buttons">
                    <button id="confirm-logout">Ano, odhlásit</button>
                    <button id="cancel-logout">Zrušit</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmPopup);
        
        // Add overlay if it doesn't exist
        let overlay = document.getElementById('logout-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'logout-overlay';
            overlay.className = 'logout-overlay';
            document.body.appendChild(overlay);
        }
        
        // Add event listeners for buttons
        document.getElementById('confirm-logout').addEventListener('click', performLogout);
        document.getElementById('cancel-logout').addEventListener('click', hideLogoutConfirmation);
        
        // Add event listener to overlay for dismissal
        overlay.addEventListener('click', hideLogoutConfirmation);
    }
    
    // Show the popup and overlay
    confirmPopup.style.display = 'flex';
    document.getElementById('logout-overlay').style.display = 'block';
}

// Function to hide logout confirmation
function hideLogoutConfirmation() {
    const confirmPopup = document.getElementById('logout-confirm');
    const overlay = document.getElementById('logout-overlay');
    
    if (confirmPopup) confirmPopup.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}

// Function to perform the logout
function performLogout() {
    // Reset user information
    currentUser = {
        name: null,
        abbreviation: null,
        isLoggedIn: false,
        isAdmin: false // Make sure to reset admin status too
    };
    
    // Disable admin mode when logging out
    if (isAdminMode) {
        disableDebugMode(); // Clean up any admin UI
    }
    
    // Update UI
    const loginButton = document.getElementById('login-button');
    loginButton.textContent = 'Přihlášení';
    loginButton.classList.remove('logged-in');

    // Hide the timetable view
    const timeTable = document.querySelector('.time-table');
    if (timeTable) {
        timeTable.style.display = 'none';
    }
    
    // Hide logout confirmation
    hideLogoutConfirmation();
    
    // Clear timetable data from memory
    timetables = {};
    currentTimetableName = '';
    
    // Remove all timetable buttons
    document.querySelectorAll('.button-group').forEach(group => {
        group.remove();
    });
    
    // Clear timetable container
    const container = document.getElementById('dynamic-links-container');
    if (container) {
        container.innerHTML = '';
        
        // Show login required message in Czech
        const loginMessage = document.createElement('div');
        loginMessage.className = 'login-required-message';
        loginMessage.textContent = 'Přihlaste se, abyste zobrazil/a učebny';
        loginMessage.style.textAlign = 'center';
        loginMessage.style.padding = '20px';
        loginMessage.style.color = '#777';
        container.appendChild(loginMessage);
    }
    
    // Show success message
    showCustomAlert('Úspěch', 'Byli jste úspěšně odhlášeni', 'success');
}

// Function to toggle permanent hour mode
let permanentHourModeEnabled = false;

function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    const toggleButton = document.getElementById('toggle-permanent-btn');
    
    if (toggleButton) {
        if (permanentHourModeEnabled) {
            toggleButton.classList.add('active');
            toggleButton.textContent = 'Trvalé hodiny: ON';
        } else {
            toggleButton.classList.remove('active');
            toggleButton.textContent = 'Trvalé hodiny: OFF';
        }
    }
    
    // Show feedback to user
    showCustomAlert('Režim administrátora', 
        permanentHourModeEnabled ? 
        'Režim trvalých hodin je nyní ZAPNUT. Upravené buňky se stanou trvalými.' : 
        'Režim trvalých hodin je nyní VYPNUT. Upravené buňky budou běžné položky.', 
        'info');
}

// Render the timetable for the given date string
function renderTimetableForDate(dateString) {
    const timetable = timetables[currentTimetableName];
    if (!timetable || !timetable.data || !timetable.data[dateString]) return;
    const weekData = timetable.data[dateString];
    const rows = document.querySelectorAll('.week-table tbody tr');
    weekData.forEach((dayData, dayIndex) => {
        const cells = rows[dayIndex]?.querySelectorAll('td:not(:first-child)');
        if (!cells) return;
        Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
            const cell = cells[parseInt(hourIndex) - 1];
            if (!cell) return;
            cell.textContent = hourObj.content;
            if (hourObj.isPermanent) {
                cell.classList.add('permanent-hour');
            } else {
                cell.classList.remove('permanent-hour');
            }
        });
    });
}

// Helper function to format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Helper function to get date string in YYYY-MM-DD format
function getDateString(date) {
    return date.toISOString().split('T')[0];
}