// js/google_oauth.js
// Google OAuth implementation for ScanLedger - FIXED VERSION

(function() {
  // Configuration - Replace with your actual Google Client ID
  const GOOGLE_CLIENT_ID = 'Y50199771016-rn343kmat6jib4f07dsfj3mh3iu12cfm.apps.googleusercontent.com';
  
  // Check if client ID is configured - FIXED THE CHECK
  if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE' || !GOOGLE_CLIENT_ID) {
    console.warn('Google OAuth: Please configure your Google Client ID in js/google_oauth.js');
    window.googleOAuthAvailable = false;
    return;
  }

  // Initialize Google OAuth
  window.initGoogleOAuth = function() {
    return new Promise((resolve, reject) => {
      // Check if script already loaded
      if (window.google && window.google.accounts) {
        window.googleOAuthAvailable = true;
        resolve();
        return;
      }

      // Wait a bit for the script to load if it's still loading
      const maxWaitTime = 5000; // 5 seconds
      const checkInterval = 100; // 100ms
      let waitTime = 0;
      
      const checkForGoogle = () => {
        if (window.google && window.google.accounts) {
          // Initialize Google Identity Services
          try {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleGoogleResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
            });
            
            window.googleOAuthAvailable = true;
            console.log('Google OAuth initialized successfully');
            resolve();
          } catch (error) {
            console.error('Error initializing Google OAuth:', error);
            window.googleOAuthAvailable = false;
            reject(error);
          }
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

  // Handle the Google OAuth response
  function handleGoogleResponse(response) {
    try {
      // The response contains a JWT credential
      const credential = response.credential;
      
      // Decode the JWT to get user info (for client-side use only)
      const payload = decodeJWT(credential);
      
      if (!payload || !payload.email) {
        throw new Error('Invalid Google response - no email found');
      }
      
      // Store user info
      localStorage.setItem('user_email', payload.email);
      localStorage.setItem('user_name', payload.given_name || '');
      localStorage.setItem('user_surname', payload.family_name || '');
      localStorage.setItem('auth_method', 'google');
      
      console.log('Google OAuth successful for:', payload.email);
      
      // Optional: Send to your backend for verification
      sendToBackend(credential, payload);
      
      // Redirect to dashboard
      window.location.href = 'Dashboard_Overview.html';
      
    } catch (error) {
      console.error('Error handling Google response:', error);
      alert('Google Sign-In failed. Please try again.');
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
      // If you want to verify the token on your backend
      await apiPost('/user_auth', {
        credential: credential,
        email: payload.email,
        name: payload.given_name,
        surname: payload.family_name,
        auth_provider: 'google'
      });
    } catch (err) {
      // Continue anyway - we have the user info client-side
      console.log('Backend verification skipped:', err.message);
    }
  }

  // Trigger Google Sign-In
  window.triggerGoogleSignIn = function() {
    if (!window.googleOAuthAvailable) {
      console.error('Google OAuth not available');
      alert('Google Sign-In is not configured. Please use email/password instead.');
      return;
    }
    
    if (!window.google || !window.google.accounts) {
      console.error('Google Identity Services not loaded');
      alert('Google Sign-In is loading. Please try again in a moment.');
      return;
    }
    
    try {
      // Show the Google One Tap dialog
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('One Tap not displayed, trying popup flow');
          // If One Tap is not displayed, try alternative approach
          // You can implement popup flow here if needed
          alert('Please enable popups for this site to use Google Sign-In, or try using email/password login.');
        }
      });
    } catch (error) {
      console.error('Error triggering Google Sign-In:', error);
      alert('Google Sign-In failed to start. Please try again or use email/password login.');
    }
  };

  // Alternative: Render Google Sign-In button
  window.renderGoogleButton = function(buttonId) {
    if (!window.googleOAuthAvailable) return;
    
    const buttonElement = document.getElementById(buttonId);
    if (!buttonElement) {
      console.error('Google button element not found:', buttonId);
      return;
    }
    
    try {
      window.google.accounts.id.renderButton(
        buttonElement,
        { 
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center'
        }
      );
    } catch (error) {
      console.error('Error rendering Google button:', error);
    }
  };

  // Initialize on load
  console.log('Google OAuth module loaded');
  window.googleOAuthAvailable = false; // Will be set to true when properly initialized

})();