const API_URL = `http://${window.location.hostname}:3000/api`;

// Desktop-focused responsive design functionality
function setupResponsiveDesign() {
    // Set CSS variables based on screen size
    function updateResponsiveVars() {
        const root = document.documentElement;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Calculate base scale factor for desktop
        let scale = 1;
        if (width > 1440) {
            scale = 1.1;
        } else if (width < 1200) {
            scale = 0.95;
        }
        
        // Set CSS variables
        root.style.setProperty('--base-scale', scale);
        
        // Update layout for desktop optimization
        updateDesktopLayout();
    }
    
    // Desktop layout optimization
    function updateDesktopLayout() {
        // Ensure no horizontal scrolling
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        // Fix calendar layout
        const calendar = document.getElementById('timetable-calendar');
        if (calendar) {
            // Reset any transforms
            calendar.style.transform = '';
            calendar.style.transformOrigin = '';
        }
    }
    
    // Run on page load
    updateResponsiveVars();
    
    // Update on window resize
    window.addEventListener('resize', updateResponsiveVars);
}

// Call the setup function on document load
document.addEventListener('DOMContentLoaded', function() {
    setupResponsiveDesign();
});

// Function to adjust table font size based on content width
function adjustTableFontSizes() {
    const tableCells = document.querySelectorAll('.week-table td:not(:first-child)');
    tableCells.forEach(cell => {
        const content = cell.textContent;
        if (content.length > 20) {
            cell.style.fontSize = '0.8em';
        } else if (content.length > 15) {
            cell.style.fontSize = '0.85em';
        } else if (content.length > 10) {
            cell.style.fontSize = '0.9em';
        } else {
            cell.style.fontSize = '1em';
        }
    });
}

// Call when timetables are loaded or saved
function updateResponsiveLayout() {
    adjustTableFontSizes();
    
    // Ensure no horizontal scrolling
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    // Ensure no vertical scrolling on main content
    const timeTable = document.querySelector('.time-table');
    if (timeTable) {
        timeTable.style.overflowY = 'hidden';
    }
    
    // Fix calendar layout
    const calendar = document.getElementById('timetable-calendar');
    if (calendar) {
        calendar.style.transform = '';
        calendar.style.transformOrigin = '';
    }
    
    // Adjust buttons for available space
    const timeTableButtons = document.querySelector('.time-table-buttons');
    if (timeTableButtons) {
        const containerWidth = timeTableButtons.offsetWidth;
        const buttons = timeTableButtons.querySelectorAll('button');
        
        if (containerWidth < 400 && buttons.length > 1) {
            buttons.forEach(button => {
                button.style.padding = '6px 12px'; /* Reduced padding */
                button.style.fontSize = '0.9em'; /* Smaller font */
            });
        }
    }
    
    // Optimize table height to fit viewport
    optimizeTableHeight();
}

// New function to ensure table fits in viewport
function optimizeTableHeight() {
    const timeTable = document.querySelector('.time-table');
    const tableContainer = document.querySelector('.table-container');
    const bottomContent = document.querySelector('.bottom-content');
    
    if (!timeTable || !tableContainer || !bottomContent) return;
    
    const timeTableHeight = timeTable.clientHeight;
    const bottomContentHeight = bottomContent.offsetHeight;
    const headerHeight = document.querySelector('h2').offsetHeight || 40;
    const padding = 20; // Account for padding
    
    // Calculate available space for table
    const availableHeight = timeTableHeight - bottomContentHeight - headerHeight - padding;
    
    // Set max height for table container
    tableContainer.style.maxHeight = `${availableHeight}px`;
    tableContainer.style.overflow = 'hidden'; // Prevent scrolling
    
    // Adjust table cell heights if needed
    const cells = document.querySelectorAll('.week-table td, .week-table th');
    const rowCount = document.querySelectorAll('.week-table tbody tr').length + 1; // +1 for header
    const maxCellHeight = Math.floor((availableHeight - 10) / rowCount); // -10 for borders
    
    if (maxCellHeight > 20 && maxCellHeight < 40) {
        cells.forEach(cell => {
            cell.style.height = `${maxCellHeight}px`;
            cell.style.maxHeight = `${maxCellHeight}px`;
        });
    }
}

// Add event listener for window resize
window.addEventListener('resize', updateResponsiveLayout);

// Add mutation observer to watch for table content changes
const observeTableChanges = () => {
    const targetNode = document.querySelector('.week-table tbody');
    if (targetNode) {
        const config = { childList: true, subtree: true, characterData: true };
        const observer = new MutationObserver(adjustTableFontSizes);
        observer.observe(targetNode, config);
    }
};

// Hook into existing functions to update responsive layout
const originalShowTimetable = showTimetable;
showTimetable = function(name) {
    originalShowTimetable(name);
    setTimeout(() => {
        updateResponsiveLayout();
        optimizeTableHeight(); // Ensure proper sizing after showing timetable
    }, 100);
    observeTableChanges();
};

const originalSaveTimeTable = saveTimeTable;
saveTimeTable = async function() {
    await originalSaveTimeTable();
    updateResponsiveLayout();
};

// Listen for fullscreen changes to adapt layout
document.addEventListener('fullscreenchange', updateResponsiveLayout);

// Remove mobile-specific media query listeners since mobile support is not needed

const translations = {
    cs: {
        weekdays: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
        months: ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 
                'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'],
        timetable: {
            selectDate: 'Vyberte datum',
            noDateSelected: 'Žádné datum není vybráno',
            weekView: 'Týdenní zobrazení'
        }
    },
    en: {
        weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        months: ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'],
        timetable: {
            selectDate: 'Select a date',
            noDateSelected: 'No date selected',
            weekView: 'Week view'
        }
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
let customDate = null; // New variable for custom date

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
    todayBtn.textContent = 'Today';
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
        showCustomAlert('Error', 'No timetable selected', 'error');
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
    
    currentTimetableName = name;
    
    // Make sure the default calendar stays hidden
    const timetableCalendar = document.getElementById('timetable-calendar');
    if (timetableCalendar) {
        timetableCalendar.style.display = 'none';
    }
    
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
    
    // Define the hours for the day (8:00 to 16:00)
    const hours = [
        '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
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
        cell.classList.remove('has-data', 'permanent-hour');
        delete cell.dataset.permanent;
    });

    // --- First pass: Render ALL permanent hours from ALL weeks ---
    if (timetableData.data) {
        for (const weekDate in timetableData.data) {
            const weekData = timetableData.data[weekDate];
            
            // Handle both array format and object format
            if (Array.isArray(weekData)) {
                // Array format: weekData[dayIndex][hourIndex] = hourObj
                weekData.forEach((dayData, dayIndex) => {
                    if (dayData && typeof dayData === 'object') {
                        Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
                            if (hourObj && hourObj.isPermanent === true) {
                                renderPermanentHour(dayIndex, parseInt(hourIndex), hourObj.content);
                            }
                        });
                    }
                });
            } else if (typeof weekData === 'object') {
                // Object format: weekData[dayIndex][hourIndex] = hourObj
                Object.entries(weekData).forEach(([dayIndex, dayData]) => {
                    if (dayData && typeof dayData === 'object') {
                        Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
                            if (hourObj && hourObj.isPermanent === true) {
                                renderPermanentHour(parseInt(dayIndex), parseInt(hourIndex), hourObj.content);
                            }
                        });
                    }
                });
            }
        }
    }

    // --- Second pass: Render week-specific data, but NEVER overwrite permanent hours ---
    if (timetableData.data && timetableData.data[dateString]) {
        const weekData = timetableData.data[dateString];
        
        if (Array.isArray(weekData)) {
            // Array format
            weekData.forEach((dayData, dayIndex) => {
                if (dayData && typeof dayData === 'object') {
                    Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
                        if (hourObj && !hourObj.isPermanent && hourObj.content) {
                            renderRegularHour(dayIndex, parseInt(hourIndex), hourObj.content);
                        }
                    });
                }
            });
        } else if (typeof weekData === 'object') {
            // Object format
            Object.entries(weekData).forEach(([dayIndex, dayData]) => {
                if (dayData && typeof dayData === 'object') {
                    Object.entries(dayData).forEach(([hourIndex, hourObj]) => {
                        if (hourObj && !hourObj.isPermanent && hourObj.content) {
                            renderRegularHour(parseInt(dayIndex), parseInt(hourIndex), hourObj.content);
                        }
                    });
                }
            });
        }
    }
}

// Helper function to render permanent hours
function renderPermanentHour(dayIndex, hourIndex, content) {
    const colIndex = hourIndex - 1;
    if (dayIndex >= 0 && dayIndex < 5 && colIndex >= 0 && colIndex < 9) {
        const rows = document.querySelectorAll('.week-table tbody tr');
        if (rows[dayIndex]) {
            const cells = rows[dayIndex].querySelectorAll('td:not(:first-child)');
            if (cells[colIndex]) {
                cells[colIndex].textContent = content || '';
                cells[colIndex].classList.add('permanent-hour', 'has-data');
                cells[colIndex].dataset.permanent = 'true';
            }
        }
    }
}

// Helper function to render regular hours (only if cell is not permanent)
function renderRegularHour(dayIndex, hourIndex, content) {
    const colIndex = hourIndex - 1;
    if (dayIndex >= 0 && dayIndex < 5 && colIndex >= 0 && colIndex < 9) {
        const rows = document.querySelectorAll('.week-table tbody tr');
        if (rows[dayIndex]) {
            const cells = rows[dayIndex].querySelectorAll('td:not(:first-child)');
            if (cells[colIndex] && !cells[colIndex].classList.contains('permanent-hour')) {
                cells[colIndex].textContent = content;
                cells[colIndex].classList.add('has-data');
            }
        }
    }
}

// submit button handler
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
            }
            
            const response = await fetch(`${API_URL}/timetables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
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
            showCustomAlert('Error', 'Failed to create timetable', 'error');
            
            // Hide loading overlay on error
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
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
    }// Update debug menu button handlers
document.addEventListener('DOMContentLoaded', () => {
    const debugButton = document.getElementById('debug-button');
    const debugMenu = document.getElementById('debug-menu');
    const debugOverlay = document.getElementById('debug-overlay');
    const closeDebug = document.getElementById('close-debug');
    
    // Only set these up if the elements exist
    if (debugButton && debugMenu && debugOverlay && closeDebug) {        // Debug menu button handlers
        document.getElementById('debug-reset-all').addEventListener('click', async () => {
            await resetAllTimetables();
            // Close debug menu after reset operation is done
            document.getElementById('debug-menu').classList.remove('active');
            document.getElementById('debug-overlay').classList.remove('active');
        });
        
        document.getElementById('debug-create-new').addEventListener('click', () => {
            showSelectScreen();
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

// Login functionality
async function handleLogin() {
    const userSelect = document.getElementById('user-select');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    
    loginError.style.display = 'none';
    
    if (!userSelect.value || !passwordInput.value) {
        loginError.textContent = 'Please fill in all fields';
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
            const logoutButton = document.getElementById('logout-button');
            
            loginButton.textContent = data.name; // Show user name
            loginButton.setAttribute('data-tooltip', `Logged in as ${data.name}`);
            loginButton.classList.add('logged-in');
            
            // Show logout button and hide login button
            if (logoutButton) {
                logoutButton.style.display = 'block';
                loginButton.style.display = 'none';
            }
            
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
                console.log("Admin user detected - enabling admin mode");
                isAdminMode = true;
                enableDebugMode(); // This function activates all admin UI elements
                
                // Ensure admin button is updated
                const adminButton = document.getElementById('admin-button');
                if (adminButton) {
                    adminButton.innerHTML = 'Admin Mode <span class="admin-check">✓</span>';
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
                toggleButton.style.display = 'block';
                
                showCustomAlert('Admin Mode', 'Administrator privileges activated', 'success');
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
                        console.log('Setting up edit functionality with delay after login');
                        enableCellEditingAfterLogin();
                    }, 500); // Small delay to ensure DOM is ready
                }
            });
            
            showCustomAlert('Success', 'Logged in successfully', 'success');
        } else {
            loginError.textContent = data.error || 'Invalid password';
            loginError.style.display = 'block';
        }
    } catch (error) {
        console.error('Login failed:', error);
        loginError.textContent = 'Connection error. Please try again.';
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
    const logoutButton = document.getElementById('logout-button');
    const loginMenu = document.getElementById('login-menu');
    const loginOverlay = document.getElementById('login-overlay');
    const closeLoginButton = document.getElementById('close-login');
    
    if (loginButton && loginMenu && loginOverlay) {
        loginButton.addEventListener('click', () => {
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
        
        // Add logout button handler
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                showLogoutConfirmation();
            });
        }
        
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

    // Then load users and set up other handlers
    loadUserOptions();
    setupLoginHandlers();
    setupVerificationWindow();
    
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
    
    // Update edit button text and tooltip
    const editButton = document.querySelector('.edit-button');
    if (editButton) {
        editButton.textContent = isAdminMode ? 'Admin Edit' : 'Edit';
        editButton.setAttribute('data-tooltip', isAdminMode ? 'Admin editing mode active' : 'Edit timetable entries');
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
            toggleButton.setAttribute('data-tooltip', 'Enable permanent hours mode - edited cells will become permanent across all weeks');
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
    
    console.log('Admin edit mode toggled:', isAdminMode);
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

// Fix: Ensure showAccountCreatePopup always creates and shows the popup and overlay
function showAccountCreatePopup() {
    let popup = document.getElementById('account-create-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'account-create-popup';
        popup.className = 'account-create-popup';        popup.innerHTML = `
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
            <div class="input-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="account-is-admin">
                    <span class="checkmark"></span>
                    Admin Account
                </label>
            </div>
            <div class="account-create-error" id="account-create-error">Error message will appear here</div>
            <div class="account-create-actions">
                <button id="create-account-btn">Create Account</button>
                <button id="cancel-account-btn">Cancel</button>
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
    overlay.style.zIndex = 2999;    // Clear any previous values and errors
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
        popup.style.display = 'none';
        popup.style.visibility = 'hidden';
    }
    if (overlay) {
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
    
    console.log('Creating account with isAdmin:', isAdmin); // Debug log
    
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
    };

async function loadUserOptions() {
    try {
        console.log('Fetching users...');
        const response = await fetch(`${API_URL}/users`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const users = await response.json();
        console.log('Received users:', users);
        
        const userSelect = document.getElementById('user-select');
        if (!userSelect) {
            console.error('User select element not found');
            return;
        }
        
        // Clear existing options
        userSelect.innerHTML = '<option value="">Select a user</option>';
        
        // Add user options
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.abbreviation;
            option.textContent = user.name;
            userSelect.appendChild(option);
            console.log('Added user:', user.name);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Fix debug mode key combination
document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.code === 'KeyA') {
        const handler = (e2) => {
            if (e2.code === 'KeyS') {
                document.body.classList.toggle('debug-mode');
                const isDebugMode = document.body.classList.contains('debug-mode');
                if (isDebugMode) {
                    enableDebugMode();
                } else {
                    disableDebugMode();
                }
            }
            document.removeEventListener('keydown', handler);
        };
        document.addEventListener('keydown', handler);
    }
});

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
                adminButton.innerHTML = 'Admin Mode <span class="admin-check">✓</span>';
                adminButton.classList.add('admin-active');
            }
            showCustomAlert('Success', 'Admin mode activated', 'success');
        } else {
            showCustomAlert('Error', 'Invalid verification code', 'error');
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

// ...existing code...

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
            // Show message in the container indicating login is required
            const loginMessage = document.createElement('div');
            loginMessage.className = 'login-required-message';
            loginMessage.textContent = 'Please log in to view classes';
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

                const timetableData = await timetableResponse.json();
                
                // Store in memory
                timetables[name] = {
                    className: name,
                    fileId: timetableData.fileId,
                    data: timetableData.data || {},
                    permanentHours: timetableData.permanentHours || {},
                    currentWeek: timetableData.currentWeek || new Date().toISOString(),
                    createdAt: timetableData.createdAt || new Date().toISOString()
                };
                
                // Store this timetable in our map (will overwrite older versions with same name)
                newestTimetables.set(name, timetableData);
                
                console.log(`Loaded timetable: ${name}`);
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
        showCustomAlert('Error', 'Failed to load timetables', 'error');
    }
}

function createDynamicButton(name) {
    const container = document.createElement('div');
    container.className = 'button-group';
    
    const button = document.createElement('button');
    button.className = 'dynamic-button';
    button.textContent = name;
    button.setAttribute('data-tooltip', `Open timetable for ${name}`);
    button.addEventListener('click', () => showTimetable(name));
    
    const editButton = document.createElement('button');
    editButton.className = 'gear-icon';
    editButton.innerHTML = '✎';
    editButton.setAttribute('data-tooltip', `Edit class settings for ${name} (Admin only)`);
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
            },
            body: JSON.stringify({
                fileId: data.fileId,
                data: data.data
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await response.json();
        showCustomAlert('Success', 'Changes saved successfully', 'success');
    } catch (error) {
        console.error('Failed to save timetable:', error);
        showCustomAlert('Error', 'Failed to save changes', 'error');
    }
}

// Function to save the timetable, including permanent hours as objects in the data field
async function saveTimeTable() {
    if (!currentTimetableName || !timetables[currentTimetableName]) {
        showCustomAlert('Error', 'No timetable selected to save', 'error');
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

    // Collect all permanent hours that need to be propagated
    const permanentHours = {};

    // Save each cell as an object with content and isPermanent flag
    rows.forEach((row, dayIndex) => {
        const cells = row.querySelectorAll('td:not(:first-child)');
        cells.forEach((cell, hourIndex) => {
            const content = cell.textContent.trim();
            const isPermanent = cell.classList.contains('permanent-hour') || cell.dataset.permanent === 'true';
            
            // Initialize day data if it doesn't exist
            if (!timetables[currentTimetableName].data[dateString][dayIndex]) {
                timetables[currentTimetableName].data[dateString][dayIndex] = {};
            }

            const hourKey = (hourIndex + 1).toString();
            
            if (content || isPermanent) {
                // Save as object with isPermanent flag
                timetables[currentTimetableName].data[dateString][dayIndex][hourKey] = {
                    content: content,
                    isPermanent: isPermanent
                };
                
                // Collect permanent hours for propagation
                if (isPermanent) {
                    if (!permanentHours[dayIndex]) permanentHours[dayIndex] = {};
                    permanentHours[dayIndex][hourKey] = {
                        content: content,
                        isPermanent: true
                    };
                }
            } else {
                // Remove empty entries
                delete timetables[currentTimetableName].data[dateString][dayIndex][hourKey];
            }
        });
    });

    // Propagate permanent hours to ALL existing weeks
    if (Object.keys(permanentHours).length > 0) {
        for (const weekDate in timetables[currentTimetableName].data) {
            if (weekDate !== dateString) {
                for (const dayIndex in permanentHours) {
                    if (!timetables[currentTimetableName].data[weekDate][dayIndex]) {
                        timetables[currentTimetableName].data[weekDate][dayIndex] = {};
                    }
                    for (const hourKey in permanentHours[dayIndex]) {
                        timetables[currentTimetableName].data[weekDate][dayIndex][hourKey] = {
                            content: permanentHours[dayIndex][hourKey].content,
                            isPermanent: true
                        };
                    }
                }
            }
        }
    }

    // Clean up permanent hours that were removed from current week
    for (const weekDate in timetables[currentTimetableName].data) {
        if (weekDate !== dateString) {
            for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
                const dayData = timetables[currentTimetableName].data[weekDate][dayIndex];
                if (dayData) {
                    for (const hourKey in dayData) {
                        const hourObj = dayData[hourKey];
                        if (hourObj && hourObj.isPermanent) {
                            // Check if this permanent hour still exists in current week
                            const currentWeekHour = timetables[currentTimetableName].data[dateString][dayIndex]?.[hourKey];
                            if (!currentWeekHour || !currentWeekHour.isPermanent) {
                                // Remove the permanent hour from this week
                                delete dayData[hourKey];
                            }
                        }
                    }
                }
            }
        }
    }

    await saveTimetable(currentTimetableName, timetables[currentTimetableName]);
    showCustomAlert('Success', 'Timetable saved successfully', 'success');
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
        cell.parentNode.replaceChild(newCell, cell);        // Add new event listener - with user abbreviation support
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
                this.classList.add('permanent-hour');
                this.dataset.permanent = 'true';
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
                        // When making a cell permanent, remove any abbreviations
                        let content = this.textContent.trim();
                        if (currentUser.abbreviation && content.includes(' - ' + currentUser.abbreviation)) {
                            content = content.replace(' - ' + currentUser.abbreviation, '');
                            this.textContent = content;
                        }
                        this.classList.add('permanent-hour');
                        this.dataset.permanent = 'true';
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
    const confirmReset = confirm('Are you sure you want to delete all timetables? This cannot be undone.');
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
        showCustomAlert('Success', 'All timetables have been deleted', 'success');
    } catch (error) {
        console.error('Failed to reset timetables:', error);
        
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        showCustomAlert('Error', `Failed to reset timetables: ${error.message}`, 'error');
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
        console.error('Error during initialization:', error);
        showCustomAlert('Error', 'Failed to initialize application', 'error');
    });
    
    // Set up all other handlers
    setupLoginHandlers();
    setupVerificationWindow();
    setupDebugMenuHandlers();
    setupUIHandlers();
});

// Setup debug menu handlers
function setupDebugMenuHandlers() {
    const debugButton = document.getElementById('debug-button');
    const debugMenu = document.getElementById('debug-menu');
    const debugOverlay = document.getElementById('debug-overlay');
    const closeDebug = document.getElementById('close-debug');
      // Only set these up if the elements exist
    if (debugButton && debugMenu && debugOverlay && closeDebug) {
        // Debug menu button handlers
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
    
}

// Setup general UI handlers
function setupUIHandlers() {
    // Add event listener for the create-new button to show select screen
    const createNewBtn = document.getElementById('create-new');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            showSelectScreen();
        });
    }
    
    // Setup calendar popup handlers
    setupCalendarPopupHandlers();
    
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
                this.textContent = isEditMode ? 'Cancel' : 'Edit';
                this.setAttribute('data-tooltip', isEditMode ? 'Cancel editing and discard changes' : 'Edit timetable entries');
                
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
                editButton.textContent = 'Edit';
                editButton.setAttribute('data-tooltip', 'Edit timetable entries');
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
}

// Add calendar popup functionality
function showCalendarPopup() {
    const overlay = document.getElementById('calendarPopupOverlay');
    const popup = document.getElementById('calendarPopup');
    
    if (!overlay || !popup) {
        console.error('Calendar popup elements not found');
        return;
    }
    
    // Generate calendar for popup
    generatePopupCalendar();
    
    // Ensure proper z-index and positioning
    overlay.style.zIndex = '9999';
    popup.style.zIndex = '10000';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    
    overlay.classList.add('active');
    popup.classList.add('active');
}

function hideCalendarPopup() {
    const overlay = document.getElementById('calendarPopupOverlay');
    const popup = document.getElementById('calendarPopup');
    
    overlay.classList.remove('active');
    popup.classList.remove('active');
}

// Generate calendar specifically for popup
function generatePopupCalendar() {
    const currentRealDate = getCurrentDate();
    const calendar = document.getElementById('popupCalendar');
    const calendarTitle = document.getElementById('popupCalendarTitle');

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
            selectDateFromPopup(day, e);
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
}

// Updated selectDate function for popup calendar
function selectDateFromPopup(day = currentDate.getDate(), event) {
    if (!currentTimetableName) {
        showCustomAlert('Error', 'Please select a timetable first', 'error');
        return;
    }
    
    const selectedDate = new Date(currentYear, currentMonth, day);
    
    // Clear previous selections in popup calendar
    document.querySelectorAll('.popup-calendar .calendar-table td.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    // Add selection to clicked date
    if (event && event.target) {
        event.target.classList.add('selected');
    } else {
        // Find and select the correct day cell
        const dayCells = document.querySelectorAll('.popup-calendar .calendar-table td');
        dayCells.forEach(cell => {
            if (cell.textContent == day && !cell.classList.contains('prev-month') && !cell.classList.contains('next-month')) {
                cell.classList.add('selected');
            }
        });
    }
    
    // Store the selected date for the current timetable
    if (timetables[currentTimetableName]) {
        timetables[currentTimetableName].currentWeek = selectedDate.toISOString();
    }
    
    // Update timetable week view
    updateTimetableForWeek(selectedDate);
    
    // Update week view title to show the selected date range
    updateWeekViewTitle(selectedDate);
    
    // Close the calendar popup
    hideCalendarPopup();
    
    showCustomAlert('Success', 'Week set successfully', 'success');
}

// Update the setupCalendarPopupHandlers function
function setupCalendarPopupHandlers() {
    // Set Week button handler
    const setWeekButton = document.querySelector('.set-week-button');
    if (setWeekButton) {
        setWeekButton.addEventListener('click', () => {
            if (!currentTimetableName) {
                showCustomAlert('Error', 'Please select a timetable first', 'error');
                return;
            }
            showCalendarPopup();
        });
    }
    
    // Close button handler
    const closeButton = document.getElementById('closeCalendarPopup');
    if (closeButton) {
        closeButton.addEventListener('click', hideCalendarPopup);
    }
    
    // Overlay click handler
    const overlay = document.getElementById('calendarPopupOverlay');
    if (overlay) {
        overlay.addEventListener('click', hideCalendarPopup);
    }
    
    // Navigation button handlers
    const prevBtn = document.getElementById('calendarPrevBtn');
    const nextBtn = document.getElementById('calendarNextBtn');
    const todayBtn = document.getElementById('calendarTodayBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            navigateMonth(-1);
            generatePopupCalendar();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            navigateMonth(1);
            generatePopupCalendar();
        });
    }
    
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            const today = new Date();
            currentMonth = today.getMonth();
            currentYear = today.getFullYear();
            generatePopupCalendar();
        });
    }
    
    // Escape key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('calendarPopup').classList.contains('active')) {
            hideCalendarPopup();
        }
    });
}

// Function to enable cell editing after login
function enableCellEditingAfterLogin() {
    if (isEditMode) {
        setupCellEditing();
    }
}

// Add the missing showCustomAlert function
function showCustomAlert(title, message, type = 'info') {
    // Remove any existing alert
    const existingAlert = document.getElementById('customAlert');
    const existingOverlay = document.getElementById('alertOverlay');
    
    if (existingAlert) existingAlert.remove();
    if (existingOverlay) existingOverlay.remove();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'alertOverlay';
    overlay.className = 'custom-alert-overlay';
    
    // Create alert
    const alert = document.createElement('div');
    alert.id = 'customAlert';
    alert.className = `custom-alert ${type}`;
    
    alert.innerHTML = `
        <h2>${title}</h2>
        <p>${message}</p>
        <button onclick="hideCustomAlert()">OK</button>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(alert);
    
    // Show with animation
    setTimeout(() => {
        overlay.classList.add('active');
        alert.classList.add('active');
    }, 10);
    
    // Auto-hide after 3 seconds for success messages
    if (type === 'success') {
        setTimeout(hideCustomAlert, 3000);
    }
}

function hideCustomAlert() {
    const alert = document.getElementById('customAlert');
    const overlay = document.getElementById('alertOverlay');
    
    if (alert) alert.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    
    setTimeout(() => {
        if (alert) alert.remove();
        if (overlay) overlay.remove();
    }, 300);
}

// Add logout confirmation functionality
function showLogoutConfirmation() {
    const overlay = document.getElementById('logoutOverlay');
    const dialog = document.getElementById('logoutConfirmDialog');
    
    if (!overlay || !dialog) {
        console.error('Logout confirmation elements not found');
        return;
    }
    
    // Ensure proper positioning and z-index
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    
    dialog.style.zIndex = '10000';
    dialog.style.position = 'relative';
    
    // Show with animation
    setTimeout(() => {
        overlay.classList.add('active');
        dialog.classList.add('active');
    }, 10);
    
    // Set up event listeners (remove any existing ones first)
    const confirmBtn = document.getElementById('confirm-logout');
    const cancelBtn = document.getElementById('cancel-logout');
    
    if (confirmBtn) {
        confirmBtn.onclick = performLogout;
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = hideLogoutConfirmation;
    }
    
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            hideLogoutConfirmation();
        }
    };
}

function hideLogoutConfirmation() {
    const overlay = document.getElementById('logoutOverlay');
    const dialog = document.getElementById('logoutConfirmDialog');
    
    if (overlay) overlay.classList.remove('active');
    if (dialog) dialog.classList.remove('active');
    
    setTimeout(() => {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }, 300);
}

function performLogout() {
    // Reset user state
    currentUser = {
        name: null,
        abbreviation: null,
        isLoggedIn: false,
        isAdmin: false
    };
    
    // Reset admin mode
    isAdminMode = false;
    isEditMode = false;
    
    // Update login and logout buttons
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    
    if (loginButton) {
        loginButton.textContent = 'Login';
        loginButton.classList.remove('logged-in');
        loginButton.setAttribute('data-tooltip', 'Click to login');
        loginButton.style.display = 'block';
    }
    
    if (logoutButton) {
        logoutButton.style.display = 'none';
    }
    
    // Hide admin features
    const adminButton = document.getElementById('admin-button');
    if (adminButton) {
        adminButton.innerHTML = 'Admin Mode';
        adminButton.classList.remove('admin-active');
        adminButton.disabled = false;
    }
    
    const accountsButton = document.getElementById('accounts-button');
    if (accountsButton) {
        accountsButton.style.display = 'none';
        accountsButton.classList.remove('admin-visible');
    }
    
    const toggleButton = document.getElementById('toggle-permanent-btn');
    if (toggleButton) {
        toggleButton.style.display = 'none';
    }
    
    // Hide gear icons
    document.querySelectorAll('.gear-icon').forEach(icon => {
        icon.classList.remove('visible');
    });
    
    const createNewBtn = document.getElementById('create-new');
    if (createNewBtn) {
        createNewBtn.classList.remove('admin-visible');
    }
    
    // Reset cells to non-editable
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        cell.setAttribute('contenteditable', 'false');
        cell.classList.remove('editable', 'edited-cell');
    });
    
    // Hide save button
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.style.display = 'none';
    }
    
    // Reset edit button
    const editButton = document.querySelector('.edit-button');
    if (editButton) {
        editButton.textContent = 'Edit';
        editButton.setAttribute('data-tooltip', 'Edit timetable entries');
    }
    
    // Hide timetable view
    const timeTable = document.querySelector('.time-table');
    if (timeTable) {
        timeTable.style.display = 'none';
    }
    
    // Clear timetables and reload
    loadTimetables();
    
    // Hide logout dialog
    hideLogoutConfirmation();
    
    showCustomAlert('Success', 'You have been logged out successfully', 'success');
}

// Add missing timetables object initialization
let timetables = {};

// Add missing showClassEditMenu function
function showClassEditMenu(className) {
    console.log('Opening class edit menu for:', className);
    // This function can be implemented later for class editing functionality
    showCustomAlert('Info', 'Class editing functionality coming soon', 'info');
}