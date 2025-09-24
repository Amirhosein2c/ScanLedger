// Google OAuth integration for ScanLedger
// Add this as js/google_oauth.js

class GoogleOAuth {
  constructor() {
    // Get client ID from config
    this.clientId = window.ScanLedgerConfig?.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
    
    if (this.clientId === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      console.error('Google Client ID not configured! Please update js/config.js');
    }
    
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      // Load Google Identity Services
      await this.loadGoogleAPI();
      
      // Initialize Google Identity Services
      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      this.isInitialized = true;
      console.log('Google OAuth initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google OAuth:', error);
    }
  }

  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async handleCredentialResponse(response) {
    try {
      // Show loading state
      this.showLoading();

      // Decode the JWT token to get user info
      const userInfo = this.parseJWT(response.credential);
      
      // Send to your backend for verification and user creation/login
      const result = await this.authenticateWithBackend({
        token: response.credential,
        email: userInfo.email,
        name: userInfo.given_name,
        surname: userInfo.family_name,
        picture: userInfo.picture,
        provider: 'google'
      });

      // Store user info locally
      this.storeUserInfo(userInfo);
      
      // Navigate to dashboard
      window.location.href = 'Dashboard_Overview.html';
      
    } catch (error) {
      console.error('Google OAuth error:', error);
      this.showError('Authentication failed. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  async authenticateWithBackend(userData) {
    try {
      const response = await apiPost('/google_auth', userData);
      return response;
    } catch (error) {
      throw new Error(`Backend authentication failed: ${error.message}`);
    }
  }

  storeUserInfo(userInfo) {
    try {
      localStorage.setItem('user_email', userInfo.email);
      localStorage.setItem('user_name', userInfo.given_name || '');
      localStorage.setItem('user_surname', userInfo.family_name || '');
      if (userInfo.picture) {
        localStorage.setItem('user_picture', userInfo.picture);
      }
    } catch (error) {
      console.warn('Failed to store user info:', error);
    }
  }

  // Method to trigger Google login popup
  signIn() {
    if (!this.isInitialized) {
      console.error('Google OAuth not initialized');
      this.showError('Google login is not ready yet. Please wait and try again.');
      return;
    }

    // Try Google One Tap first
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        console.log('Google One Tap not displayed, trying popup');
        this.fallbackSignIn();
      } else if (notification.isSkippedMoment()) {
        console.log('Google One Tap skipped, trying popup');  
        this.fallbackSignIn();
      } else if (notification.isDismissedMoment()) {
        console.log('Google One Tap dismissed');
        // User explicitly dismissed, don't force popup
      }
    });
  }

  fallbackSignIn() {
    // Use Google OAuth popup as fallback
    const client = google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: 'email profile openid',
      callback: async (response) => {
        if (response.error) {
          console.error('OAuth error:', response.error);
          this.showError('Google login failed: ' + response.error);
          return;
        }
        
        try {
          this.showLoading();
          
          // Get user profile with the access token
          const userProfile = await this.getUserProfile(response.access_token);
          
          // Send to backend
          await this.authenticateWithBackend({
            token: response.access_token,
            email: userProfile.email,
            name: userProfile.given_name || '',
            surname: userProfile.family_name || '',
            picture: userProfile.picture || '',
            provider: 'google'
          });

          this.storeUserInfo({
            email: userProfile.email,
            given_name: userProfile.given_name,
            family_name: userProfile.family_name,
            picture: userProfile.picture
          });
          
          // Navigate to dashboard
          window.location.href = 'Dashboard_Overview.html';
          
        } catch (error) {
          console.error('Profile fetch error:', error);
          this.showError('Failed to complete Google login: ' + error.message);
        } finally {
          this.hideLoading();
        }
      }
    });
    
    client.requestAccessToken();
  }

  async getUserProfile(accessToken) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return response.json();
  }

  showLoading() {
    const buttons = document.querySelectorAll('.google-auth-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.dataset.originalText = originalText;
      btn.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Signing in...</span>
        </div>
      `;
    });
  }

  hideLoading() {
    const buttons = document.querySelectorAll('.google-auth-btn');
    buttons.forEach(btn => {
      btn.disabled = false;
      if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
      }
    });
  }

  showError(message) {
    // You can customize this error display
    alert(message);
  }
}

// Initialize Google OAuth when DOM is loaded
let googleOAuth;
document.addEventListener('DOMContentLoaded', () => {
  googleOAuth = new GoogleOAuth();
});

// Export for global use
window.GoogleOAuth = GoogleOAuth;