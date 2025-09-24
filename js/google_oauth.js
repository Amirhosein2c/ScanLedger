// js/google_oauth.js
// Google OAuth implementation for ScanLedger - UNIFIED CONFIG VERSION

(function() {
  // Get Client ID from config or set directly - FIXED
  let GOOGLE_CLIENT_ID;
  
  // Try to get from config first, then fallback to direct assignment
  if (window.ScanLedgerConfig && window.ScanLedgerConfig.GOOGLE_CLIENT_ID) {
    GOOGLE_CLIENT_ID = window.ScanLedgerConfig.GOOGLE_CLIENT_ID;
  } else {
    // Direct fallback - make sure this matches your actual Google Cloud Console Client ID
    GOOGLE_CLIENT_ID = '50199771016-rn343kmat6jib4f07dsfj3mh3iu12cfm.apps.googleusercontent.com';
  }
  
  console.log('Using Google Client ID:', GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'MISSING');
  
  // Validate client ID format
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE' || !GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
    console.error('Google OAuth: Invalid or missing Google Client ID');
    window.googleOAuthAvailable = false;
    return;
  }

  // Initialize Google OAuth
  window.initGoogleOAuth = function() {
    return new Promise((resolve, reject) => {
      console.log('Initializing Google OAuth with Client ID:', GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'MISSING');
      
      // Check if script already loaded
      if (window.google && window.google.accounts) {
        console.log('Google Identity Services already loaded, initializing...');
        initializeGoogleIdentity(resolve, reject);
        return;
      }

      // Wait for Google script to load
      const maxWaitTime = 10000; // 10 seconds
      const checkInterval = 100; // 100ms
      let waitTime = 0;
      
      const checkForGoogle = () => {
        if (window.google && window.google.accounts) {
          console.log('Google Identity Services loaded, initializing...');
          initializeGoogleIdentity(resolve, reject);
        } else if (waitTime < maxWaitTime) {
          waitTime += checkInterval;
          setTimeout(checkForGoogle, checkInterval);
        } else {
          console.error('Google Identity Services failed to load within timeout');
          window.googleOAuthAvailable = false;
          reject(new Error('Google Identity Services failed to load'));
        }
      };
      
      checkForGoogle();
    });
  };

  // Initialize Google Identity Services with proper error handling
  function initializeGoogleIdentity(resolve, reject) {
    try {
      if (!GOOGLE_CLIENT_ID) {
        throw new Error('Client ID is missing');
      }
      
      console.log('Calling google.accounts.id.initialize with Client ID:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');
      
      window.google.accounts.id.initialize({
  client_id: GOOGLE_CLIENT_ID,
  callback: handleGoogleResponse,
  auto_select: false,
  cancel_on_tap_outside: true,
  use_fedcm_for_prompt: false,  // disable FedCM to avoid AbortError
  itp_support: true
});
      
      window.googleOAuthAvailable = true;
      console.log('Google OAuth initialized successfully');
      resolve();
    } catch (error) {
      console.error('Error initializing Google OAuth:', error);
      window.googleOAuthAvailable = false;
      reject(error);
    }
  }

  // Handle the Google OAuth response
  function handleGoogleResponse(response) {
    try {
      console.log('Received Google OAuth response');
      
      // The response contains a JWT credential
      const credential = response.credential;
      
      if (!credential) {
        throw new Error('No credential received from Google');
      }
      
      // Decode the JWT to get user info (for client-side use only)
      const payload = decodeJWT(credential);
      
      if (!payload || !payload.email) {
        throw new Error('Invalid Google response - no email found');
      }
      
      console.log('Google OAuth successful for:', payload.email);
      
      // Store user info
      localStorage.setItem('user_email', payload.email);
      localStorage.setItem('user_name', payload.given_name || '');
      localStorage.setItem('user_surname', payload.family_name || '');
      localStorage.setItem('auth_method', 'google');
      
      // Optional: Send to your backend for verification
      sendToBackend(credential, payload);
      
      // Redirect to dashboard
      window.location.href = 'Dashboard_Overview.html';
      
    } catch (error) {
      console.error('Error handling Google response:', error);
      alert('Google Sign-In failed: ' + error.message);
    }
  }

  // Decode JWT (for display purposes only - NOT for security)
  function decodeJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode JWT:', e);
      return {};
    }
  }

  // Send credential to backend for verification (optional)
  async function sendToBackend(credential, payload) {
    try {
      console.log('Sending Google credential to backend...');
      await apiPost('/user_auth', {
        credential: credential,
        email: payload.email,
        name: payload.given_name,
        surname: payload.family_name,
        auth_provider: 'google'
      });
      console.log('Backend verification successful');
    } catch (err) {
      // Continue anyway - we have the user info client-side
      console.log('Backend verification failed (continuing anyway):', err.message);
    }
  }

  // Trigger Google Sign-In
  window.triggerGoogleSignIn = function() {
    console.log('triggerGoogleSignIn called, googleOAuthAvailable:', window.googleOAuthAvailable);
    
    if (!window.googleOAuthAvailable) {
      console.error('Google OAuth not available');
      alert('Google Sign-In is not available. Please try refreshing the page or use email/password instead.');
      return;
    }
    
    if (!window.google || !window.google.accounts) {
      console.error('Google Identity Services not loaded');
      alert('Google Sign-In is still loading. Please try again in a moment.');
      return;
    }
    
    if (!GOOGLE_CLIENT_ID) {
      console.error('Client ID missing when triggering sign-in');
      alert('Google Sign-In configuration error. Please contact support.');
      return;
    }
    
    try {
      console.log('Triggering Google prompt...');
      
      // Show the Google One Tap dialog with FedCM support
      window.google.accounts.id.prompt((notification) => {
        console.log('Google prompt notification received');
        
        // FedCM-compatible way to handle notification
        if (notification && typeof notification.getMomentType === 'function') {
          const momentType = notification.getMomentType();
          console.log('Google prompt moment type:', momentType);
          
          if (momentType === 'display') {
            console.log('Google One Tap displayed successfully');
          } else if (momentType === 'skipped') {
            console.log('Google One Tap was skipped');
            showAlternativeSignIn();
          } else if (momentType === 'dismissed') {
            console.log('Google One Tap was dismissed');
          }
        } else {
          // Fallback for older API (will eventually be deprecated)
          console.log('Using legacy notification handling');
          if (notification && notification.isNotDisplayed && notification.isNotDisplayed()) {
            console.log('One Tap not displayed');
            showAlternativeSignIn();
          } else if (notification && notification.isSkippedMoment && notification.isSkippedMoment()) {
            console.log('One Tap skipped');
            showAlternativeSignIn();
          }
        }
      });
    } catch (error) {
      console.error('Error triggering Google Sign-In:', error);
      alert('Google Sign-In failed to start: ' + error.message);
    }
  };

  // Alternative sign-in flow when One Tap fails
  function showAlternativeSignIn() {
    console.log('Showing alternative Google sign-in...');
    
    // Create a temporary button for the popup flow
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.top = '-1000px';
    tempDiv.style.left = '-1000px';
    tempDiv.id = 'temp-google-signin';
    document.body.appendChild(tempDiv);
    
    try {
      // Render a hidden button that will trigger popup
      window.google.accounts.id.renderButton(tempDiv, {
        theme: 'outline',
        size: 'large'
      });
      
      // Programmatically click the button
      setTimeout(() => {
        const button = tempDiv.querySelector('div[role="button"]');
        if (button) {
          button.click();
        } else {
          alert('Google Sign-In popup blocked. Please allow popups for this site or use email/password login.');
        }
        // Clean up
        document.body.removeChild(tempDiv);
      }, 100);
      
    } catch (error) {
      console.error('Alternative sign-in failed:', error);
      document.body.removeChild(tempDiv);
      alert('Google Sign-In is not working. Please try using email/password login instead.');
    }
  }

  // Initialize on load
  console.log('Google OAuth module loaded');
  window.googleOAuthAvailable = false; // Will be set to true when properly initialized

})();