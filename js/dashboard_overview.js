
// Dashboard Overview page scripts
// Add interactive logic here.
document.addEventListener('DOMContentLoaded', function() {
	const scanBtn = document.getElementById('scan-new-doc-btn');
	if (scanBtn) {
		scanBtn.addEventListener('click', function() {
			window.location.href = 'Document_Scan.html';
		});
	}

	// Populate user name from localStorage
	const name = localStorage.getItem('user_name') || '';
	const surname = localStorage.getItem('user_surname') || '';
	const full = (name + ' ' + surname).trim();
	const nameElem = document.getElementById('dashboard-username');
	if (nameElem) {
		nameElem.textContent = full || 'User';
	}

	// Render recent scans
	try {
		const target = document.getElementById('recent-scans');
		const emptyState = document.getElementById('no-recent-scans');
		if (!target) return;
		const raw = localStorage.getItem('exportedDocuments');
		if (!raw) {
			if (emptyState) emptyState.style.display = '';
			return;
		}
		const list = JSON.parse(raw);
		if (!Array.isArray(list) || !list.length) {
			if (emptyState) emptyState.style.display = '';
			return;
		}
		if (emptyState) emptyState.style.display = 'none';
		const toShow = list.slice(0, 5);
		for (const doc of toShow) {
			const card = document.createElement('div');
			card.className = 'flex items-center gap-4 bg-[#1F2937] p-3 rounded-2xl';
			const imgStyle = doc.image ? `style="background-image: url('${sanitize(doc.image)}');"` : '';
			const title = `${doc.type || 'Document'}${doc.number ? ' #' + sanitize(doc.number) : ''}`;
			const amountStr = doc.amount ? sanitize(doc.amount.startsWith('$') ? doc.amount : ('$' + doc.amount)) : '';
			const vendorStr = sanitize(doc.vendor || '');
			const dateStr = sanitize(doc.date || '');
			card.innerHTML = `
				<div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-14" ${imgStyle}></div>
				<div class="flex-1">
					<p class="text-white text-base font-medium leading-normal line-clamp-1">${title}</p>
					<p class="text-[#D1D5DB] text-sm font-normal leading-normal line-clamp-2">${dateStr}</p>
				</div>
				<div class="text-right">
					<p class="text-white text-base font-bold">${amountStr}</p>
					<p class="text-[#D1D5DB] text-sm">${vendorStr}</p>
				</div>`;
			target.appendChild(card);
		}
	} catch(e){ console.warn('Failed to render recent scans', e); }
});

function sanitize(str) {
	return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}
