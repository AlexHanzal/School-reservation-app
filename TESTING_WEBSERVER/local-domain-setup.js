const fs = require('fs');
const os = require('os');
const path = require('path');

class LocalDomainSetup {
    constructor() {
        this.domain = 'mytest.local';
        this.ip = '127.0.0.1';
        this.hostsPath = this.getHostsPath();
    }

    getHostsPath() {
        const platform = os.platform();
        if (platform === 'win32') {
            return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
        } else {
            return '/etc/hosts';
        }
    }

    generateHostsEntry() {
        return `${this.ip}\t${this.domain}\n${this.ip}\twww.${this.domain}\n`;
    }

    displayInstructions() {
        console.log('=== LOCAL DOMAIN SETUP INSTRUCTIONS ===\n');
        console.log(`Domain: ${this.domain}`);
        console.log(`IP: ${this.ip}`);
        console.log(`Hosts file location: ${this.hostsPath}\n`);
        
        console.log('To set up your local domain, add these entries to your hosts file:');
        console.log('----------------------------------------');
        console.log(this.generateHostsEntry());
        
        console.log('Manual setup steps:');
        console.log('1. Open terminal/command prompt as administrator');
        console.log('2. Edit the hosts file:');
        
        if (os.platform() === 'win32') {
            console.log('   notepad C:\\Windows\\System32\\drivers\\etc\\hosts');
        } else {
            console.log('   sudo nano /etc/hosts');
        }
        
        console.log('3. Add the entries shown above');
        console.log('4. Save and close the file');
        console.log('5. Restart your server');
        console.log(`6. Visit http://${this.domain}:3000 in your browser`);
    }

    createAutomatedScript() {
        const scriptContent = os.platform() === 'win32' 
            ? this.createWindowsScript() 
            : this.createUnixScript();
        
        const scriptName = os.platform() === 'win32' ? 'setup-domain.bat' : 'setup-domain.sh';
        const scriptPath = path.join(__dirname, scriptName);
        
        fs.writeFileSync(scriptPath, scriptContent);
        
        if (os.platform() !== 'win32') {
            fs.chmodSync(scriptPath, '755');
        }
        
        console.log(`\nAutomated setup script created: ${scriptName}`);
        console.log('Run this script as administrator to automatically configure your hosts file.');
    }

    createWindowsScript() {
        return `@echo off
echo Adding local domain entries to hosts file...
echo ${this.ip} ${this.domain} >> C:\\Windows\\System32\\drivers\\etc\\hosts
echo ${this.ip} www.${this.domain} >> C:\\Windows\\System32\\drivers\\etc\\hosts
echo Local domain setup complete!
echo You can now access your site at http://${this.domain}:3000
pause
`;
    }

    createUnixScript() {
        return `#!/bin/bash
echo "Adding local domain entries to hosts file..."
echo "${this.ip} ${this.domain}" | sudo tee -a /etc/hosts
echo "${this.ip} www.${this.domain}" | sudo tee -a /etc/hosts
echo "Local domain setup complete!"
echo "You can now access your site at http://${this.domain}:3000"
`;
    }
}

// Run the setup
const setup = new LocalDomainSetup();
setup.displayInstructions();
setup.createAutomatedScript();
