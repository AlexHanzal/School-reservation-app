const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const app = express();

// CORS middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'src')));
app.use('/css', express.static(path.join(__dirname, 'src/css')));
app.use('/js', express.static(path.join(__dirname, 'src/js')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/outside/index.html'));
});

// Ensure timetables directory exists
async function ensureDirectory() {
    const dir = path.join(__dirname, 'data/timetables');
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    return dir;
}

// File handling functions
async function readJSONFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
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

async function writeJSONFile(filePath, data) {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonStr, 'utf8');
}

// API Routes
app.get('/api/timetables', async (req, res) => {
    try {
        const dir = await ensureDirectory();
        const files = await fs.readdir(dir);
        const timetableNames = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.slice(0, -5));
        res.json(timetableNames);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list timetables' });
    }
});

app.post('/api/timetables', async (req, res) => {
    try {
        const dir = await ensureDirectory();
        const { name } = req.body;
        const filePath = path.join(dir, `${name}.json`);
        const emptyData = {
            data: {},
            permanentHours: {},
            calendar: "",
            currentWeek: new Date().toISOString()
        };
        await writeJSONFile(filePath, emptyData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create timetable' });
    }
});

app.get('/api/timetables/:name', async (req, res) => {
    try {
        const dir = await ensureDirectory();
        const filePath = path.join(dir, `${req.params.name}.json`);
        const data = await readJSONFile(filePath);
        res.json(data);
    } catch (error) {
        res.status(404).json({ error: 'Timetable not found' });
    }
});

app.put('/api/timetables/:name', async (req, res) => {
    try {
        const dir = await ensureDirectory();
        const filePath = path.join(dir, `${req.params.name}.json`);
        await writeJSONFile(filePath, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update timetable' });
    }
});

app.delete('/api/timetables/:name', async (req, res) => {
    try {
        const dir = await ensureDirectory();
        const filePath = path.join(dir, `${req.params.name}.json`);
        await fs.unlink(filePath);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete timetable' });
    }
});

const port = 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}/`);
});
