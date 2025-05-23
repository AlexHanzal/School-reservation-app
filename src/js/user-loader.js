/**
 * Standalone script to handle user loading and fix user loading issues
 */

(function() {
  console.log('User loader script initialized');
  
  const API_URL = `http://${window.location.hostname}:3000/api`;
  
  // Function to load users directly
  async function loadUsersDirectly() {
    try {
      console.log('Directly loading users from API');
      const userSelect = document.getElementById('user-select');
      
      if (!userSelect) {
        console.error('User select element not found');
        return;
      }
      
      // Add loading indicator
      userSelect.innerHTML = '<option value="">Loading users...</option>';
      
      // Make the API call with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_URL}/users`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const users = await response.json();
      console.log('Loaded users successfully:', users.length);
      
      // Clear loading indicator
      userSelect.innerHTML = '<option value="">Select a user</option>';
      
      // Add options for users
      if (Array.isArray(users) && users.length > 0) {
        users.forEach(user => {
          const option = document.createElement('option');
          option.value = user.abbreviation;
          option.textContent = user.name;
          userSelect.appendChild(option);
        });
      } else {
        console.warn('No users found, adding fallback options');
        
        // Fallback options
        const adminOption = document.createElement('option');
        adminOption.value = "admin";
        adminOption.textContent = "Admin User";
        userSelect.appendChild(adminOption);
        
        const debugOption = document.createElement('option');
        debugOption.value = "debug";
        debugOption.textContent = "Debug User";
        userSelect.appendChild(debugOption);
      }
    } catch (error) {
      console.error('Error loading users directly:', error);
      
      // Add fallback options on error
      const userSelect = document.getElementById('user-select');
      if (userSelect) {
        userSelect.innerHTML = '<option value="">Select a user</option>';
        
        const adminOption = document.createElement('option');
        adminOption.value = "admin";
        adminOption.textContent = "Admin User";
        userSelect.appendChild(adminOption);
        
        const debugOption = document.createElement('option');
        debugOption.value = "debug";
        debugOption.textContent = "Debug User";
        userSelect.appendChild(debugOption);
      }
    }
  }
  
  // Try to load users as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUsersDirectly);
  } else {
    loadUsersDirectly();
  }
  
  // Also load when login button is clicked
  document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.addEventListener('click', (event) => {
        if (!loginButton.classList.contains('logged-in')) {
          console.log('Login button clicked, loading users');
          loadUsersDirectly();
        }
      });
    }
  });
})();
