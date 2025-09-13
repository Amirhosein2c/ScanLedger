// Document Management Search page scripts
// Render newly exported documents stored in localStorage.

document.addEventListener('DOMContentLoaded', () => {
	try {
		const container = document.querySelector('main .space-y-2');
		if (!container) return;
		const raw = localStorage.getItem('exportedDocuments');
		if (!raw) return;
		const list = JSON.parse(raw);
		if (!Array.isArray(list) || !list.length) return;

		// Insert new items BEFORE existing static items
		for (const doc of list) {
			if (!doc || doc._rendered) continue;
			const div = document.createElement('div');
			div.className = 'flex items-center gap-4 bg-[#1F2937] p-3 rounded-2xl';
			const imgStyle = doc.image ? `style="background-image: url('${doc.image}');"` : '';
			const title = `${doc.type}${doc.number ? ' #' + sanitize(doc.number) : ''}`;
			const amountStr = doc.amount ? sanitize(doc.amount.startsWith('$') ? doc.amount : ('$' + doc.amount)) : '';
			const vendorStr = sanitize(doc.vendor || '');
			const dateStr = sanitize(doc.date || '');
			div.innerHTML = `
				<div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-14" ${imgStyle}></div>
				<div class="flex-1">
					<p class="text-white text-base font-medium leading-normal line-clamp-1">${title}</p>
					<p class="text-[#D1D5DB] text-sm font-normal leading-normal line-clamp-2">${dateStr}</p>
				</div>
				<div class="text-right">
					<p class="text-white text-base font-bold">${amountStr}</p>
					<p class="text-[#D1D5DB] text-sm">${vendorStr}</p>
				</div>`;
			container.insertBefore(div, container.firstChild);
			doc._rendered = true;
		}
	} catch (e) {
		console.warn('Failed to render exported documents list', e);
	}
});

function sanitize(str) {
	return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
