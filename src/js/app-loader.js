/**
 * App Loader - Ensures proper script loading and initialization
 */

// Track loaded modules
const loadedModules = {
  timetableOptimizer: false,
  timetableManager: false,
  renderer: false
};

// Load scripts in a specific order with dependencies
async function loadScripts() {
  console.log("App loader: Starting to load scripts");
  
  try {
    // First load the optimizer
    await loadScript('../js/timetable-optimizer.js');
    loadedModules.timetableOptimizer = true;
    console.log("Timetable optimizer loaded");
    
    // Then load the manager which may depend on the optimizer
    await loadScript('../js/timetable-manager.js');
    loadedModules.timetableManager = true;
    console.log("Timetable manager loaded");
    
    // Finally load the renderer which depends on both
    await loadScript('../js/renderer.js');
    loadedModules.renderer = true;
    console.log("Renderer loaded");
    
    // Wait a moment for scripts to finish executing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Now initialize the app
    console.log("All scripts loaded, checking if app can be initialized");
    if (window.initializeApp) {
      console.log("Initializing app from loader");
      window.initializeApp();
    } else if (window.timetableManager) {
      console.log("initializeApp not found, using timetableManager directly");
      if (document.readyState === "complete" || document.readyState === "interactive") {
        initializeWithTimetableManager();
      } else {
        document.addEventListener('DOMContentLoaded', initializeWithTimetableManager);
      }
    } else {
      console.error("Neither initializeApp nor timetableManager available");
      showError("Application could not be initialized properly");
    }
  } catch (error) {
    console.error("Error loading scripts:", error);
    showError("Error loading application scripts");
  }
}

// Load a single script and return a promise
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Fallback initialization using timetable manager directly
function initializeWithTimetableManager() {
  console.log("Initializing with timetable manager directly");
  
  // Check if user is logged in
  const currentUser = window.currentUser || { isLoggedIn: false };
  if (currentUser.isLoggedIn) {
    // User is logged in, load timetables
    window.timetableManager.loadTimetables().then(() => {
      const savedTimetable = localStorage.getItem('currentTimetable');
      if (savedTimetable) {
        window.timetableManager.showTimetable(savedTimetable);
      }
    });
  }
  
  // Setup event handlers that normally would be in renderer.js
  setupBasicEventHandlers();
}

// Basic event handlers for fallback initialization
function setupBasicEventHandlers() {
  // Calendar navigation
  const prevButton = document.querySelector('.timetable-calendar .prev-button');
  const nextButton = document.querySelector('.timetable-calendar .next-button');
  
  if (prevButton) prevButton.addEventListener('click', () => {
    if (window.generateCalendar) {
      window.currentMonth--;
      if (window.currentMonth < 0) {
        window.currentMonth = 11;
        window.currentYear--;
      }
      window.generateCalendar();
    }
  });
  
  if (nextButton) nextButton.addEventListener('click', () => {
    if (window.generateCalendar) {
      window.currentMonth++;
      if (window.currentMonth > 11) {
        window.currentMonth = 0;
        window.currentYear++;
      }
      window.generateCalendar();
    }
  });
}

// Show error overlay
function showError(message) {
  // Create error overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  
  const errorBox = document.createElement('div');
  errorBox.style.backgroundColor = 'white';
  errorBox.style.padding = '20px';
  errorBox.style.borderRadius = '5px';
  errorBox.style.maxWidth = '400px';
  errorBox.style.textAlign = 'center';
  
  const title = document.createElement('h3');
  title.textContent = 'Application Error';
  title.style.color = 'red';
  
  const errorMessage = document.createElement('p');
  errorMessage.textContent = message || "An unknown error occurred";
  
  const retryButton = document.createElement('button');
  retryButton.textContent = 'Refresh Page';
  retryButton.style.marginTop = '15px';
  retryButton.style.padding = '8px 15px';
  retryButton.addEventListener('click', () => location.reload());
  
  errorBox.appendChild(title);
  errorBox.appendChild(errorMessage);
  errorBox.appendChild(retryButton);
  overlay.appendChild(errorBox);
  document.body.appendChild(overlay);
}

// Run script loader
document.addEventListener('DOMContentLoaded', loadScripts);
console.log("App loader initialized");
