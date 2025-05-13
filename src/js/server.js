const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;

// Debug logging
const debug = (...args) => console.log('[Debug]', ...args);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    debug(`${req.method} ${req.url}`);
    next();
});

// Configure base directory
const baseDir = path.resolve(__dirname, '../..');
const srcDir = path.join(baseDir, 'src');

debug('Base directory:', baseDir);
debug('Source directory:', srcDir);

// Serve static files from src directory
app.use('/src', express.static(srcDir));
app.use('/css', express.static(path.join(srcDir, 'css')));
app.use('/js', express.static(path.join(srcDir, 'js')));
app.use('/', express.static(path.join(srcDir, 'html')));

let timetablesData = {};

// API routes
app.get('/api/timetables', (req, res) => {
    try {
        res.json(timetablesData);
    } catch (error) {
        console.error('Error getting timetables:', error);
        res.status(500).json({ error: 'Failed to get timetables' });
    }
});

app.post('/api/timetables', (req, res) => {
    try {
        const { name, data } = req.body;
        if (!name || !data) {
            return res.status(400).json({ error: 'Missing name or data' });
        }
        timetablesData[name] = data;
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving timetable:', error);
        res.status(500).json({ error: 'Failed to save timetable' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    debug('Error:', err);
    if (err.code === 'ENOENT') {
        res.status(404).json({ error: 'File not found' });
    } else {
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(srcDir, 'html', 'index.html'), err => {
        if (err) {
            debug('Error serving index.html:', err);
            res.status(500).send('Error loading index.html');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
