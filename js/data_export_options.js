// Data Export Options page scripts
// Handle exporting CSV locally based on OCR result stored in storage.

document.addEventListener('DOMContentLoaded', () => {
	const exportBtn = document.querySelector('footer button');
	if (!exportBtn) return;

	exportBtn.addEventListener('click', () => {
		// Determine selected destination & format (defaults already set in HTML)
		const dest = document.querySelector('input[name="export-destination"]:checked')?.value || 'local';
		const format = document.querySelector('input[name="file-format"]:checked')?.value || 'csv';

		if (format !== 'csv') {
			alert('Only CSV export is implemented in this prototype.');
			return;
		}

		// Retrieve OCR data (normalized)
		let raw = localStorage.getItem('ocrResultData') || sessionStorage.getItem('ocrResultData');
		if (!raw) {
			alert('No OCR data available to export.');
			return;
		}
		let parsed;
		try { parsed = JSON.parse(raw); } catch (e) { alert('Stored OCR data is invalid.'); return; }

		// Prefer csv_content from parsing step
		let csv = parsed.csv_content;

		// If not present, synthesize CSV from display_fields
		if (!csv && Array.isArray(parsed.display_fields) && parsed.display_fields.length) {
			const header = 'label,value';
			const lines = parsed.display_fields.map(f => {
				const label = (f.label || '').replace(/"/g,'""');
				const value = (f.value || '').replace(/"/g,'""');
				return `"${label}","${value}"`;
			});
			csv = [header, ...lines].join('\n');
		}

		if (!csv) {
			alert('No CSV data available.');
			return;
		}

			if (dest === 'local') {
				// Build summary object for Documents page
				try {
					const fields = Array.isArray(parsed.display_fields) ? parsed.display_fields : [];
					const findVal = (name) => {
						const lower = name.toLowerCase();
						const hit = fields.find(f => (f.label||'').toLowerCase().includes(lower));
						return hit ? hit.value : '';
					};
					const amount = findVal('amount') || findVal('total') || findVal('grand');
					const vendor = findVal('vendor') || findVal('issuer') || findVal('merchant');
					const docNum = findVal('number') || findVal('#') || findVal('invoice') || findVal('receipt');
					const docTypeGuess = (() => {
						const l = (fields.map(f=>f.label).join(' ') + ' ' + (docNum||'')).toLowerCase();
						if (l.includes('invoice')) return 'Invoice';
						if (l.includes('receipt')) return 'Receipt';
						if (l.includes('statement')) return 'Statement';
						return 'Document';
					})();
					const image = localStorage.getItem('scannedImageDataUrl') || sessionStorage.getItem('scannedImageDataUrl');
					const today = new Date();
					const dateStr = today.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
					const summary = {
						type: docTypeGuess,
						number: docNum || '',
						amount: amount || '',
						vendor: vendor || '',
						date: dateStr,
						image,
						ts: today.toISOString()
					};
					const summariesRaw = localStorage.getItem('exportedDocuments');
					const arr = summariesRaw ? JSON.parse(summariesRaw) : [];
					arr.unshift(summary);
					localStorage.setItem('exportedDocuments', JSON.stringify(arr.slice(0,50))); // keep last 50
				} catch(e) { console.warn('Failed to store export summary', e); }
				downloadCsv(csv, () => {
					window.location.href = 'Document_Management_Search.html';
				});
			} else {
			alert('Only Local Storage download implemented currently.');
		}
	});
});

	function downloadCsv(csv, cb) {
	try {
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
		a.href = url;
		a.download = `ocr_export_${ts}.csv`;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
				if (typeof cb === 'function') cb();
		}, 0);
	} catch (e) {
		console.error('CSV download failed', e);
		alert('Failed to download CSV.');
	}
}
