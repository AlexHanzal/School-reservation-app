// Miscellaneous utilities and responsive design
let isEditMode = false;

// Desktop-focused responsive design functionality
function setupResponsiveDesign() {
    function updateResponsiveVars() {
        const root = document.documentElement;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        let scale = 1;
        if (width > 1440) {
            scale = 1.1;
        } else if (width < 1200) {
            scale = 0.95;
        }
        
        root.style.setProperty('--base-scale', scale);
        updateDesktopLayout();
    }
    
    function updateDesktopLayout() {
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        const calendar = document.getElementById('timetable-calendar');
        if (calendar) {
            calendar.style.transform = '';
            calendar.style.transformOrigin = '';
        }
    }
    
    updateResponsiveVars();
    window.addEventListener('resize', updateResponsiveVars);
}

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
    
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    const timeTable = document.querySelector('.time-table');
    if (timeTable) {
        timeTable.style.overflowY = 'hidden';
    }
    
    const calendar = document.getElementById('timetable-calendar');
    if (calendar) {
        calendar.style.transform = '';
        calendar.style.transformOrigin = '';
    }
    
    const timeTableButtons = document.querySelector('.time-table-buttons');
    if (timeTableButtons) {
        const containerWidth = timeTableButtons.offsetWidth;
        const buttons = timeTableButtons.querySelectorAll('button');
        
        if (containerWidth < 400 && buttons.length > 1) {
            buttons.forEach(button => {
                button.style.padding = '6px 12px';
                button.style.fontSize = '0.9em';
            });
        }
    }
    
    optimizeTableHeight();
}

// Function to ensure table fits in viewport
function optimizeTableHeight() {
    const timeTable = document.querySelector('.time-table');
    const tableContainer = document.querySelector('.table-container');
    const bottomContent = document.querySelector('.bottom-content');
    
    if (!timeTable || !tableContainer || !bottomContent) return;
    
    const timeTableHeight = timeTable.clientHeight;
    const bottomContentHeight = bottomContent.offsetHeight;
    const headerHeight = document.querySelector('h2').offsetHeight || 40;
    const padding = 20;
    
    const availableHeight = timeTableHeight - bottomContentHeight - headerHeight - padding;
    
    tableContainer.style.maxHeight = `${availableHeight}px`;
    tableContainer.style.overflow = 'hidden';
    
    const cells = document.querySelectorAll('.week-table td, .week-table th');
    const rowCount = document.querySelectorAll('.week-table tbody tr').length + 1;
    const maxCellHeight = Math.floor((availableHeight - 10) / rowCount);
    
    if (maxCellHeight > 20 && maxCellHeight < 40) {
        cells.forEach(cell => {
            cell.style.height = `${maxCellHeight}px`;
            cell.style.maxHeight = `${maxCellHeight}px`;
        });
    }
}

// Add mutation observer to watch for table content changes
const observeTableChanges = () => {
    const targetNode = document.querySelector('.week-table tbody');
    if (targetNode) {
        const config = { childList: true, subtree: true, characterData: true };
        const observer = new MutationObserver(adjustTableFontSizes);
        observer.observe(targetNode, config);
    }
};

// Setup general UI handlers
function setupUIHandlers() {
    const createNewBtn = document.getElementById('create-new');
    if (createNewBtn) {
        createNewBtn.addEventListener('click', () => {
            window.showSelectScreen();
        });
    }
    
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
    
    const accountsButton = document.getElementById('accounts-button');
    if (accountsButton) {
        const newAccountsButton = accountsButton.cloneNode(true);
        accountsButton.parentNode.replaceChild(newAccountsButton, accountsButton);
        
        newAccountsButton.addEventListener('click', () => {
            if (window.isAdminMode || document.body.classList.contains('debug-mode')) {
                const accountsMenu = document.getElementById('accounts-menu');
                const accountsOverlay = document.getElementById('accounts-overlay');
                
                if (accountsMenu && accountsOverlay) {
                    accountsMenu.classList.add('active');
                    accountsOverlay.classList.add('active');
                    accountsMenu.style.display = 'block';
                    accountsMenu.style.visibility = 'visible';
                    accountsOverlay.style.display = 'block';
                    accountsOverlay.style.visibility = 'visible';
                }
            }
        });
    }
    
    const accountsOverlay = document.getElementById('accounts-overlay');
    if (accountsOverlay) {
        accountsOverlay.addEventListener('click', () => {
            closeAccountsMenu();
        });
    }
    
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
    
    const editButton = document.querySelector('.edit-button');
    if (editButton) {
        const newEditButton = editButton.cloneNode(true);
        if (editButton.parentNode) {
            editButton.parentNode.replaceChild(newEditButton, editButton);
        }
        
        newEditButton.addEventListener('click', function() {
            console.log('Edit button clicked');
            if (!window.isAdminMode) {
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
                
                if (isEditMode) {
                    window.setupCellEditing();
                }
                
                const saveButton = document.querySelector('.save-button');
                if (saveButton) {
                    saveButton.style.display = isEditMode ? 'block' : 'none';
                }
            }
        });
    }
    
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            window.saveTimeTable();
            isEditMode = false;
            const editButton = document.querySelector('.edit-button');
            if (editButton) {
                editButton.textContent = 'Edit';
            }
            saveButton.style.display = 'none';
            
            const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
            cells.forEach(cell => {
                cell.setAttribute('contenteditable', 'false');
                cell.classList.remove('editable');
                cell.classList.remove('edited-cell');
            });
        });
    }
    
    // Submit button handler
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.addEventListener('click', async () => {
            const nameInput = document.getElementById('name-input');
            const name = nameInput.value.trim();
            
            if (name) {
                try {
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    if (loadingOverlay) {
                        loadingOverlay.classList.add('active');
                        loadingOverlay.style.display = 'flex';
                    }
                    
                    const response = await fetch(`http://${window.location.hostname}:3000/api/timetables`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name })
                    });
                    
                    const result = await response.json();
                    
                    if (loadingOverlay) {
                        loadingOverlay.classList.remove('active');
                    }
                    
                    if (result.success) {
                        const existingButton = document.querySelector(`.dynamic-button[data-name="${name}"]`);
                        if (existingButton) {
                            const container = existingButton.closest('.button-group');
                            if (container) {
                                container.remove();
                            }
                        }
                        
                        const dynamicButton = window.createDynamicButton(name);
                        const container = document.getElementById('dynamic-links-container');
                        
                        const buttonElement = dynamicButton.querySelector('.dynamic-button');
                        if (buttonElement) {
                            buttonElement.setAttribute('data-name', name);
                        }
                        
                        container.appendChild(dynamicButton);
                        
                        window.timetables[name] = {
                            className: name,
                            fileId: result.fileId,
                            data: {},
                            calendar: document.getElementById('timetable-calendar').innerHTML
                        };
                        
                        window.showTimetable(name);
                        document.getElementById('select-screen').style.display = 'none';
                        nameInput.value = '';
                        
                        window.showCustomAlert('Success', 'New class created successfully', 'success');
                    } else {
                        window.showCustomAlert('Error', result.error || 'Failed to create class', 'error');
                    }
                } catch (error) {
                    console.error('Failed to create timetable:', error);
                    window.showCustomAlert('Error', 'Failed to create timetable', 'error');
                    
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    if (loadingOverlay) {
                        loadingOverlay.classList.remove('active');
                    }
                }
            } else {
                window.showCustomAlert('Error', 'Please enter a class name', 'error');
            }
        });
    }
    
    // Accounts menu button event listeners
    const modifyAccountsBtn = document.getElementById('modify-accounts');
    const removeAccountsBtn = document.getElementById('remove-accounts');
    const createAccountsBtn = document.getElementById('create-accounts');

    if (modifyAccountsBtn) {
        modifyAccountsBtn.addEventListener('click', () => {
            console.log('Modify Accounts button clicked');
            closeAccountsMenu();
        });
    }

    if (removeAccountsBtn) {
        removeAccountsBtn.addEventListener('click', () => {
            console.log('Remove Accounts button clicked');
            closeAccountsMenu();
        });
    }

    if (createAccountsBtn) {
        createAccountsBtn.addEventListener('click', () => {
            console.log('Create Accounts button clicked');
            window.showAccountCreatePopup();
            closeAccountsMenu();
        });
    }
}

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

// Debug mode key combination
document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.code === 'KeyA') {
        const handler = (e2) => {
            if (e2.code === 'KeyS') {
                document.body.classList.toggle('debug-mode');
                const isDebugMode = document.body.classList.contains('debug-mode');
                if (isDebugMode) {
                    window.enableDebugMode();
                } else {
                    window.disableDebugMode();
                }
            }
            document.removeEventListener('keydown', handler);
        };
        document.addEventListener('keydown', handler);
    }
});

// Setup debug menu handlers
function setupDebugMenuHandlers() {
    const debugButton = document.getElementById('debug-button');
    const debugMenu = document.getElementById('debug-menu');
    const debugOverlay = document.getElementById('debug-overlay');
    const closeDebug = document.getElementById('close-debug');
    
    if (debugButton && debugMenu && debugOverlay && closeDebug) {
        const resetAllBtn = document.getElementById('debug-reset-all');
        if (resetAllBtn) {
            const newResetAllBtn = resetAllBtn.cloneNode(true);
            resetAllBtn.parentNode.replaceChild(newResetAllBtn, resetAllBtn);
            
            newResetAllBtn.addEventListener('click', async () => {
                console.log('Reset All button clicked');
                try {
                    await window.resetAllTimetables();
                    debugMenu.classList.remove('active');
                    debugOverlay.classList.remove('active');
                } catch (error) {
                    console.error('Error in resetAllTimetables:', error);
                    window.showCustomAlert('Error', 'Failed to reset timetables: ' + error.message, 'error');
                }
            });
        }
        
        document.getElementById('debug-create-new').addEventListener('click', () => {
            window.showSelectScreen();
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

// Main initialization
let hasAppInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    if (hasAppInitialized) {
        console.log('App already initialized, skipping duplicate initialization');
        return;
    }
    
    console.log('Initializing app - ONE TIME ONLY');
    hasAppInitialized = true;
    
    setupResponsiveDesign();
    
    window.loadTimetables().then(() => {
        const savedTimetable = localStorage.getItem('currentTimetable');
        if (savedTimetable && window.timetables[savedTimetable]) {
            window.showTimetable(savedTimetable);
        }
    }).catch(error => {
        console.error('Error during initialization:', error);
        window.showCustomAlert('Error', 'Failed to initialize application', 'error');
    });
    
    window.setupLoginHandlers();
    window.setupVerificationWindow();
    setupDebugMenuHandlers();
    setupUIHandlers();
});

// Add event listeners for layout updates
window.addEventListener('resize', updateResponsiveLayout);
document.addEventListener('fullscreenchange', updateResponsiveLayout);

// Export functions for global access
window.isEditMode = isEditMode;
window.setupUIHandlers = setupUIHandlers;
window.closeAccountsMenu = closeAccountsMenu;
window.updateResponsiveLayout = updateResponsiveLayout;
window.observeTableChanges = observeTableChanges;
