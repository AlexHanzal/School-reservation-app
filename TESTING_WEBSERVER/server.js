const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 80;
const DOMAIN = 'localprojecttest.cz';
const SCRIPT_DIR = path.join(__dirname, 'SCRIPT');

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from SCRIPT directory for frontend projects
app.use('/scripts', express.static(SCRIPT_DIR));

// Middleware for logging requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.get('host')}`);
    next();
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to serve frontend projects
app.get('/script/:projectName', (req, res) => {
    const projectName = req.params.projectName;
    const projectPath = path.join(SCRIPT_DIR, projectName);
    
    if (!fs.existsSync(projectPath)) {
        return res.status(404).send('Project not found');
    }
    
    // Look for index.html first, then index.htm
    const indexHtml = path.join(projectPath, 'index.html');
    const indexHtm = path.join(projectPath, 'index.htm');
    
    if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
    } else if (fs.existsSync(indexHtm)) {
        res.sendFile(indexHtm);
    } else {
        res.status(404).send('No index file found in project');
    }
});

// API endpoint for domain status
app.get('/api/domain-status', (req, res) => {
    const localIP = getLocalIP();
    res.json({
        domain: DOMAIN,
        host: req.get('host'),
        localIP: localIP,
        timestamp: new Date().toISOString(),
        isCustomDomain: req.get('host').includes(DOMAIN),
        serverInfo: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname()
        }
    });
});

// API endpoint to list available scripts and projects
app.get('/api/scripts', (req, res) => {
    try {
        if (!fs.existsSync(SCRIPT_DIR)) {
            fs.mkdirSync(SCRIPT_DIR, { recursive: true });
        }
        
        const items = fs.readdirSync(SCRIPT_DIR)
            .map(item => {
                const itemPath = path.join(SCRIPT_DIR, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // Check if it's a frontend project
                    const hasIndex = fs.existsSync(path.join(itemPath, 'index.html')) || 
                                   fs.existsSync(path.join(itemPath, 'index.htm'));
                    return {
                        name: item,
                        type: hasIndex ? 'frontend-project' : 'directory',
                        size: 'Directory',
                        modified: stats.mtime.toISOString(),
                        hasIndex: hasIndex
                    };
                } else if (item.endsWith('.js')) {
                    return {
                        name: item,
                        type: 'node-script',
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    };
                } else if (item.endsWith('.html') || item.endsWith('.htm')) {
                    return {
                        name: item,
                        type: 'html-file',
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    };
                }
                return null;
            })
            .filter(item => item !== null);
        
        res.json({ items: items });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list scripts', details: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('\n' + '='.repeat(50));
    console.log('🚀 SERVER RUNNING SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`📍 Local access:     http://localhost${PORT === 80 ? '' : ':' + PORT}`);
    console.log(`🌐 Custom domain:    http://${DOMAIN}${PORT === 80 ? '' : ':' + PORT}`);
    console.log(`🖥️  Network access:   http://${localIP}${PORT === 80 ? '' : ':' + PORT}`);
    console.log(`📁 Script directory: ${SCRIPT_DIR}`);
    console.log(`🔧 Health check:     http://localhost${PORT === 80 ? '' : ':' + PORT}/health`);
    console.log('='.repeat(50));
    console.log('Press Ctrl+C to stop the server\n');
});
