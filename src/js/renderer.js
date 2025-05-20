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
                    weekData[dayIndex].forEach((cellData, cellIndex) => {
                        if (cellData) {
                            // Check if cellData is an object with content property or a string
                            const cellContent = typeof cellData === 'object' && cellData.content !== undefined 
                                ? cellData.content 
                                : (typeof cellData === 'string' ? cellData : '');
                            
                            cells[cellIndex].textContent = cellContent;
                        } else {
                            cells[cellIndex].textContent = '';
                        }
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

        const data = await response.json();        if (response.ok) {
            const loginButton = document.getElementById('login-button');
            loginButton.textContent = data.name; // Show user name
            loginButton.title = "Click to logout"; // Add tooltip text
            loginButton.setAttribute('aria-label', `${data.name} (Click to logout)`); // Accessibility
            loginButton.classList.add('logged-in');
            
            // Store user information in our global object
            currentUser = {
                name: data.name,
                abbreviation: userSelect.value,
                isLoggedIn: true
            };
            console.log('User logged in:', currentUser);
            
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
        }else {
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
    
    // Clear password field
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) passwordInput.value = '';
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
            }            // If not permanent, check for regular content from saved data
            if (timetables[currentTimetableName]?.data?.[dateString]?.[index]?.[hourIndex]) {
                const cellData = timetables[currentTimetableName].data[dateString][index][hourIndex];
                if (typeof cellData === 'object' && cellData !== null) {
                    // Handle legacy data format (objects with content property)
                    cell.textContent = cellData.content || '';
                } else {
                    // Handle string data - ensuring proper text display with line breaks
                    cell.textContent = cellData || '';
                }
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

function toggleAdminEditMode() {
    const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
    cells.forEach(cell => {
        // Make all cells editable in admin mode
        cell.setAttribute('contenteditable', 'true');
        cell.classList.add('editable');
        
        // Add input event listener for making cells permanent only when toggle is enabled
        cell.addEventListener('input', function() {
            if (isAdminMode && permanentHourModeEnabled && this.textContent.trim() !== '') {
                this.classList.add('permanent-hour');
                this.dataset.permanent = 'true';
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
        accountsMenu.classList.remove('active');
        accountsOverlay.classList.remove('active');
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
                    console.error(`Failed to load timetable ${name}`);
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
            
            // Set data-name attribute for identification
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

async function saveTimeTable() {
    if (!currentTimetableName || !timetables[currentTimetableName]) {
        showCustomAlert('Error', 'No timetable selected', 'error');
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
        timetables[currentTimetableName].data[dateString] = [];
    }    // Process edited cells and add abbreviations 
    document.querySelectorAll('.week-table tbody td.edited-cell').forEach(cell => {
        if (currentUser.isLoggedIn && cell.textContent.trim() !== '') {
            const text = cell.textContent.trim();
            
            // Only add the abbreviation if it's not already there
            if (!text.includes(`(${currentUser.abbreviation})`)) {
                // Format without using HTML tags to avoid rendering issues on reload
                cell.textContent = `${text}\n(${currentUser.abbreviation})`;
            }
        }
        
        // Remove the edited-cell class since we've processed it
        cell.classList.remove('edited-cell');
    });
      // Collect data from the table
    rows.forEach((row, dayIndex) => {
        const cells = row.querySelectorAll('td:not(:first-child)');
        const dayData = Array.from(cells).map(cell => {
            // Store the content as plain text
            return cell.textContent.trim();
        });
        timetables[currentTimetableName].data[dateString][dayIndex] = dayData;
    });

    // Save permanent hours
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
        
        // Add new event listener - but don't add abbreviation yet
        newCell.addEventListener('input', function() {
            // Just mark the cell as edited
            this.classList.add('edited-cell');
            
            // In admin mode, also handle permanent hours if toggle is on
            if (isAdminMode && permanentHourModeEnabled && this.textContent.trim() !== '') {
                this.classList.add('permanent-hour');
                this.dataset.permanent = 'true';
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
    
    // Add date picker functionality
    const datePickerBtn = document.getElementById('debug-set-date');
    const datePickerOverlay = document.getElementById('datePickerOverlay');
    if (datePickerBtn && datePickerOverlay) {
        datePickerBtn.addEventListener('click', () => {
            datePickerOverlay.style.display = 'block';
            generateDatePickerCalendar();
            if (debugMenu && debugOverlay) {
                debugMenu.classList.remove('active');
                debugOverlay.classList.remove('active');
            }
        });
    }
    
    const saveCustomDateBtn = document.getElementById('save-custom-date');
    if (saveCustomDateBtn) {
        saveCustomDateBtn.addEventListener('click', () => {
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
    }
    
    const cancelCustomDateBtn = document.getElementById('cancel-custom-date');
    if (cancelCustomDateBtn) {
        cancelCustomDateBtn.addEventListener('click', () => {
            document.getElementById('datePickerOverlay').style.display = 'none';
        });
    }
    
    const resetDateBtn = document.getElementById('resetDateBtn');
    if (resetDateBtn) {
        resetDateBtn.addEventListener('click', () => {
            customDate = null;
            document.getElementById('customDateNotice').classList.remove('active');
            generateCalendar();
            updateTimetableForWeek(new Date());
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
        accountsButton.addEventListener('click', () => {
            // Allow if in admin mode OR debug mode
            if (isAdminMode || document.body.classList.contains('debug-mode')) {
                const accountsMenu = document.getElementById('accounts-menu');
                const accountsOverlay = document.getElementById('accounts-overlay');
                
                if (accountsMenu && accountsOverlay) {
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
                this.textContent = isEditMode ? 'Cancel' : 'Edit';
                
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
            this.textContent = isEditMode ? 'Cancel' : 'Edit';
            
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
            <h2>Edit Class</h2>
            <div class="input-group">
                <label for="class-name-edit">Class Name</label>
                <input type="text" id="class-name-edit" placeholder="Enter new class name">
            </div>
            <div class="class-edit-error" id="class-edit-error"></div>
            <div class="class-edit-actions">
                <button id="rename-class-btn" class="primary-btn">Rename Class</button>
                <button id="delete-class-btn" class="danger-btn">Delete Class</button>
                <button id="cancel-class-edit-btn">Cancel</button>
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
    }
    
    // Set current class name
    const nameInput = document.getElementById('class-name-edit');
    nameInput.value = name;
    
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
    const errorElement = document.getElementById('class-edit-error');
    const newName = nameInput.value.trim();
    
    // Clear previous error
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    
    // Validate new name
    if (!newName) {
        errorElement.textContent = 'Please enter a class name';
        errorElement.style.display = 'block';
        return;
    }
    
    if (newName === oldName) {
        hideClassEditMenu();
        return; // No change needed
    }
    
    // Check if the new name already exists
    if (timetables[newName]) {
        errorElement.textContent = 'A class with this name already exists';
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
            throw new Error('Failed to create new class');
        }
        
        const result = await response.json();
          // Update the data for the new class
        const updateResponse = await fetch(`${API_URL}/timetables/${encodeURIComponent(newName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileId: result.fileId,
                data: timetableData.data || {}, // Ensure we have at least an empty object
                permanentHours: timetableData.permanentHours || {},
                currentWeek: timetableData.currentWeek || new Date().toISOString()
            })
        });
        
        if (!updateResponse.ok) {
            throw new Error('Failed to update class data');
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
            throw new Error(`Failed to delete old class: ${deleteResponse.status}`);
        }
        
        // Update local data
        timetables[newName] = {
            ...timetableData,
            className: newName,
            fileId: result.fileId
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
        showCustomAlert('Success', 'Class renamed successfully', 'success');
          } catch (error) {
        console.error('Failed to rename class:', error);
        
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        // Show detailed error in UI
        errorElement.textContent = `Failed to rename class: ${error.message}`;
        errorElement.style.display = 'block';
        
        // Show alert with error details
        showCustomAlert('Error', `Unable to rename the class. Please try again. (${error.message})`, 'error');
    }
}

// Function to delete a class
async function deleteClass(name) {
    // Ask for confirmation
    const confirmDelete = confirm(`Are you sure you want to delete the class "${name}"? This cannot be undone.`);
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
        showCustomAlert('Success', 'Class deleted successfully', 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        // Show detailed error in UI
        const errorElement = document.getElementById('class-edit-error');
        errorElement.textContent = `Failed to delete class: ${error.message}`;
        errorElement.style.display = 'block';
        
        // Show alert with error details
        showCustomAlert('Error', `Unable to delete the class. Please try again. (${error.message})`, 'error');
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
                <h3>Confirm Logout</h3>
                <p>Are you sure you want to log out?</p>
                <div class="logout-buttons">
                    <button id="confirm-logout">Yes, Log Out</button>
                    <button id="cancel-logout">Cancel</button>
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
        isLoggedIn: false
    };
    
    // Update UI
    const loginButton = document.getElementById('login-button');
    loginButton.textContent = 'Login';
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
        
        // Show login required message
        const loginMessage = document.createElement('div');
        loginMessage.className = 'login-required-message';
        loginMessage.textContent = 'Please log in to view classes';
        loginMessage.style.textAlign = 'center';
        loginMessage.style.padding = '20px';
        loginMessage.style.color = '#777';
        container.appendChild(loginMessage);
    }
    
    // Show success message
    showCustomAlert('Success', 'You have been logged out', 'success');
}

// Function to toggle permanent hour mode
let permanentHourModeEnabled = false;

function togglePermanentHourMode() {
    permanentHourModeEnabled = !permanentHourModeEnabled;
    const toggleButton = document.getElementById('toggle-permanent-btn');
    
    if (toggleButton) {
        if (permanentHourModeEnabled) {
            toggleButton.classList.add('active');
            toggleButton.textContent = 'Permanent Hours: ON';
        } else {
            toggleButton.classList.remove('active');
            toggleButton.textContent = 'Permanent Hours: OFF';
        }
    }
    
    // Show feedback to user
    showCustomAlert('Admin Mode', 
        permanentHourModeEnabled ? 
        'Permanent hours mode is now ON. Edited cells will become permanent.' : 
        'Permanent hours mode is now OFF. Edited cells will be regular entries.', 
        'info');
}
