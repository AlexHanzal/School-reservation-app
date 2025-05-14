const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const port = 3000;

const DATA_FILE = path.join(__dirname, '../../data/timetables.json');

// Ensure data directory exists
async function initializeDataStorage() {
    const dataDir = path.dirname(DATA_FILE);
    try {
        await fs.mkdir(dataDir, { recursive: true });
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist yet, use empty timetables object
                const emptyData = {};
                await fs.writeFile(DATA_FILE, JSON.stringify(emptyData, null, 2));
                return emptyData;
            }
            throw error;
        }
    } catch (error) {
        console.error('Failed to initialize data storage:', error);
        process.exit(1);
    }
}

// Save timetables to file
async function saveTimetables() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(timetables, null, 2));
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
    res.sendFile(path.join(__dirname, '../html/index.html'));
});

// In-memory storage (now backed by file)
let timetables = {};

// API routes
app.get('/api/timetables', (req, res) => {
    res.json(timetables);
});

app.post('/api/timetables', async (req, res) => {
    const { name } = req.body;
    timetables[name] = {
        data: {},
        calendar: req.body.calendar || null,
        permanentHours: {} // Add storage for permanent hours
    };
    await saveTimetables();
    res.json({ success: true });
});

app.put('/api/timetables/:name', async (req, res) => {
    const { name } = req.params;
    const data = req.body;

    // Ensure we preserve permanent hour data
    if (!data.permanentHours) {
        data.permanentHours = timetables[name]?.permanentHours || {};
    }

    timetables[name] = data;
    await saveTimetables();
    res.json({ success: true });
});

app.get('/api/timetables/:name', (req, res) => {
    const { name } = req.params;
    const timetable = timetables[name] || null;
    
    // Include permanent hours in response
    if (timetable && !timetable.permanentHours) {
        timetable.permanentHours = {};
    }
    
    res.json(timetable);
});

// Initialize storage and start server
initializeDataStorage().then((loadedData) => {
    timetables = loadedData; // Assign loaded data to timetables
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Data loaded from ${DATA_FILE}`);
    });
});
