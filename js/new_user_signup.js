
// Handle sign up form submission
document.addEventListener('DOMContentLoaded', function() {
	const form = document.querySelector('form');
	if (form) {
		form.addEventListener('submit', async function(e) {
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
			const submitBtn = form.querySelector('button[type="submit"]');
			const originalText = submitBtn ? submitBtn.textContent : '';
			if (submitBtn) {
				submitBtn.disabled = true;
				submitBtn.textContent = 'Submitting...';
			}
			try {
				const payload = { email, password, name, surname };
				const respData = await apiPost('/user_auth', payload);
				// Persist minimal profile locally
				localStorage.setItem('user_name', name);
				localStorage.setItem('user_surname', surname);
				localStorage.setItem('user_email', email.toLowerCase());
				window.location.href = 'Dashboard_Overview.html';
			} catch (err) {
				console.error('Signup webhook error', err);
				alert(err.message || 'Network error. Please retry.');
			} finally {
				if (submitBtn) {
					submitBtn.disabled = false;
					submitBtn.textContent = originalText;
				}
			}
		});
	}
});
