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

async function loadScripts() {
    const scriptsContainer = document.getElementById('scripts-list');
    scriptsContainer.innerHTML = '<div class="loading"></div> Loading projects...';
    
    try {
        const response = await fetch('/api/scripts');
        const data = await response.json();
        displayScripts(data.items);
    } catch (error) {
        scriptsContainer.innerHTML = `<p style="color: red;">❌ Error loading projects: ${error.message}</p>`;
    }
}

function displayScripts(items) {
    const scriptsContainer = document.getElementById('scripts-list');
    
    if (items.length === 0) {
        scriptsContainer.innerHTML = `
            <div class="info-box">
                <h4>📁 No projects found</h4>
                <p>Place your projects in the <strong>SCRIPT</strong> directory:</p>
                <ul>
                    <li><strong>Frontend Projects:</strong> Create a folder with index.html</li>
                    <li><strong>Node Scripts:</strong> Place .js files directly</li>
                    <li><strong>HTML Files:</strong> Place .html files directly</li>
                </ul>
            </div>
        `;
        return;
    }
    
    const itemsHtml = items.map(item => {
        let icon, actions;
        
        switch(item.type) {
            case 'frontend-project':
                icon = '🌐';
                actions = `
                    <button class="btn-view" onclick="openProject('${item.name}')">🚀 Open Project</button>
                    <button class="btn-execute" onclick="viewProjectFiles('${item.name}')">📁 View Files</button>
                `;
                break;
            case 'node-script':
                icon = '⚙️';
                actions = `
                    <button class="btn-view" onclick="viewScript('${item.name}')">👁️ View Code</button>
                    <button class="btn-execute" onclick="executeScript('${item.name}')">▶️ Execute</button>
                `;
                break;
            case 'html-file':
                icon = '📄';
                actions = `
                    <button class="btn-view" onclick="openHtmlFile('${item.name}')">🚀 Open HTML</button>
                    <button class="btn-execute" onclick="viewScript('${item.name}')">👁️ View Code</button>
                `;
                break;
            default:
                icon = '📂';
                actions = `<button class="btn-view" onclick="viewProjectFiles('${item.name}')">📁 Browse</button>`;
        }
        
        return `
            <div class="script-item">
                <div class="script-info">
                    <h4>${icon} ${item.name}</h4>
                    <div class="script-meta">
                        Type: ${item.type.replace('-', ' ')} | Size: ${formatBytes(item.size)} | Modified: ${formatDate(item.modified)}
                    </div>
                </div>
                <div class="script-actions">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
    
    scriptsContainer.innerHTML = itemsHtml;
}

function openProject(projectName) {
    const url = `/script/${projectName}`;
    window.open(url, '_blank');
}

function openHtmlFile(fileName) {
    const url = `/scripts/${fileName}`;
    window.open(url, '_blank');
}

async function viewProjectFiles(projectName) {
    // For now, show a simple message. Could be expanded to show file listing
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 2000; display: flex;
        align-items: center; justify-content: center; padding: 2rem;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 10px; padding: 2rem; max-width: 500px;">
            <h3>📁 ${projectName}</h3>
            <p>Project location: <code>SCRIPT/${projectName}/</code></p>
            <p>Access URL: <a href="/script/${projectName}" target="_blank">http://localprojecttest.cz/script/${projectName}</a></p>
            <p>Static files: <a href="/scripts/${projectName}/" target="_blank">http://localprojecttest.cz/scripts/${projectName}/</a></p>
            <button onclick="this.closest('div').parentElement.remove()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}
