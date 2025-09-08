
// Handle sign up form submission
document.addEventListener('DOMContentLoaded', function() {
	const form = document.querySelector('form');
	if (form) {
		form.addEventListener('submit', function(e) {
			e.preventDefault();
			const name = document.getElementById('signup_name').value.trim();
			const surname = document.getElementById('signup_surname').value.trim();
			const email = document.getElementById('signup_email').value.trim();
			const password = document.getElementById('signup_password').value;
			const confirmPassword = document.getElementById('signup_confirm_password').value;
			if (!name || !surname || !email || !password || !confirmPassword) {
				alert('Please fill in all fields.');
				return;
			}
			if (password !== confirmPassword) {
				alert('Passwords do not match.');
				return;
			}
			// Store name and surname in localStorage for profile page
			localStorage.setItem('user_name', name);
			localStorage.setItem('user_surname', surname);
			window.location.href = 'User_Profile_Settings.html';
		});
	}
});
