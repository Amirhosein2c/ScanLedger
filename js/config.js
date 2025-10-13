// Configuration file for ScanLedger
// js/config.js

window.ScanLedgerConfig = {
  // FIXED: Correct Google Client ID with the 'Y' prefix
  GOOGLE_CLIENT_ID: '50199771016-rn343kmat6jib4f07dsfj3mh3iu12cfm.apps.googleusercontent.com',
  
  // API Configuration
  API_TIMEOUT: 30000,
  
  // OAuth Scopes
  GOOGLE_SCOPES: 'email profile openid',
  
  // Development mode detection
  isDevelopment: () => {
    return ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
  },
  
  // Get appropriate redirect URI
  getRedirectURI: () => {
    if (window.ScanLedgerConfig.isDevelopment()) {
      return 'http://localhost:3000';
    }
    return window.location.origin;
  }
};