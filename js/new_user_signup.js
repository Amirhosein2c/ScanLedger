
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
				const webhookUrl = 'http://192.99.127.217:5678/webhook/user_auth';
				const payload = { email, password, name, surname };
				const res = await fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				// Try to parse JSON response if available
				let respData = null;
				try { respData = await res.json(); } catch (_) {}
				if (!res.ok) {
					console.error('Webhook signup failed', respData);
					alert('Signup failed. Please try again.');
					return;
				}
				// Persist minimal profile locally
				localStorage.setItem('user_name', name);
				localStorage.setItem('user_surname', surname);
				localStorage.setItem('user_email', email.toLowerCase());
				window.location.href = 'User_Profile_Settings.html';
			} catch (err) {
				console.error('Network error hitting webhook', err);
				alert('Network error. Please retry.');
			} finally {
				if (submitBtn) {
					submitBtn.disabled = false;
					submitBtn.textContent = originalText;
				}
			}
		});
	}
});
