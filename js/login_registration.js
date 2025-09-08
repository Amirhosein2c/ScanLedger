// Login / Registration page scripts
// Add authentication logic here.
document.addEventListener('DOMContentLoaded', function() {

	// Handle Sign In form submission
	const form = document.querySelector('form');
	if (form) {
		form.addEventListener('submit', function(e) {
			e.preventDefault();
			const email = document.getElementById('email').value.trim();
			const password = document.getElementById('password').value;
			if (!email || !password) {
				alert('Please fill in both Email/Username and Password.');
				return;
			}
			window.location.href = 'Dashboard_Overview.html';
		});
	}
	const signUpLink = document.querySelector('footer .text-center a.font-medium');
	if (signUpLink) {
		signUpLink.addEventListener('click', function(e) {
			e.preventDefault();
			window.location.href = 'New_User_SignUp.html';
		});
	}
});
