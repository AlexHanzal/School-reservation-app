// ============================================================================
// SERVER CONFIGURATION - Customize these values as needed
// ============================================================================

// Development Mode - Set to true to force localhost for development
const isLocal = true; // Set to true for local development, false for production

// Server Configuration
const SERVER_CONFIG = {
    // Port Configuration
    // Use "automatic" to find an available port starting from 3000
    // Or specify a number like 3000, 8080, etc.
    port: "automatic", // Options: "automatic", 3000, 8080, etc.
    
    // Domain/Host Configuration  
    // Use "automatic" to detect the server's IP address
    // Or specify a domain like "myserver.com", "192.168.1.100", etc.
    domain: "automatic", // Options: "automatic", "myserver.com", "192.168.1.100", etc.
    
    // Application Name (used in API responses and logs)
    appName: "School Reservation System",
    
    // API Version
    apiVersion: "1.0",
    
    // CORS Settings
    corsOrigins: "all", // Options: "all", ["http://domain1.com", "http://domain2.com"]
    
    // Data Directory Names (relative to project root)
    dataDirectories: {
        timetables: "data/timetables",
        users: "data/Users"
    },
    
    // Frontend Configuration (for development)
    serveFrontend: true, // Set to true to serve frontend files directly from server
    frontendPath: "src", // Path to frontend files relative to project root
};

// ============================================================================
// END CONFIGURATION - Don't modify below unless you know what you're doing
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const net = require('net');
const app = express();

// Function to find an available port starting from a given port
async function findAvailablePort(startPort = 3000) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

// Function to get local IP address (Windows compatible)
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    
    // Priority order for Windows: Ethernet, Wi-Fi, then others
    const priorityInterfaces = ['Ethernet', 'Wi-Fi', 'Local Area Connection'];
    
    // First try priority interfaces
    for (const priorityName of priorityInterfaces) {
        for (const interfaceName of Object.keys(interfaces)) {
            if (interfaceName.includes(priorityName)) {
                for (const interface of interfaces[interfaceName]) {
                    if (!interface.internal && interface.family === 'IPv4') {
                        return interface.address;
                    }
                }
            }
        }
    }
    
    // Fallback to any non-internal IPv4 address
    for (const interfaceName of Object.keys(interfaces)) {
        for (const interface of interfaces[interfaceName]) {
            if (!interface.internal && interface.family === 'IPv4') {
                return interface.address;
            }
        }
    }
    
    return 'localhost'; // Final fallback
}

// Function to resolve configuration values
async function resolveConfig() {
    const config = { ...SERVER_CONFIG };
    
    // Override everything to localhost if in local development mode
    if (isLocal) {
        console.log('🔧 Local development mode enabled - using localhost');
        config.resolvedHost = 'localhost';
        config.resolvedPort = config.port === "automatic" ? await findAvailablePort(3000) : config.port;
        return config;
    }
    
    // Resolve port
    if (config.port === "automatic") {
        config.resolvedPort = await findAvailablePort(3000);
        console.log(`🔍 Automatic port detection: Found available port ${config.resolvedPort}`);
    } else {
        config.resolvedPort = config.port;
    }
    
    // Resolve host/domain
    if (config.domain === "automatic") {
        config.resolvedHost = getLocalIpAddress();
        console.log(`🔍 Automatic domain detection: Using IP ${config.resolvedHost}`);
    } else {
        config.resolvedHost = config.domain;
    }
    
    return config;
}

// Initialize configuration
let resolvedConfig;
let DATA_DIR, USERS_DIR; // Declare these at module level

// Initialize data directories using resolved config
async function initializeDataDirectories() {
    const DATA_DIR = path.resolve(process.cwd(), resolvedConfig.dataDirectories.timetables);
    const USERS_DIR = path.resolve(process.cwd(), resolvedConfig.dataDirectories.users);
    
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(USERS_DIR, { recursive: true });
        console.log(`📁 Data directories initialized:`);
        console.log(`   - Timetables: ${DATA_DIR}`);
        console.log(`   - Users: ${USERS_DIR}`);
        return { DATA_DIR, USERS_DIR };
    } catch (error) {
        console.error('❌ Failed to initialize data directories:', error);
        throw error;
    }
}

// Configure CORS based on settings
function configureCors() {
    if (resolvedConfig.corsOrigins === "all") {
        return cors({
            origin: function (origin, callback) {
                // Allow requests with no origin (mobile apps, curl, etc.)
                if (!origin) return callback(null, true);
                // Allow any origin in "all" mode
                return callback(null, true);
            },
            credentials: true
        });
    } else if (Array.isArray(resolvedConfig.corsOrigins)) {
        return cors({
            origin: function (origin, callback) {
                if (!origin) return callback(null, true);
                if (resolvedConfig.corsOrigins.indexOf(origin) !== -1) {
                    return callback(null, true);
                }
                return callback(new Error('Not allowed by CORS'));
            },
            credentials: true
        });
    } else {
        return cors();
    }
}

// Function to generate random file ID
function generateFileId(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Setup middleware after config is resolved
function setupMiddleware() {
    app.use(configureCors());
    app.use(express.json());
    
    // Serve frontend files if enabled (for development)
    if (resolvedConfig.serveFrontend) {
        const frontendPath = path.join(process.cwd(), resolvedConfig.frontendPath);
        app.use(express.static(frontendPath));
        console.log('📡 Frontend serving enabled from:', frontendPath);
        
        // Serve index.html at root for convenience
        app.get('/app', (req, res) => {
            res.sendFile(path.join(frontendPath, 'outside', 'index.html'));
        });
    } else {
        console.log('📡 Static file serving disabled - frontend should be served separately');
    }
}

// Update root route to return configuration info or redirect to app
app.get('/', (req, res) => {
    const response = {
        message: resolvedConfig.appName + ' API',
        version: resolvedConfig.apiVersion,
        server: {
            host: resolvedConfig.resolvedHost,
            port: resolvedConfig.resolvedPort,
            isLocal: isLocal
        },
        endpoints: {
            timetables: '/api/timetables',
            users: '/api/users'
        },
        status: 'running'
    };
    
    if (resolvedConfig.serveFrontend) {
        response.frontend = {
            url: `http://${resolvedConfig.resolvedHost}:${resolvedConfig.resolvedPort}/app`,
            message: "Frontend is available at /app"
        };
    }
    
    res.json(response);
});

// Update initialization function to use fileId for lookups
async function initializeDataStorage(DATA_DIR) {
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

// Add the missing initializeUsersDirectory function
async function initializeUsersDirectory(USERS_DIR) {
    try {
        const parentDir = path.dirname(USERS_DIR);
        await fs.mkdir(parentDir, { recursive: true });
        await fs.mkdir(USERS_DIR, { recursive: true });
        console.log(`Users directory initialized: ${USERS_DIR}`);
        return true;
    } catch (error) {
        console.error('Failed to initialize users directory:', error);
        throw error;
    }
}

// In-memory storage (now backed by file)
let timetables = {};

// Move API routes inside the initialize function after directories are set up
async function initialize() {
    try {
        console.log('🚀 Starting ' + SERVER_CONFIG.appName + '...');
        console.log('⚙️  Resolving configuration...');
        
        // Resolve configuration first
        resolvedConfig = await resolveConfig();
        
        // Initialize data storage
        const directories = await initializeDataDirectories();
        DATA_DIR = directories.DATA_DIR;
        USERS_DIR = directories.USERS_DIR;
        
        // Make DATA_DIR and USERS_DIR globally available for API routes
        global.DATA_DIR = DATA_DIR;
        global.USERS_DIR = USERS_DIR;
        
        // Setup middleware with resolved config
        setupMiddleware();
        
        // Initialize data storage
        await initializeDataStorage(DATA_DIR);
        await initializeUsersDirectory(USERS_DIR);
        
        // Define API routes AFTER directories are initialized
        setupAPIRoutes();
        
        // Start server
        app.listen(resolvedConfig.resolvedPort, '0.0.0.0', () => {
            console.log('✅ Server successfully started!');
            console.log('📊 Configuration Summary:');
            console.log(`   - Application: ${resolvedConfig.appName} v${resolvedConfig.apiVersion}`);
            console.log(`   - Local Mode: ${isLocal ? 'ENABLED' : 'DISABLED'}`);
            console.log(`   - Host: ${resolvedConfig.resolvedHost}`);
            console.log(`   - Port: ${resolvedConfig.resolvedPort}`);
            console.log(`   - URL: http://${resolvedConfig.resolvedHost}:${resolvedConfig.resolvedPort}/`);
            console.log(`   - API Endpoint: http://${resolvedConfig.resolvedHost}:${resolvedConfig.resolvedPort}/api`);
            console.log(`   - CORS: ${resolvedConfig.corsOrigins === "all" ? "Allow All Origins" : "Restricted Origins"}`);
            
            if (resolvedConfig.serveFrontend) {
                console.log('');
                console.log('🌐 Frontend Access:');
                console.log(`   - Frontend URL: http://${resolvedConfig.resolvedHost}:${resolvedConfig.resolvedPort}/app`);
                console.log(`   - Open this URL in your browser to access the application`);
            } else {
                console.log('');
                console.log('🌐 Frontend Configuration:');
                console.log(`   Set window.API_BASE_URL = "http://${resolvedConfig.resolvedHost}:${resolvedConfig.resolvedPort}"`);
            }
            console.log('');
        });
    } catch (error) {
        console.error('❌ Server initialization failed:', error);
        process.exit(1);
    }
}

// Move all API routes into a separate function
function setupAPIRoutes() {
    // API routes
    app.get('/api/timetables', async (req, res) => {
        try {
            const files = await fs.readdir(DATA_DIR);
            const uniqueTimetables = new Map();
            
            // Sort files by creation time to get newest first
            const fileStats = await Promise.all(
                files.filter(f => f.endsWith('.json'))
                    .map(async file => {
                        const filePath = path.join(DATA_DIR, file);
                        const stat = await fs.stat(filePath);
                        const data = await fs.readFile(filePath, 'utf8');
                        return {
                            file,
                            data: JSON.parse(data),
                            mtime: stat.mtime
                        };
                    })
            );
            
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

    app.put('/api/timetables/:name', async (req, res) => {
        try {
            const { name } = req.params;
            const { fileId, data } = req.body;

            if (!fileId) {
                return res.status(400).json({ success: false, error: 'FileId is required' });
            }

            const filePath = path.join(DATA_DIR, `${fileId}.json`);
            const tempPath = path.join(DATA_DIR, `${fileId}_temp.json`);

            // Ensure the directory exists
            await fs.mkdir(DATA_DIR, { recursive: true });

            try {
                // First write to temporary file
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
                isAdmin: isAdmin === true,
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

    app.get('/api/users', async (req, res) => {
        try {
            // Ensure Users directory exists
            await fs.mkdir(USERS_DIR, { recursive: true });
            
            console.log('Reading users from:', USERS_DIR);
            const files = await fs.readdir(USERS_DIR);
            const users = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(USERS_DIR, file);
                        console.log('Reading user file:', filePath);
                        const data = await fs.readFile(filePath, 'utf8');
                        const userData = JSON.parse(data);
                        // Don't send password to client
                        const { password, ...userWithoutPassword } = userData;
                        users.push(userWithoutPassword);
                    } catch (error) {
                        console.error(`Error reading user file ${file}:`, error);
                        continue;
                    }
                }
            }
            
            console.log('Sending users:', users.length);
            res.json(users);
        } catch (error) {
            console.error('Failed to list users:', error);
            res.status(500).json({ success: false, error: 'Failed to list users' });
        }
    });

    app.post('/api/users/login', async (req, res) => {
        try {
            const { abbreviation, password } = req.body;
            
            console.log('Login attempt for:', abbreviation);
            console.log('Looking in directory:', USERS_DIR);
            
            const files = await fs.readdir(USERS_DIR);
            console.log('Found user files:', files);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = await fs.readFile(path.join(USERS_DIR, file), 'utf8');
                    const userData = JSON.parse(data);
                    console.log('Checking user:', userData.abbreviation);
                    
                    if (userData.abbreviation === abbreviation) {
                        if (userData.password === password) {
                            const { password: _, ...userWithoutPassword } = userData;
                            console.log('Login successful for:', abbreviation);
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
}

// Start the server - THIS IS CRITICAL!
initialize().catch(error => {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
});
