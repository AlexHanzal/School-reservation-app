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

// Update initialization function
async function initializeDataStorage() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const files = await fs.readdir(DATA_DIR);
        const timetables = {};
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const name = file.replace('.json', '');
                const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
                timetables[name] = JSON.parse(data);
            }
        }
        return timetables;
    } catch (error) {
        console.error('Failed to initialize data storage:', error);
        process.exit(1);
    }
}

// Update save function
async function saveTimetables() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        for (const [name, data] of Object.entries(timetables)) {
            const filename = `${name}.json`;
            await fs.writeFile(
                path.join(DATA_DIR, filename),
                JSON.stringify(data, null, 2)
            );
        }
    } catch (error) {
        console.error('Failed to save timetables:', error);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Serve static files from src directory
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../outside/index.html'));
});

// In-memory storage (now backed by file)
let timetables = {};

// API routes
app.get('/api/timetables', async (req, res) => {
    try {
        const files = await fs.readdir(DATA_DIR);
        const timetableNames = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
        res.json(timetableNames);
    } catch (error) {
        console.error('Failed to list timetables:', error);
        res.status(500).json({ success: false, error: 'Failed to list timetables' });
    }
});

app.post('/api/timetables', async (req, res) => {
    const { name } = req.body;
    const timetableData = {
        data: {},
        calendar: null,
        currentWeek: new Date().toISOString(),
        permanentHours: {}
    };
    
    try {
        await fs.writeFile(
            path.join(DATA_DIR, `${name}.json`),
            JSON.stringify(timetableData, null, 2)
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to create timetable:', error);
        res.status(500).json({ success: false, error: 'Failed to create timetable' });
    }
});

app.put('/api/timetables/:name', async (req, res) => {
    const { name } = req.params;
    const data = req.body;

    try {
        await fs.writeFile(
            path.join(DATA_DIR, `${name}.json`),
            JSON.stringify(data, null, 2)
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update timetable:', error);
        res.status(500).json({ success: false, error: 'Failed to update timetable' });
    }
});

app.get('/api/timetables/:name', async (req, res) => {
    const { name } = req.params;
    try {
        const data = await fs.readFile(path.join(DATA_DIR, `${name}.json`), 'utf8');
        const timetable = JSON.parse(data);
        res.json(timetable);
    } catch (error) {
        console.error('Failed to read timetable:', error);
        res.status(404).json({ success: false, error: 'Timetable not found' });
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
