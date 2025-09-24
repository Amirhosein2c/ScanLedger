// Authentication Guard - Add this to all protected pages
// This script should be loaded BEFORE other page scripts

(function() {
  'use strict';

  // List of pages that don't require authentication
  const PUBLIC_PAGES = [
    'welcome_onboarding.html',
    'login_registration.html', 
    'new_user_signup.html',
    'offline.html',
    'index.html',
    ''  // for root path
  ];

  // Get current page name from URL
  function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().toLowerCase();
    return page || 'index.html';
  }

  // Check if current page requires authentication
  function isProtectedPage() {
    const currentPage = getCurrentPage();
    return !PUBLIC_PAGES.some(publicPage => 
      currentPage === publicPage.toLowerCase()
    );
  }

  // Check if user is authenticated
  function isUserAuthenticated() {
    try {
      // Check for user data in localStorage
      const userEmail = localStorage.getItem('user_email');
      const userName = localStorage.getItem('user_name');
      
      // User is considered authenticated if they have an email
      // (you can add more validation here if needed)
      return !!(userEmail && userEmail.trim());
    } catch (e) {
      console.warn('Auth check failed:', e);
      return false;
    }
  }

  // Redirect to login page
  function redirectToLogin() {
    // Store the current page so we can redirect back after login
    try {
      sessionStorage.setItem('redirect_after_login', window.location.href);
    } catch (e) {
      // Ignore storage errors
    }
    
    // Redirect to welcome page
    window.location.replace('Welcome_Onboarding.html');
  }

  // Check authentication status
  function checkAuth() {
    // Only check auth on protected pages
    if (!isProtectedPage()) {
      return; // Allow access to public pages
    }

    // Check if user is authenticated
    if (!isUserAuthenticated()) {
      console.log('Access denied: User not authenticated');
      redirectToLogin();
      return;
    }

    // User is authenticated, allow access
    console.log('Auth check passed');
  }

  // Run auth check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    // DOM is already ready
    checkAuth();
  }

  // Export functions for other scripts to use
  window.authGuard = {
    isAuthenticated: isUserAuthenticated,
    logout: function() {
      // Clear all auth data
      try {
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_surname');
        localStorage.removeItem('user_login_raw');
        localStorage.removeItem('ocrResultData');
        localStorage.removeItem('scannedImageDataUrl');
        sessionStorage.clear();
      } catch (e) {
        console.warn('Logout cleanup failed:', e);
      }
      
      // Redirect to welcome page
      window.location.replace('Welcome_Onboarding.html');
    }
  };
})();