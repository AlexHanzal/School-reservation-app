#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="localprojecttest.cz"
IP="127.0.0.1"
PORT="80"

echo -e "${BLUE}=== Ubuntu Local Domain Website Auto Setup ===${NC}\n"

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root for hosts file modification
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        print_warning "This script needs sudo access to modify /etc/hosts"
        echo "Re-running with sudo..."
        sudo "$0" "$@"
        exit $?
    fi
}

# Install Node.js and npm if not present
install_nodejs() {
    if ! command -v node &> /dev/null; then
        print_warning "Node.js not found. Installing..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        apt-get install -y nodejs
        print_status "Node.js installed"
    else
        print_status "Node.js already installed ($(node --version))"
    fi
}

# Create package.json if it doesn't exist
create_package_json() {
    if [ ! -f "package.json" ]; then
        print_warning "Creating package.json..."
        cat > package.json << 'EOF'
{
  "name": "ubuntu-local-domain-website",
  "version": "1.0.0",
  "description": "Local domain website for Ubuntu testing",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF
        print_status "package.json created"
    fi
}

# Install npm dependencies
install_dependencies() {
    print_warning "Installing npm dependencies..."
    npm install
    print_status "Dependencies installed"
}

# Configure hosts file
setup_hosts() {
    print_warning "Configuring hosts file..."
    
    # Check if entries already exist
    if grep -q "$DOMAIN" /etc/hosts; then
        print_warning "Domain entries already exist in hosts file"
    else
        # Add domain entries
        echo "$IP    $DOMAIN" >> /etc/hosts
        echo "$IP    www.$DOMAIN" >> /etc/hosts
        print_status "Domain entries added to hosts file"
    fi
}

# Configure UFW firewall
setup_firewall() {
    if command -v ufw &> /dev/null; then
        print_warning "Configuring UFW firewall..."
        ufw --force enable
        ufw allow $PORT/tcp
        print_status "Firewall configured for port $PORT"
    else
        print_warning "UFW not installed, skipping firewall configuration"
    fi
}

# Create server.js
create_server() {
    print_warning "Creating server.js..."
    cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 80;
const DOMAIN = 'test.cz';

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

// Middleware for logging requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.get('host')}`);
    next();
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
    console.log(`🔧 Health check:     http://localhost${PORT === 80 ? '' : ':' + PORT}/health`);
    console.log('='.repeat(50));
    console.log('Press Ctrl+C to stop the server\n');
});
EOF
    print_status "server.js created"
}

# Create public directory and files
create_public_files() {
    print_warning "Creating public directory and files..."
    mkdir -p public
    mkdir -p SCRIPT
    
    # Create example script
    cat > SCRIPT/example.js << 'EOF'
// Example Node.js script
console.log('Hello from example script!');
console.log('Current time:', new Date().toISOString());

// Export a function that can be called from the web interface
module.exports = {
    name: 'Example Script',
    description: 'A simple example script',
    execute: function() {
        return {
            message: 'Example script executed successfully!',
            timestamp: new Date().toISOString(),
            data: { example: 'data' }
        };
    }
};
EOF
    
    # Create index.html
    cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>localprojecttest.cz - Script Runner</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <h1>🚀 localprojecttest.cz</h1>
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#scripts">Scripts</a></li>
                <li><a href="#status">Status</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section id="home">
            <h2>Welcome to localprojecttest.cz!</h2>
            <p>🎉 Local development server with script execution capabilities</p>
            <div id="domain-info" class="domain-status">
                <h3>Loading domain information...</h3>
            </div>
        </section>

        <section id="scripts">
            <h2>Script Management</h2>
            <div class="script-controls">
                <button id="load-scripts" class="btn-primary">🔄 Load Scripts</button>
                <button id="refresh-scripts" class="btn-secondary">↻ Refresh</button>
            </div>
            <div id="scripts-list" class="scripts-container">
                <p>Click "Load Scripts" to see available scripts...</p>
            </div>
        </section>

        <section id="status">
            <h2>Server Status</h2>
            <div id="server-status" class="status-grid">
                <div class="status-card">
                    <h4>Domain</h4>
                    <p id="domain-status">localprojecttest.cz</p>
                </div>
                <div class="status-card">
                    <h4>Script Directory</h4>
                    <p>/SCRIPT</p>
                </div>
                <div class="status-card">
                    <h4>Server Port</h4>
                    <p>Port 80 (HTTP)</p>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <p>&copy; 2024 localprojecttest.cz | Script Runner Environment</p>
    </footer>

    <script src="script.js"></script>
</body>
</html>
EOF

    # Create styles.css
    cat > public/styles.css << 'EOF'
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Ubuntu', 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

header {
    background: rgba(44, 62, 80, 0.95);
    color: white;
    padding: 1rem 0;
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
    backdrop-filter: blur(10px);
}

nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}

nav ul {
    display: flex;
    list-style: none;
}

nav ul li {
    margin-left: 2rem;
}

nav ul li a {
    color: white;
    text-decoration: none;
    transition: all 0.3s;
    padding: 0.5rem 1rem;
    border-radius: 5px;
}

nav ul li a:hover {
    background: rgba(52, 152, 219, 0.3);
    color: #3498db;
}

main {
    margin-top: 100px;
    padding: 2rem;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
}

section {
    background: rgba(255, 255, 255, 0.95);
    margin-bottom: 3rem;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
}

.domain-status {
    background: linear-gradient(135deg, #e8f4fd, #f0f8ff);
    border: 2px solid #3498db;
    border-radius: 10px;
    padding: 1.5rem;
    margin-top: 1rem;
}

.status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
}

.status-card {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #3498db;
}

.info-box {
    background: #e8f5e8;
    border: 2px solid #27ae60;
    border-radius: 10px;
    padding: 1.5rem;
}

.info-box ul {
    margin-top: 1rem;
    padding-left: 1rem;
}

.info-box li {
    margin: 0.5rem 0;
    color: #2c3e50;
}

.status-success {
    color: #27ae60;
    font-weight: bold;
}

.status-warning {
    color: #f39c12;
    font-weight: bold;
}

footer {
    background: rgba(52, 73, 94, 0.95);
    color: white;
    text-align: center;
    padding: 1rem;
    margin-top: 2rem;
    backdrop-filter: blur(10px);
}

h1, h2, h3 {
    color: #2c3e50;
    margin-bottom: 1rem;
}

@media (max-width: 768px) {
    nav {
        flex-direction: column;
        gap: 1rem;
    }
    
    nav ul {
        margin: 0;
    }
    
    nav ul li {
        margin: 0 1rem;
    }
    
    main {
        padding: 1rem;
        margin-top: 120px;
    }
}
EOF

    # Create script.js
    cat > public/script.js << 'EOF'
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Fetch and display domain status
    fetchDomainStatus();
    
    // Update time every second
    updateServerTime();
    setInterval(updateServerTime, 1000);

    console.log('🐧 Ubuntu Local Domain Website loaded successfully!');
});

async function fetchDomainStatus() {
    try {
        const response = await fetch('/api/domain-status');
        const data = await response.json();
        displayDomainStatus(data);
        updateStatusCards(data);
    } catch (error) {
        console.error('Failed to fetch domain status:', error);
        displayDomainError();
    }
}

function displayDomainStatus(data) {
    const domainInfoDiv = document.getElementById('domain-info');
    const statusClass = data.isCustomDomain ? 'status-success' : 'status-warning';
    const statusText = data.isCustomDomain ? '✅ Custom Domain Active' : '⚠️ Using Default Domain';
    
    domainInfoDiv.innerHTML = `
        <h3>Domain Configuration</h3>
        <p class="${statusClass}">${statusText}</p>
        <div style="margin-top: 1rem; display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem;">
            <strong>Current Host:</strong> <span>${data.host}</span>
            <strong>Target Domain:</strong> <span>${data.domain}</span>
            <strong>Local IP:</strong> <span>${data.localIP}</span>
            <strong>Platform:</strong> <span>${data.serverInfo.platform} (${data.serverInfo.arch})</span>
            <strong>Hostname:</strong> <span>${data.serverInfo.hostname}</span>
        </div>
    `;
}

function updateStatusCards(data) {
    document.getElementById('domain-status').textContent = 
        data.isCustomDomain ? '✅ Custom Domain' : '⚠️ Localhost';
    document.getElementById('connection-type').textContent = 
        data.isCustomDomain ? '🌐 Local Domain' : '🔗 Direct IP';
}

function updateServerTime() {
    document.getElementById('server-time').textContent = 
        new Date().toLocaleString();
}

function displayDomainError() {
    const domainInfoDiv = document.getElementById('domain-info');
    domainInfoDiv.innerHTML = `
        <h3>Domain Status</h3>
        <p class="status-error">❌ Failed to load domain information</p>
    `;
}
EOF

    print_status "Public files created"
}

# Create systemctl service (optional)
create_service() {
    print_warning "Creating systemd service..."
    cat > /etc/systemd/system/local-domain-website.service << EOF
[Unit]
Description=Local Domain Website (test.cz)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=80

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    print_status "Systemd service created (optional: sudo systemctl enable local-domain-website)"
}

# Flush DNS cache
flush_dns() {
    print_warning "Flushing DNS cache..."
    if command -v systemctl &> /dev/null; then
        systemctl restart systemd-resolved 2>/dev/null || true
    fi
    print_status "DNS cache flushed"
}

# Main execution
main() {
    echo "Starting automatic setup for Ubuntu..."
    
    # Check sudo access
    check_sudo
    
    # Check if port 80 is available
    if netstat -tlnp | grep -q ":80 "; then
        print_error "Port 80 is already in use. Please stop the service using port 80 first."
        print_warning "Common services using port 80: Apache (apache2), Nginx"
        print_warning "To stop Apache: sudo systemctl stop apache2"
        print_warning "To stop Nginx: sudo systemctl stop nginx"
        exit 1
    fi
    
    # Run setup steps
    install_nodejs
    create_package_json
    install_dependencies
    setup_hosts
    setup_firewall
    create_server
    create_public_files
    create_service
    flush_dns
    
    # Final success message
    echo -e "\n${GREEN}🎉 SETUP COMPLETE! 🎉${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "Your localprojecttest.cz website is ready!"
    echo -e ""
    echo -e "🚀 To start the server:"
    echo -e "   ${YELLOW}sudo npm start${NC} (requires sudo for port 80)"
    echo -e ""
    echo -e "🌐 Access your website:"
    echo -e "   • http://localprojecttest.cz"
    echo -e "   • http://www.localprojecttest.cz"
    echo -e ""
    echo -e "📁 Script directory: ./SCRIPT/"
    echo -e "   Place your Node.js scripts in the SCRIPT folder"
    echo -e ""
    echo -e "🔧 Optional - Run as system service:"
    echo -e "   ${YELLOW}sudo systemctl start local-domain-website${NC}"
    echo -e "   ${YELLOW}sudo systemctl enable local-domain-website${NC}"
    echo -e ""
    echo -e "${YELLOW}Note: Running on port 80 requires sudo privileges${NC}"
    echo -e ""
    echo -e "Press any key to start the server now..."
    read -n 1 -s
    echo -e "\n${GREEN}Starting server with sudo...${NC}"
    sudo npm start
}

# Run main function
main "$@"
EOF

chmod +x auto-setup.sh
