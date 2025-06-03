// UI components and interactions
const API_URL = `http://${window.location.hostname}:3000/api`;

// Function to create dynamic buttons
function createDynamicButton(name) {
    const container = document.createElement('div');
    container.className = 'button-group';
    
    const button = document.createElement('button');
    button.className = 'dynamic-button';
    button.textContent = name;
    button.addEventListener('click', () => window.showTimetable(name));
    
    const editButton = document.createElement('button');
    editButton.className = 'gear-icon';
    editButton.innerHTML = '✎';
    editButton.title = 'Edit class';
    editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Edit button clicked for class:', name, 'Admin mode:', window.isAdminMode);
        if (window.isAdminMode) {
            showClassEditMenu(name);
        }
    });
    
    if (window.isAdminMode) {
        editButton.classList.add('visible');
    }
    
    container.appendChild(button);
    container.appendChild(editButton);
    return container;
}

// Function to show and initialize the select screen
function showSelectScreen() {
    const selectScreen = document.getElementById('select-screen');
    if (!selectScreen) return;
    
    const nameInput = document.getElementById('name-input');
    const typeSelect = document.getElementById('type-select');
    
    if (nameInput) nameInput.value = '';
    if (typeSelect) typeSelect.selectedIndex = 0;
    
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
    
    const selectWindow = selectScreen.querySelector('.select-window');
    if (selectWindow) {
        selectWindow.style.backgroundColor = 'white';
        selectWindow.style.padding = '20px';
        selectWindow.style.borderRadius = '5px';
        selectWindow.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
        selectWindow.style.minWidth = '300px';
    }
    
    if (nameInput) {
        nameInput.focus();
    }
}

// Function to show class edit menu for admin operations
function showClassEditMenu(name) {
    console.log('Opening class edit menu for:', name);
    
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
        
        document.getElementById('cancel-class-edit-btn').addEventListener('click', hideClassEditMenu);
        
        let overlay = document.getElementById('class-edit-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'class-edit-overlay';
            overlay.className = 'accounts-overlay';
            overlay.addEventListener('click', hideClassEditMenu);
            document.body.appendChild(overlay);
        }
    }
    
    const nameInput = document.getElementById('class-name-edit');
    nameInput.value = name;
    
    const errorElement = document.getElementById('class-edit-error');
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    
    popup.dataset.className = name;
    
    const renameBtn = document.getElementById('rename-class-btn');
    renameBtn.onclick = () => renameClass(name);
    
    const deleteBtn = document.getElementById('delete-class-btn');
    deleteBtn.onclick = () => deleteClass(name);
    
    popup.style.display = 'block';
    document.getElementById('class-edit-overlay').style.display = 'block';
}

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
    
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    
    if (!newName) {
        errorElement.textContent = 'Please enter a class name';
        errorElement.style.display = 'block';
        return;
    }
    
    if (newName === oldName) {
        hideClassEditMenu();
        return;
    }
    
    if (window.timetables[newName]) {
        errorElement.textContent = 'A class with this name already exists';
        errorElement.style.display = 'block';
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        const timetableData = { ...window.timetables[oldName] };
        
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
        
        const updateResponse = await fetch(`${API_URL}/timetables/${encodeURIComponent(newName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileId: result.fileId,
                data: timetableData.data || {},
                permanentHours: timetableData.permanentHours || {},
                currentWeek: timetableData.currentWeek || new Date().toISOString()
            })
        });
        
        if (!updateResponse.ok) {
            throw new Error('Failed to update class data');
        }
        
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
        
        window.timetables[newName] = {
            ...timetableData,
            className: newName,
            fileId: result.fileId
        };
        delete window.timetables[oldName];
        
        const existingButton = document.querySelector(`.dynamic-button[data-name="${oldName}"]`);
        if (existingButton) {
            const container = existingButton.closest('.button-group');
            if (container) {
                container.remove();
            }
        }
        
        const dynamicButton = createDynamicButton(newName);
        const container = document.getElementById('dynamic-links-container');
        
        const buttonElement = dynamicButton.querySelector('.dynamic-button');
        if (buttonElement) {
            buttonElement.setAttribute('data-name', newName);
        }
        
        container.appendChild(dynamicButton);
        
        if (window.currentTimetableName === oldName) {
            window.currentTimetableName = newName;
            localStorage.setItem('currentTimetable', newName);
            
            const timeTableTitle = document.querySelector('.time-table h2');
            if (timeTableTitle) {
                timeTableTitle.textContent = newName;
            }
        }
        
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        hideClassEditMenu();
        window.showCustomAlert('Success', 'Class renamed successfully', 'success');
    } catch (error) {
        console.error('Failed to rename class:', error);
        
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        errorElement.textContent = `Failed to rename class: ${error.message}`;
        errorElement.style.display = 'block';
        
        window.showCustomAlert('Error', `Unable to rename the class. Please try again. (${error.message})`, 'error');
    }
}

// Function to delete a class
async function deleteClass(name) {
    const confirmDelete = confirm(`Are you sure you want to delete the class "${name}"? This cannot be undone.`);
    if (!confirmDelete) return;
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        console.log(`Attempting to delete class: ${name}`);
        
        const fileId = window.timetables[name]?.fileId;
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
            }
        }
        
        delete window.timetables[name];
        
        let deletedClasses = JSON.parse(localStorage.getItem('deletedClasses') || '[]');
        deletedClasses.push(name);
        localStorage.setItem('deletedClasses', JSON.stringify(deletedClasses));
        console.log(`Added ${name} to deleted classes list in localStorage`);
        
        const existingButton = document.querySelector(`.dynamic-button[data-name="${name}"]`);
        if (existingButton) {
            const container = existingButton.closest('.button-group');
            if (container) {
                container.remove();
            }
        }
        
        if (window.currentTimetableName === name) {
            const timeTable = document.querySelector('.time-table');
            if (timeTable) {
                timeTable.style.display = 'none';
            }
            window.currentTimetableName = '';
            localStorage.removeItem('currentTimetable');
        }
        
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        hideClassEditMenu();
        window.showCustomAlert('Success', 'Class deleted successfully', 'success');
    } catch (error) {
        console.error('Failed to delete class:', error);
        
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        
        const errorElement = document.getElementById('class-edit-error');
        errorElement.textContent = `Failed to delete class: ${error.message}`;
        errorElement.style.display = 'block';
        
        window.showCustomAlert('Error', `Unable to delete the class. Please try again. (${error.message})`, 'error');
    }
}

// Function to show custom alerts
function showCustomAlert(title, message, type = 'info') {
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
        
        customAlert.querySelector('button').addEventListener('click', () => {
            customAlert.classList.remove('active');
            const overlay = document.getElementById('custom-alert-overlay');
            if (overlay) overlay.classList.remove('active');
        });
        
        let overlay = document.getElementById('custom-alert-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'custom-alert-overlay';
            overlay.className = 'custom-alert-overlay';
            document.body.appendChild(overlay);
        }
    }
    
    customAlert.querySelector('h2').textContent = title;
    customAlert.querySelector('p').textContent = message;
    
    customAlert.classList.remove('info', 'error', 'success', 'warning');
    customAlert.classList.add(type);
    customAlert.classList.add('active');
    
    const overlay = document.getElementById('custom-alert-overlay');
    if (overlay) overlay.classList.add('active');
    
    if (type === 'success') {
        setTimeout(() => {
            customAlert.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }, 3000);
    }
}

// Account creation popup handling
function showAccountCreatePopup() {
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

    popup.style.display = 'block';
    popup.style.visibility = 'visible';
    popup.style.zIndex = 3000;

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

    document.getElementById('account-name').value = '';
    document.getElementById('account-abbreviation').value = '';
    document.getElementById('account-password').value = '';
    document.getElementById('account-is-admin').checked = false;
    document.getElementById('account-create-error').style.display = 'none';

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
    
    console.log('Creating account with isAdmin:', isAdmin);
    
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    
    if (!name || !abbreviation || !password) {
        errorElement.textContent = 'All fields are required';
        errorElement.style.display = 'block';
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = 'Creating account...';
    }
    
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
            window.showCustomAlert('Success', 'Account created successfully', 'success');
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

// Function to enable editing after login
function enableCellEditingAfterLogin() {
    console.log('Enabling cell editing after login');
    
    const editButton = document.querySelector('.edit-button');
    if (!editButton) {
        console.error('Edit button not found');
        return;
    }
    
    const newEditButton = editButton.cloneNode(true);
    if (editButton.parentNode) {
        editButton.parentNode.replaceChild(newEditButton, editButton);
    }
    
    newEditButton.addEventListener('click', function() {
        console.log('Edit button clicked after login');
        if (!window.isAdminMode) {
            window.isEditMode = !window.isEditMode;
            console.log('Edit mode toggled to:', window.isEditMode);
            
            this.textContent = window.isEditMode ? 'Cancel' : 'Edit';
            
            const cells = document.querySelectorAll('.week-table tbody td:not(:first-child)');
            cells.forEach(cell => {
                if (!cell.classList.contains('permanent-hour')) {
                    cell.setAttribute('contenteditable', window.isEditMode ? 'true' : 'false');
                    cell.classList.toggle('editable', window.isEditMode);
                    console.log('Cell editable set to:', cell.getAttribute('contenteditable'));
                }
            });
            
            if (window.isEditMode) {
                window.setupCellEditing();
            }
            
            const saveButton = document.querySelector('.save-button');
            if (saveButton) {
                saveButton.style.display = window.isEditMode ? 'block' : 'none';
            }
        }
    });
}

// Export functions for global access
window.createDynamicButton = createDynamicButton;
window.showSelectScreen = showSelectScreen;
window.showClassEditMenu = showClassEditMenu;
window.hideClassEditMenu = hideClassEditMenu;
window.showCustomAlert = showCustomAlert;
window.showAccountCreatePopup = showAccountCreatePopup;
window.hideAccountCreatePopup = hideAccountCreatePopup;
window.enableCellEditingAfterLogin = enableCellEditingAfterLogin;
