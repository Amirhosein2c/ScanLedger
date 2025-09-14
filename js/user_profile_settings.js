// Fetch and display the currently logged-in user's profile (name + surname)
document.addEventListener('DOMContentLoaded', () => {
	const fullnameElem = document.getElementById('user-fullname');
	if (!fullnameElem) return;

	const storedEmail = localStorage.getItem('user_email');
	if (!storedEmail) {
		fullnameElem.textContent = 'Guest User';
		return;
	}

	// Show a temporary loading state
	fullnameElem.textContent = 'Loading...';

	const webhookUrl = 'http://192.99.127.217:5678/webhook/user_login';
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

	fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: storedEmail }),
		signal: controller.signal
	})
		.then(async res => {
			clearTimeout(timeoutId);
			if (!res.ok) throw new Error('Non-200 response');
			let data = null;
			try { data = await res.json(); } catch (_) { /* ignore parse errors */ }
			function extractUserFields(payload) {
				const result = { name: null, surname: null, email: null };
				if (!payload) return result;
				const queue = [payload];
				while (queue.length && (!result.name || !result.surname || !result.email)) {
					const obj = queue.shift();
					if (Array.isArray(obj)) { obj.forEach(el => queue.push(el)); continue; }
					if (obj && obj.json) queue.push(obj.json);
					if (obj && obj.data) queue.push(obj.data);
					if (obj && obj.user) queue.push(obj.user);
					for (const [k,v] of Object.entries(obj)) {
						const kl = k.toLowerCase();
						if (['name','firstname','first_name','first'].includes(kl) && typeof v === 'string' && !result.name) result.name = v;
						if (['surname','lastname','last_name','last','family','familyname'].includes(kl) && typeof v === 'string' && !result.surname) result.surname = v;
						if (kl === 'email' && typeof v === 'string' && !result.email) result.email = v;
						if (typeof v === 'object') queue.push(v);
					}
				}
				return result;
			}
			let fetchedName = '', fetchedSurname = '';
			if (data && typeof data === 'object') {
				const extracted = extractUserFields(data);
				fetchedName = extracted.name || '';
				fetchedSurname = extracted.surname || '';
			}
			const existingName = localStorage.getItem('user_name') || '';
			const existingSurname = localStorage.getItem('user_surname') || '';
			if (!fetchedName && existingName) fetchedName = existingName;
			if (!fetchedSurname && existingSurname) fetchedSurname = existingSurname;
			if (fetchedName) localStorage.setItem('user_name', fetchedName);
			if (fetchedSurname) localStorage.setItem('user_surname', fetchedSurname);
			if (fetchedName || fetchedSurname) {
				fullnameElem.textContent = `${fetchedName} ${fetchedSurname}`.trim();
				return;
			}
			// Fallback to stored values if response lacked fields
					const fallbackName = localStorage.getItem('user_name');
					const fallbackSurname = localStorage.getItem('user_surname');
					if (fallbackName || fallbackSurname) {
						fullnameElem.textContent = `${fallbackName || ''} ${fallbackSurname || ''}`.trim();
					} else {
						fullnameElem.textContent = 'User';
					}
		})
		.catch(err => {
			clearTimeout(timeoutId);
			console.warn('Profile fetch failed', err);
					const fallbackName = localStorage.getItem('user_name');
					const fallbackSurname = localStorage.getItem('user_surname');
					if (fallbackName || fallbackSurname) {
						fullnameElem.textContent = `${fallbackName || ''} ${fallbackSurname || ''}`.trim();
					} else {
						fullnameElem.textContent = 'User';
					}
		});
});

// Additional settings interactions can be added below.
