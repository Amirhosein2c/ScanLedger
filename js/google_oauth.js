// js/google_oauth.js
// Google OAuth implementation for ScanLedger

(function() {
  // Configuration - Replace with your actual Google Client ID
  const GOOGLE_CLIENT_ID = 'Y50199771016-rn343kmat6jib4f07dsfj3mh3iu12cfm.apps.googleusercontent.com';
  
  // Check if client ID is configured
  if (GOOGLE_CLIENT_ID === '50199771016-rn343kmat6jib4f07dsfj3mh3iu12cfm.apps.googleusercontent.com') {
    console.warn('Google OAuth: Please configure your Google Client ID in js/google_oauth.js');
    window.googleOAuthAvailable = false;
    return;
  }

  // Initialize Google OAuth
  window.initGoogleOAuth = function() {
    return new Promise((resolve, reject) => {
      // Check if script already loaded
      if (window.google && window.google.accounts) {
        resolve();
        return;
      }

      // Create and load the Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google && window.google.accounts) {
          // Initialize Google Identity Services
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          
          window.googleOAuthAvailable = true;
          resolve();
        } else {
          reject(new Error('Google Identity Services failed to load'));
        }
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Identity Services');
        window.googleOAuthAvailable = false;
        reject(new Error('Failed to load Google Identity Services'));
      };
      
      document.head.appendChild(script);
    });
  };

  // Handle the Google OAuth response
  function handleGoogleResponse(response) {
    // The response contains a JWT credential
    const credential = response.credential;
    
    // Decode the JWT to get user info (for client-side use only)
    const payload = decodeJWT(credential);
    
    // Store user info
    localStorage.setItem('user_email', payload.email);
    localStorage.setItem('user_name', payload.given_name || '');
    localStorage.setItem('user_surname', payload.family_name || '');
    localStorage.setItem('auth_method', 'google');
    
    // Optional: Send to your backend for verification
    sendToBackend(credential, payload);
    
    // Redirect to dashboard
    window.location.href = 'Dashboard_Overview.html';
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
      alert('Google Sign-In is not configured. Please use email/password instead.');
      return;
    }
    
    // Show the Google One Tap dialog
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // If One Tap is not displayed, show the button flow
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile',
          callback: (response) => {
            // This is for OAuth 2.0 flow if needed
            console.log('OAuth response:', response);
          },
        });
        tokenClient.requestAccessToken();
      }
    });
  };

  // Alternative: Render Google Sign-In button
  window.renderGoogleButton = function(buttonId) {
    if (!window.googleOAuthAvailable) return;
    
    window.google.accounts.id.renderButton(
      document.getElementById(buttonId),
      { 
        theme: 'filled_black',
        size: 'large',
        width: '100%',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center'
      }
    );
  };

})();