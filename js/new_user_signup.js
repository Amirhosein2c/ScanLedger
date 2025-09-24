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

				// Check if there's a redirect URL stored (for cases where user was redirected to signup)
				let redirectUrl = 'Dashboard_Overview.html'; // default
				try {
					const storedRedirect = sessionStorage.getItem('redirect_after_login');
					if (storedRedirect) {
						redirectUrl = storedRedirect;
						sessionStorage.removeItem('redirect_after_login');
					}
				} catch (e) {
					// Ignore storage errors, use default
				}

				// Navigate to the appropriate page
				window.location.href = redirectUrl;
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