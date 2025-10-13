document.addEventListener('DOMContentLoaded', async () => {
  const fullnameElem = document.getElementById('user-fullname');
  if (!fullnameElem) return;

  const storedEmail = localStorage.getItem('user_email');
  const storedName = localStorage.getItem('user_name');
  const storedSurname = localStorage.getItem('user_surname');
  
  // First, show stored data if available
  if (storedName || storedSurname) {
    fullnameElem.textContent = `${storedName || ''} ${storedSurname || ''}`.trim() || 'User';
  } else if (!storedEmail) {
    fullnameElem.textContent = 'Guest User';
    return;
  } else {
    fullnameElem.textContent = 'Loading...';
  }


  try {
    // USE THE CENTRALIZED API FUNCTION - NO DIRECT IPs!
    const response = await apiPost('/user_login', { 
      email: storedEmail 
    });

    // Extract user fields from response
    const extracted = extractUserFields(response);
    
    // Update localStorage with fresh data
    if (extracted.name) {
      localStorage.setItem('user_name', extracted.name);
    }
    if (extracted.surname) {
      localStorage.setItem('user_surname', extracted.surname);
    }
    
    // Display the name
    const displayName = `${extracted.name || storedName || ''} ${extracted.surname || storedSurname || ''}`.trim();
    fullnameElem.textContent = displayName || 'User';
    
  } catch (err) {
    console.warn('Profile fetch failed, using cached data:', err.message);
    // Keep showing the cached name that we already set above
  }
});



/**
 * Extract user fields from various webhook response formats
 */
function extractUserFields(payload) {
  const result = { name: null, surname: null, email: null };
  if (!payload) return result;
  
  const queue = [payload];
  const visited = new WeakSet(); // Prevent circular references
  
  while (queue.length && (!result.name || !result.surname || !result.email)) {
    const obj = queue.shift();
    
    // Skip if already visited (circular reference protection)
    if (typeof obj === 'object' && obj !== null) {
      if (visited.has(obj)) continue;
      visited.add(obj);
    }
    
    if (Array.isArray(obj)) {
      obj.forEach(el => {
        if (el && typeof el === 'object') queue.push(el);
      });
      continue;
    }
    
    if (!obj || typeof obj !== 'object') continue;
    
    // Check common nested structures
    if (obj.json && typeof obj.json === 'object') queue.push(obj.json);
    if (obj.data && typeof obj.data === 'object') queue.push(obj.data);
    if (obj.user && typeof obj.user === 'object') queue.push(obj.user);
    
    // Extract fields
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      
      // Name extraction
      if (!result.name && typeof value === 'string' && value.trim()) {
        if (['name', 'firstname', 'first_name', 'first'].includes(keyLower)) {
          result.name = value.trim();
        }
      }
      
      // Surname extraction
      if (!result.surname && typeof value === 'string' && value.trim()) {
        if (['surname', 'lastname', 'last_name', 'last', 'family', 'familyname'].includes(keyLower)) {
          result.surname = value.trim();
        }
      }
      
      // Email extraction
      if (!result.email && keyLower === 'email' && typeof value === 'string' && value.trim()) {
        result.email = value.trim();
      }
      
      // Queue nested objects
      if (value && typeof value === 'object' && !visited.has(value)) {
        queue.push(value);
      }
    }
  }
  
  return result;
}



// Handle logout using the centralized auth guard function
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.querySelector('a[href="#"] span.text-red-400')?.parentElement;
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Use the centralized logout function if available
      if (window.authGuard && typeof window.authGuard.logout === 'function') {
        window.authGuard.logout();
      } else {
        // Fallback logout logic
        try {
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_name');
          localStorage.removeItem('user_surname');
          localStorage.removeItem('ocrResultData');
          localStorage.removeItem('scannedImageDataUrl');
          localStorage.removeItem('exportedDocuments');
          sessionStorage.clear();
        } catch (e) {
          console.warn('Logout cleanup failed:', e);
        }
        
        window.location.href = 'Welcome_Onboarding.html';
      }
    });
  }
});