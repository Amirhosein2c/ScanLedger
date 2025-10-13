// js/oauth_stub.js
// Temporary stub for OAuth buttons to prevent errors

document.addEventListener('DOMContentLoaded', function() {
  // Handle Google login button
  const googleBtn = document.querySelector('button[type="button"]:has(img[alt="Google"])');
  if (googleBtn) {
    googleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Google OAuth is not configured yet.\n\nTo enable Google Sign-In:\n1. Create a Google Cloud project\n2. Enable Google Identity API\n3. Get your Client ID\n4. Update js/google_oauth.js\n\nFor now, please use email/password to sign in.');
    });
  }

  // Handle Facebook login button  
  const facebookBtn = document.querySelector('button[type="button"]:has(svg)');
  if (facebookBtn && facebookBtn.textContent.includes('Facebook')) {
    facebookBtn.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Facebook OAuth is not configured yet. Please use email/password to sign in.');
    });
  }

  // Handle Microsoft login button
  const microsoftBtn = document.querySelector('button[type="button"]:has(img[alt="Microsoft"])');
  if (microsoftBtn) {
    microsoftBtn.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Microsoft OAuth is not configured yet. Please use email/password to sign in.');
    });
  }

  // Handle Apple login button
  const appleBtn = document.querySelector('button[type="button"]:has(img[alt="Apple"])');
  if (appleBtn) {
    appleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Apple Sign In is not configured yet. Please use email/password to sign in.');
    });
  }
});