// Welcome / Onboarding page scripts
// Add onboarding flow logic here.

document.addEventListener('DOMContentLoaded', function() {
	const getStartedBtn = document.getElementById('get-started-btn');
	if (getStartedBtn) {
		getStartedBtn.addEventListener('click', function() {
			window.location.href = 'New_User_SignUp.html';
		});
	}
	const loginBtn = document.getElementById('login-btn');
	if (loginBtn) {
		loginBtn.addEventListener('click', function() {
			window.location.href = 'Login_Registration.html';
		});
	}
});
