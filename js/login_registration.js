// Login / Registration page scripts
// Add authentication logic here.
document.addEventListener('DOMContentLoaded', function() {

	// Handle Sign In form submission
	const form = document.querySelector('form');
	if (form) {
		form.addEventListener('submit', async function(e) {
			e.preventDefault();
			// Only clear stored name/surname if switching to a different account
			const existingEmail = localStorage.getItem('user_email');
			const emailInput = document.getElementById('email').value.trim();
			if (existingEmail && existingEmail.toLowerCase() !== emailInput.toLowerCase()) {
				localStorage.removeItem('user_name');
				localStorage.removeItem('user_surname');
			}
			const email = document.getElementById('email').value.trim();
			const password = document.getElementById('password').value; // currently unused but validated
			if (!email || !password) {
				alert('Please fill in both Email/Username and Password.');
				return;
			}
			const btn = form.querySelector('button[type="submit"]');
			const originalText = btn ? btn.textContent : '';
			if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
			try {
					const res = await apiPost('/user_login', { email });
					// Unified extraction across varied webhook shapes (array, nested json, n8n items)
					function extractUserFields(payload) {
						const result = { name: null, surname: null, email: null };
						if (!payload) return result;
						const enqueue = (val, q) => { if (val && typeof val === 'object') q.push(val); };
						const queue = [];
						enqueue(payload, queue);
						while (queue.length && (!result.name || !result.surname || !result.email)) {
							const obj = queue.shift();
							// If it's an array push elements
							if (Array.isArray(obj)) { obj.forEach(el => enqueue(el, queue)); continue; }
							// n8n item style { json: {..}, binary: {...} }
							if (obj && obj.json && typeof obj.json === 'object') enqueue(obj.json, queue);
							if (obj && obj.data && typeof obj.data === 'object') enqueue(obj.data, queue);
							if (obj && obj.user && typeof obj.user === 'object') enqueue(obj.user, queue);
							for (const [k,v] of Object.entries(obj)) {
								const kl = k.toLowerCase();
								if (['name','firstname','first_name','first'].includes(kl) && typeof v === 'string' && !result.name) result.name = v;
								if (['surname','lastname','last_name','last','family','familyname'].includes(kl) && typeof v === 'string' && !result.surname) result.surname = v;
								if (kl === 'email' && typeof v === 'string' && !result.email) result.email = v;
								if (typeof v === 'object') enqueue(v, queue);
							}
						}
						return result;
					}

					let name, surname, respEmail;
					try {
						localStorage.setItem('user_login_raw', JSON.stringify(res));
						const extracted = extractUserFields(res);
						name = extracted.name || null;
						surname = extracted.surname || null;
						respEmail = extracted.email || email;
						// If only one part returned, preserve the other if already stored (same account)
						const prevEmail = localStorage.getItem('user_email');
						if (prevEmail && prevEmail === respEmail) {
							if (!name) name = localStorage.getItem('user_name');
							if (!surname) surname = localStorage.getItem('user_surname');
						}
					} catch (parseErr) {
						console.warn('Login response parse issue', parseErr);
						respEmail = email;
					}
				// Persist to localStorage (only overwrite if values exist)
				if (respEmail) localStorage.setItem('user_email', respEmail.toLowerCase());
				if (name) localStorage.setItem('user_name', name);
				if (surname) localStorage.setItem('user_surname', surname);
				// Navigate to dashboard per new requirement
				window.location.href = 'Dashboard_Overview.html';
			} catch (err) {
				console.error('Login webhook error', err);
				alert(err.message || 'Network error. Please retry.');
			} finally {
				if (btn) { btn.disabled = false; btn.textContent = originalText; }
			}
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
