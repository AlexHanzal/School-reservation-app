const Module = require('module');
const path = require('path');
const originalRequire = Module.prototype.require;
const os = require('os');

// Get the global npm modules directory
function getGlobalNodeModulesPath() {
  // Common paths for global modules based on platform
  if (process.platform === 'win32') {
    // Use AppData location for Windows
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appDataPath, 'npm', 'node_modules');
  } else {
    // For Unix-like systems
    return '/usr/local/lib/node_modules';
  }
}

const globalModulesPath = getGlobalNodeModulesPath();
console.log('Using global modules from:', globalModulesPath);

// Only modify the require behavior if we're in production mode
if (process.env.NODE_ENV === 'production') {
  // Extend the require function to check global modules first
  Module.prototype.require = function(moduleName) {
    try {
      // Try the original require first
      return originalRequire.call(this, moduleName);
    } catch (e) {
      // If it fails, try requiring it from the global modules
      try {
        const globalModulePath = path.join(globalModulesPath, moduleName);
        console.log(`Attempting to load module from global path: ${globalModulePath}`);
        return originalRequire.call(this, globalModulePath);
      } catch (err) {
        console.error(`Failed to load module '${moduleName}' globally:`, err.message);
        // If that also fails, throw the original error
        throw e;
      }
    }
  };
}

// Now require the dependencies
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const app = express();
const port = 3000;

// Function to get local IP address
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName of Object.keys(interfaces)) {
        for (const interface of interfaces[interfaceName]) {
            // Skip internal and non-IPv4 addresses
            if (!interface.internal && interface.family === 'IPv4') {
                return interface.address;
            }
        }
    }
    return 'localhost'; // Fallback to localhost if no suitable interface found
}

const host = getLocalIpAddress();
// Update initialization section to use correct paths
const DATA_DIR = path.resolve(process.cwd(), 'data/timetables');
const USERS_DIR = path.resolve(process.cwd(), 'data/Users');

// Function to generate random file ID
function generateFileId(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Update these lines for correct static file serving
app.use(cors());
app.use(express.json());
// Serve static files from the src directory
app.use(express.static(path.join(__dirname, '../../src')));

// Add root route before API routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../src/outside/index.html'));
});

// Update initialization function to use fileId for lookups
async function initializeDataStorage() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const files = await fs.readdir(DATA_DIR);
        const timetables = {};
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
                const parsedData = JSON.parse(data);
                timetables[parsedData.fileId] = parsedData;
            }
        }
        return timetables;
    } catch (error) {
        console.error('Failed to initialize data storage:', error);
        process.exit(1);
    }
}

// In-memory storage (now backed by file)
let timetables = {}

// API routes
// Update the timetables endpoint to better handle errors and logging
app.get('/api/timetables', async (req, res) => {
    try {
        console.log('Request received for /api/timetables');
        
        // Ensure the directory exists
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        const files = await fs.readdir(DATA_DIR);
        console.log(`Found ${files.length} files in timetables directory`);
        
        const uniqueTimetables = new Map();
        
        // Sort files by creation time to get newest first
        const fileStats = await Promise.all(
            files.filter(f => f.endsWith('.json'))
                .map(async file => {
                    try {
                        const filePath = path.join(DATA_DIR, file);
                        const stat = await fs.stat(filePath);
                        const data = await fs.readFile(filePath, 'utf8');
                        const parsedData = JSON.parse(data);
                        return {
                            file,
                            data: parsedData,
                            mtime: stat.mtime
                        };
                    } catch (error) {
                        console.error(`Error processing file ${file}:`, error);
                        return null; // Skip this file on error
                    }
                })
                .filter(item => item !== null) // Filter out nulls
        );
        
        console.log(`Successfully processed ${fileStats.length} timetable files`);
        
        // Sort by modification time, newest first
        fileStats.sort((a, b) => b.mtime - a.mtime);
        
        // Keep only the newest file for each class name
        for (const file of fileStats) {
            if (!uniqueTimetables.has(file.data.className)) {
                uniqueTimetables.set(file.data.className, file.data);
            }
        }
        
        // Return only unique class names as an array
        const uniqueClassNames = Array.from(uniqueTimetables.keys());
        console.log('Sending unique class names:', uniqueClassNames);
        res.json(uniqueClassNames);
    } catch (error) {
        console.error('Failed to list timetables:', error);
        res.status(500).json({ success: false, error: 'Failed to list timetables: ' + error.message });
    }
});

app.post('/api/timetables', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        res.status(400).json({ success: false, error: 'Name is required' });
        return;
    }

    const fileId = generateFileId();
    const filename = `${fileId}.json`;
    
    const timetableData = {
        className: name,
        fileId: fileId,
        data: {},
        calendar: null,
        currentWeek: new Date().toISOString(),
        permanentHours: {}
    };
    
    try {
        await fs.writeFile(
            path.join(DATA_DIR, filename),
            JSON.stringify(timetableData, null, 2)
        );
        res.json({ success: true, fileId: fileId, className: name });
    } catch (error) {
        console.error('Failed to create timetable:', error);
        res.status(500).json({ success: false, error: 'Failed to create timetable' });
    }
});

// Add this utility function after the generateFileId function
async function deleteOldTimetableFiles(className) {
    const files = await fs.readdir(DATA_DIR);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const filePath = path.join(DATA_DIR, file);
            const data = await fs.readFile(filePath, 'utf8');
            const timetable = JSON.parse(data);
            if (timetable.className === className) {
                await fs.unlink(filePath);
            }
        }
    }
}

// Update the PUT route to handle paths correctly
app.put('/api/timetables/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { fileId, data, permanentHours, currentWeek } = req.body;

        if (!fileId) {
            return res.status(400).json({ success: false, error: 'FileId is required' });
        }

        const filePath = path.join(DATA_DIR, `${fileId}.json`);
        const tempPath = path.join(DATA_DIR, `${fileId}_temp.json`);

        // Ensure the directory exists
        await fs.mkdir(DATA_DIR, { recursive: true });

        try {
            // Check if the file exists - if it does, read the existing data
            let existingData = {};
            try {
                const fileContent = await fs.readFile(filePath, 'utf8');
                existingData = JSON.parse(fileContent);
            } catch (readError) {
                console.log('File does not exist or cannot be read:', readError.message);
                // If the file doesn't exist, we'll create it
            }

            // Prepare updated data, merging with existing data
            const currentData = {
                ...existingData,
                className: name,
                fileId: fileId,
                data: data || existingData.data || {},
                calendar: existingData.calendar || "",
                currentWeek: currentWeek || existingData.currentWeek || new Date().toISOString(),
                permanentHours: permanentHours || existingData.permanentHours || {}
            };

            // Write the temp file first
            await fs.writeFile(
                tempPath,
                JSON.stringify(currentData, null, 2)
            );

            // Then try to rename it
            await fs.rename(tempPath, filePath);

            res.json({ success: true, fileId });
        } catch (error) {
            // Clean up temp file if it exists
            try {
                await fs.unlink(tempPath);
            } catch (unlinkError) {
                // Ignore unlink errors
            }
            throw error;
        }
    } catch (error) {
        console.error('Failed to update timetable:', error);
        return res.status(500).json({ success: false, error: 'Failed to update timetable' });
    }
});

app.get('/api/timetables/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const files = await fs.readdir(DATA_DIR);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
                const timetable = JSON.parse(data);
                if (timetable.className === name) {
                    res.json(timetable);
                    return;
                }
            }
        }
        res.status(404).json({ success: false, error: 'Timetable not found' });
    } catch (error) {
        console.error('Failed to read timetable:', error);
        res.status(500).json({ success: false, error: 'Failed to read timetable' });
    }
});

// Add new route before the initialization
app.delete('/api/timetables', async (req, res) => {
    try {
        const files = await fs.readdir(DATA_DIR);
        for (const file of files) {
            if (file.endsWith('.json')) {
                await fs.unlink(path.join(DATA_DIR, file));
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to reset timetables:', error);
        res.status(500).json({ success: false, error: 'Failed to reset timetables' });
    }
});

// Add this function after initializeDataStorage
async function initializeUsersDirectory() {
    try {
        // First create parent directories if they don't exist
        const parentDir = path.dirname(USERS_DIR);
        await fs.mkdir(parentDir, { recursive: true });
        
        // Then create Users directory
        await fs.mkdir(USERS_DIR, { recursive: true });
        console.log(`Users directory initialized: ${USERS_DIR}`);
        return true;
    } catch (error) {
        console.error('Failed to initialize users directory:', error);
        throw error; // Re-throw to handle in calling function
    }
}

// Update the user creation endpoint
app.post('/api/users', async (req, res) => {
    try {
        const { name, abbreviation, password, isAdmin } = req.body;
        
        // Input validation
        if (!name?.trim() || !abbreviation?.trim() || !password?.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required' 
            });
        }

        // Check for existing user right away
        try {
            const files = await fs.readdir(USERS_DIR);
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const data = await fs.readFile(path.join(USERS_DIR, file), 'utf8');
                const userData = JSON.parse(data);
                if (userData.abbreviation === abbreviation.trim()) {
                    return res.status(409).json({ 
                        success: false, 
                        error: 'User with this abbreviation already exists' 
                    });
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        // Create user data
        const userId = generateFileId();
        const userData = {
            id: userId,
            name: name.trim(),
            abbreviation: abbreviation.trim(),
            password: password.trim(),
            isAdmin: Boolean(isAdmin), // Add isAdmin property
            createdAt: new Date().toISOString()
        };

        // Save user data
        const filename = `${userId}.json`;
        await fs.writeFile(
            path.join(USERS_DIR, filename),
            JSON.stringify(userData, null, 2)
        );

        // Return success response
        const { password: _, ...userWithoutPassword } = userData;
        res.status(201).json({ 
            success: true, 
            user: userWithoutPassword 
        });
        
    } catch (error) {
        console.error('Failed to create user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error while creating user' 
        });
    }
});

// Update users listing endpoint to handle errors better
app.get('/api/users', async (req, res) => {
    try {
        console.log('Request received for /api/users');
        
        // Ensure Users directory exists
        await fs.mkdir(USERS_DIR, { recursive: true });
        
        console.log('Reading users from directory:', USERS_DIR);
        let files;
        try {
            files = await fs.readdir(USERS_DIR);
            console.log(`Found ${files.length} files in users directory:`, files);
        } catch (readDirError) {
            console.error('Error reading users directory:', readDirError);
            
            // If directory doesn't exist or can't be read, create it
            if (readDirError.code === 'ENOENT') {
                await fs.mkdir(USERS_DIR, { recursive: true });
                console.log('Created users directory');
                files = [];
            } else {
                throw readDirError;
            }
        }
        
        // If no users exist yet, create the default admin user
        if (!files || files.length === 0 || !files.some(f => f.endsWith('.json'))) {
            console.log('No users found, creating default admin user');
            
            // Create default admin user
            const userId = generateFileId();
            const defaultUser = {
                id: userId,
                name: 'Admin User',
                abbreviation: 'admin',
                password: 'admin',
                isAdmin: true,
                createdAt: new Date().toISOString()
            };
            
            const userFilename = `${userId}.json`;
            const userFilePath = path.join(USERS_DIR, userFilename);
            
            await fs.writeFile(
                userFilePath,
                JSON.stringify(defaultUser, null, 2)
            );
            
            console.log('Created default admin user at:', userFilePath);
            
            // Update files list
            files = [userFilename];
        }
        
        const users = [];
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        console.log(`Processing ${jsonFiles.length} JSON files`);
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(USERS_DIR, file);
                console.log('Reading user file:', filePath);
                
                const data = await fs.readFile(filePath, 'utf8');
                const userData = JSON.parse(data);
                
                // Don't send password to client
                const { password, ...userWithoutPassword } = userData;
                users.push(userWithoutPassword);
                
                console.log(`Processed user: ${userWithoutPassword.name}, isAdmin: ${userWithoutPassword.isAdmin}`);
            } catch (fileError) {
                console.error(`Error reading user file ${file}:`, fileError);
                continue;
            }
        }
        
        console.log(`Sending ${users.length} users to client`);
        res.json(users);
    } catch (error) {
        console.error('Failed to list users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to list users: ' + error.message 
        });
    }
});

// Update login endpoint to add fallback for debug user
app.post('/api/users/login', async (req, res) => {
    try {
        console.log('Login attempt received for:', req.body.abbreviation);
        const { abbreviation, password } = req.body;
        
        // Special case for debug user
        if (abbreviation === 'debug' && password === 'debug') {
            console.log('Debug user login successful');
            return res.json({
                id: 'debug',
                name: 'Debug User',
                abbreviation: 'debug',
                isAdmin: true
            });
        }
        
        // Ensure Users directory exists
        await fs.mkdir(USERS_DIR, { recursive: true });
        
        const files = await fs.readdir(USERS_DIR);
        console.log(`Searching through ${files.length} user files`);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(path.join(USERS_DIR, file), 'utf8');
                const userData = JSON.parse(data);
                if (userData.abbreviation === abbreviation) {
                    if (userData.password === password) {
                        console.log(`Login successful for: ${userData.name}`);
                        const { password: _, ...userWithoutPassword } = userData;
                        return res.json(userWithoutPassword);
                    } else {
                        console.log('Invalid password for:', abbreviation);
                        return res.status(401).json({
                            success: false,
                            error: 'Invalid password'
                        });
                    }
                }
            }
        }
        
        console.log('User not found:', abbreviation);
        res.status(401).json({
            success: false,
            error: 'User not found'
        });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login'
        });
    }
});

// Add this function to create default data if none exists
async function createDefaultDataIfNeeded() {
    try {
        // Check if users directory exists and is empty
        await fs.mkdir(USERS_DIR, { recursive: true });
        const userFiles = await fs.readdir(USERS_DIR);
        const jsonUserFiles = userFiles.filter(file => file.endsWith('.json'));
        
        if (jsonUserFiles.length === 0) {
            console.log('No users found, creating default admin user');
            
            // Create default admin user
            const userId = generateFileId();
            const defaultUser = {
                id: userId,
                name: 'Admin User',
                abbreviation: 'admin',
                password: 'admin',  // In a real app, this should be hashed
                isAdmin: true,
                createdAt: new Date().toISOString()
            };
            
            await fs.writeFile(
                path.join(USERS_DIR, `${userId}.json`),
                JSON.stringify(defaultUser, null, 2)
            );
            
            console.log('Created default admin user');
        }
        
        // Check if timetables directory exists and is empty
        await fs.mkdir(DATA_DIR, { recursive: true });
        const timetableFiles = await fs.readdir(DATA_DIR);
        const jsonTimetableFiles = timetableFiles.filter(file => file.endsWith('.json'));
        
        if (jsonTimetableFiles.length === 0) {
            console.log('No timetables found, creating example timetable');
            
            // Create example timetable
            const fileId = generateFileId();
            const exampleTimetable = {
                className: 'Example Class',
                fileId: fileId,
                data: {},
                currentWeek: new Date().toISOString(),
                permanentHours: {},
                createdAt: new Date().toISOString()
            };
            
            await fs.writeFile(
                path.join(DATA_DIR, `${fileId}.json`),
                JSON.stringify(exampleTimetable, null, 2)
            );
            
            console.log('Created example timetable');
        }
        
        return true;
    } catch (error) {
        console.error('Error creating default data:', error);
        return false;
    }
}

// Update initialization function to create default data
async function initialize() {
    try {
        await initializeDataStorage();
        await initializeUsersDirectory();
        
        // Create default data if needed
        await createDefaultDataIfNeeded();
        
        app.listen(port, '0.0.0.0', () => {
            console.log(`Server running at http://${host}:${port}/`);
            console.log(`Data loaded from ${DATA_DIR}`);
            console.log(`Users directory: ${USERS_DIR}`);
        });
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
}

// Replace the initialization at the bottom with our new function
initialize();

// Add function to show account creation popup
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
            <div class="input-group">
                <label for="account-admin">
                    <input type="checkbox" id="account-admin">
                    Admin Privileges
                </label>
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
    document.getElementById('account-admin').checked = false;
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
