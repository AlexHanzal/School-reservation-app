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
const DATA_DIR = path.join(__dirname, '../../data/timetables');

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
let timetables = {};

// API routes
app.get('/api/timetables', async (req, res) => {
    try {
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

// Update the PUT route to preserve all existing data
app.put('/api/timetables/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { fileId, data } = req.body;

        if (!fileId) {
            return res.status(400).json({ success: false, error: 'FileId is required' });
        }

        const filePath = path.join(DATA_DIR, `${fileId}.json`);
        const tempPath = path.join(DATA_DIR, `${fileId}_temp.json`);

        try {
            // Create new data structure with only necessary data
            const currentData = {
                className: name,
                fileId: fileId,
                data: data || {},  // Only preserve the data object
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

// Initialize storage and start server
initializeDataStorage().then((loadedData) => {
    timetables = loadedData; // Assign loaded data to timetables
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server running at http://${host}:${port}/`);
        console.log(`Data loaded from ${DATA_DIR}`);
    });
});
