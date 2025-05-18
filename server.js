const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
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
const DATA_DIR = path.join(__dirname, 'data/timetables');
const ACCOUNTS_DIR = path.join(__dirname, 'data/accounts');

// Function to generate random file ID
function generateFileId(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Ensure directory exists
async function ensureDirectory(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
    return dirPath;
}

// Middleware
app.use(cors());
app.use(express.json());
// Fix static file serving path
app.use(express.static(path.join(__dirname, 'School-reservation-app-v_0.11.6/src')));

// Root route
app.get('/', (req, res) => {
    // Try to send the index.html file from the correct location (in the outside directory)
    const indexPath = path.join(__dirname, 'School-reservation-app-v_0.11.6/src/outside/index.html');
    fs.access(indexPath, fs.constants.F_OK)
        .then(() => {
            res.sendFile(indexPath);
        })
        .catch(() => {
            // Fall back to simple response if file not found
            res.send(`
                <h1>Server is running!</h1>
                <p>Index.html file could not be found at ${indexPath}</p>
                <p>Your API endpoints are functional. Access your app directly from the HTML file or adjust the server paths.</p>
            `);
        });
});

// Initialize data storage
async function initializeDataStorage() {
    try {
        await ensureDirectory(DATA_DIR);
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
        return {};
    }
}

// In-memory storage (now backed by file)
let timetables = {};

// API ROUTES

// List all timetables
app.get('/api/timetables', async (req, res) => {
    try {
        await ensureDirectory(DATA_DIR);
        const files = await fs.readdir(DATA_DIR);
        const timetables = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
                const timetable = JSON.parse(data);
                if (timetable.className) {
                    timetables.push({
                        className: timetable.className,
                        fileId: timetable.fileId
                    });
                }
            }
        }
        res.json(timetables.map(t => t.className));
    } catch (error) {
        console.error('Failed to list timetables:', error);
        res.status(500).json({ success: false, error: 'Failed to list timetables' });
    }
});

// Create new timetable
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
        await ensureDirectory(DATA_DIR);
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

// Update timetable
app.put('/api/timetables/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { fileId, data } = req.body;

        if (!fileId) {
            return res.status(400).json({ success: false, error: 'FileId is required' });
        }

        await ensureDirectory(DATA_DIR);
        const filePath = path.join(DATA_DIR, `${fileId}.json`);
        const tempPath = path.join(DATA_DIR, `${fileId}_temp.json`);

        try {
            // Create new data structure with only necessary data
            const currentData = {
                className: name,
                fileId: fileId,
                data: data || {},
                calendar: "",
                currentWeek: new Date().toISOString(),
                permanentHours: {
                    "0": {},
                    "1": {},
                    "2": {},
                    "3": {},
                    "4": {}
                }
            };

            await fs.writeFile(
                tempPath,
                JSON.stringify(currentData, null, 2)
            );

            await fs.rename(tempPath, filePath);

            res.json({ success: true, fileId });
        } catch (error) {
            await fs.unlink(tempPath).catch(() => {});
            throw error;
        }
    } catch (error) {
        console.error('Failed to update className:', error);
        return res.status(500).json({ success: false, error: 'Failed to update className' });
    }
});

// Get timetable by name
app.get('/api/timetables/:name', async (req, res) => {
    try {
        const { name } = req.params;
        await ensureDirectory(DATA_DIR);
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

// Delete all timetables
app.delete('/api/timetables', async (req, res) => {
    try {
        await ensureDirectory(DATA_DIR);
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

// Delete timetable by fileId
app.delete('/api/timetables/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    try {
        await ensureDirectory(DATA_DIR);
        const filePath = path.join(DATA_DIR, `${fileId}.json`);
        await fs.unlink(filePath);
        res.json({ success: true, message: 'Timetable deleted' });
    } catch (error) {
        console.error('Failed to delete timetable:', error);
        res.status(404).json({ success: false, message: 'Timetable not found' });
    }
});

// Create new account
app.post('/api/accounts', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    try {
        await ensureDirectory(ACCOUNTS_DIR);
        const filePath = path.join(ACCOUNTS_DIR, `${username}.json`);
        
        // Check if account already exists
        try {
            await fs.access(filePath);
            return res.status(409).json({ success: false, error: 'Account already exists' });
        } catch {}
        
        // Save account data
        await fs.writeFile(filePath, JSON.stringify({ username, password }, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        console.error('Account creation error:', err);
        res.status(500).json({ success: false, error: 'Failed to save account' });
    }
});

// List all accounts
app.get('/api/accounts', async (req, res) => {
    try {
        await ensureDirectory(ACCOUNTS_DIR);
        const files = await fs.readdir(ACCOUNTS_DIR);
        const accounts = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const username = file.replace('.json', '');
                accounts.push(username);
            }
        }
        
        res.json(accounts);
    } catch (error) {
        console.error('Failed to list accounts:', error);
        res.status(500).json({ success: false, error: 'Failed to list accounts' });
    }
});

// Delete account
app.delete('/api/accounts/:username', async (req, res) => {
    const username = req.params.username;
    try {
        await ensureDirectory(ACCOUNTS_DIR);
        const filePath = path.join(ACCOUNTS_DIR, `${username}.json`);
        await fs.unlink(filePath);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete account:', error);
        res.status(404).json({ success: false, error: 'Account not found' });
    }
});

// Initialize storage and start server
initializeDataStorage().then((loadedData) => {
    timetables = loadedData;
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server running at http://${host}:${port}/`);
        console.log(`Data storage at ${DATA_DIR}`);
        console.log(`Accounts storage at ${ACCOUNTS_DIR}`);
    });
});