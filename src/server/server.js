const express = require('express');
const app = express();
const fs = require('fs').promises;
const path = require('path');

// Update CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});
app.use(express.json());

// Add this to handle all CORS preflight requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});

// Ensure timetables directory exists
async function ensureDirectory() {
    const dir = path.join(__dirname, '../../data/timetables');
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    return dir;
}

// Update reading JSON files
async function readJSONFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error('JSON Parse error:', parseError);
            console.log('Content causing error:', content);
            // Return default data if parse fails
            return {
                data: {},
                permanentHours: {},
                calendar: "",
                currentWeek: new Date().toISOString()
            };
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            const emptyData = {
                data: {},
                permanentHours: {},
                calendar: "",
                currentWeek: new Date().toISOString()
            };
            await fs.writeFile(filePath, JSON.stringify(emptyData, null, 2), 'utf8');
            return emptyData;
        }
        throw error;
    }
}

// Update writing JSON files
async function writeJSONFile(filePath, data) {
    try {
        let jsonStr;
        if (typeof data === 'string') {
            // If data is already a string, use it directly
            jsonStr = data;
        } else {
            // Otherwise, stringify the object
            jsonStr = JSON.stringify(data, null, 2);
        }
        await fs.writeFile(filePath, jsonStr, 'utf8');
    } catch (error) {
        console.error('Error writing file:', error);
        throw error;
    }
}

app.get('/api/timetables/:name', async (req, res) => {
    try {
        await ensureDirectory();
        const name = req.params.name;
        const filePath = path.join(__dirname, '../../data/timetables', `${name}.json`);
        console.log('Reading file:', filePath);
        const data = await readJSONFile(filePath);
        console.log('Read data:', data);
        res.setHeader('Content-Type', 'application/json');
        res.json(data);
    } catch (error) {
        console.error('Error reading timetable:', error);
        res.status(500).json({ error: 'Failed to read timetable' });
    }
});

// Add this route to get all timetables
app.get('/api/timetables', async (req, res) => {
    try {
        const dir = await ensureDirectory();
        const files = await fs.readdir(dir);
        const timetableNames = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.slice(0, -5)); // Remove .json extension
        res.json(timetableNames);
    } catch (error) {
        console.error('Error listing timetables:', error);
        res.status(500).json({ error: 'Failed to list timetables' });
    }
});

// Update the rename endpoint
app.put('/api/timetables/:name/rename', async (req, res) => {
    try {
        const oldName = decodeURIComponent(req.params.name);
        const { newName } = req.body;
        
        console.log('Rename request received:', { oldName, newName });
        
        if (!oldName || !newName) {
            return res.status(400).json({ success: false, error: 'Both old and new names are required' });
        }

        const dir = await ensureDirectory();
        const oldPath = path.join(dir, `${oldName}.json`);
        const newPath = path.join(dir, `${newName}.json`);

        // Simple file rename operation
        try {
            await fs.rename(oldPath, newPath);
            res.json({ success: true });
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.status(404).json({ success: false, error: 'Original file not found' });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ success: false, error: 'Failed to rename file' });
    }
});

app.delete('/api/timetables/:name', async (req, res) => {
    try {
        const name = req.params.name;
        const filePath = path.join(__dirname, '../../data/timetables', `${name}.json`);

        // Delete the file
        await fs.unlink(filePath);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting timetable:', error);
        res.status(500).json({ error: 'Failed to delete timetable' });
    }
});

// DELETE timetable by fileId
app.delete('/api/timetables/:fileId', (req, res) => {
    const fileId = req.params.fileId;
    const timetableDir = path.join(__dirname, '../../data/timetables');
    const filePath = path.join(timetableDir, `${fileId}.json`);
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(404).json({ success: false, message: 'Timetable not found' });
        }
        res.json({ success: true, message: 'Timetable deleted' });
    });
});

// Helper to generate a random string
function generateRandomId(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// POST create new timetable (class)
app.post('/api/timetables', async (req, res) => {
    try {
        const randomId = generateRandomId(10);
        const dir = await ensureDirectory();
        const filePath = path.join(dir, `${randomId}.json`);
        const timetableData = {
            className: randomId,
            fileId: randomId,
            data: {},
            permanentHours: {},
            calendar: '',
            currentWeek: new Date().toISOString()
        };
        await writeJSONFile(filePath, timetableData);
        res.json({ success: true, fileId: randomId, className: randomId });
    } catch (error) {
        console.error('Error creating timetable:', error);
        res.status(500).json({ success: false, error: 'Failed to create timetable' });
    }
});

const accountsDir = path.join(__dirname, '../../data/accounts');

// Ensure accounts directory exists
async function ensureAccountsDirectory() {
    try {
        await fs.access(accountsDir);
    } catch {
        await fs.mkdir(accountsDir, { recursive: true });
    }
}

// POST create new account
app.post('/api/accounts', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    await ensureAccountsDirectory();
    const filePath = path.join(accountsDir, `${username}.json`);
    try {
        // Check if account already exists
        try {
            await fs.access(filePath);
            return res.status(409).json({ success: false, error: 'Account already exists' });
        } catch {}
        // Save account data
        await fs.writeFile(filePath, JSON.stringify({ username, password }, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to save account' });
    }
});

// Add at the bottom of the file
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});