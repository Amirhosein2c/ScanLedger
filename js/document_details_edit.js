// Document Details Edit page scripts
// Load scanned image from sessionStorage if present.

document.addEventListener('DOMContentLoaded', () => {
	const imgEl = document.getElementById('review-image');
	try {
		let stored = sessionStorage.getItem('scannedImageDataUrl');
		if (!stored) stored = localStorage.getItem('scannedImageDataUrl');
		if (stored && imgEl) {
			imgEl.src = stored;
		} else {
			console.log('[OCR] No stored scannedImageDataUrl found in sessionStorage/localStorage');
		}
	} catch (e) {
		console.warn('Unable to read scanned image from storage', e);
	}

	// Dynamic OCR fields
	try {
		let raw = sessionStorage.getItem('ocrResultData');
		if (!raw) raw = localStorage.getItem('ocrResultData');
		if (raw) {
			const parsed = JSON.parse(raw);
			let fields = Array.isArray(parsed.display_fields) ? parsed.display_fields : [];
			// Fallback: maybe data.raw or raw.raw contains display_fields
			if (!fields.length && parsed.raw) {
				if (Array.isArray(parsed.raw.display_fields)) fields = parsed.raw.display_fields;
				else if (Array.isArray(parsed.raw.fields)) fields = parsed.raw.fields;
				// Fallback: raw may be array or object with binary.
				if (!fields.length) {
					const candidates = Array.isArray(parsed.raw) ? parsed.raw : [parsed.raw];
					for (const c of candidates) {
						const binaries = c?.binary || c?.json?.binary;
						const disp = binaries?.display_data || binaries?.display || binaries?.display_json;
						if (disp?.data) {
							try {
								const decoded = atob(disp.data);
								try {
									const dj = JSON.parse(decoded);
									if (Array.isArray(dj.display_fields)) { fields = dj.display_fields; break; }
									if (Array.isArray(dj.fields)) { fields = dj.fields; break; }
									if (Array.isArray(dj)) { fields = dj; break; }
								} catch(_) {}
							} catch(_) {}
						}
						if (fields.length) break;
					}
				}
			}
			const container = document.getElementById('extracted-fields-container');
			if (container && fields.length) {
				container.innerHTML = '';
				const defaultBlock = document.getElementById('default-fields-block');
				if (defaultBlock) defaultBlock.classList.add('hidden');
				fields.forEach((f, idx) => {
					const label = (f.label || f.name || `Field ${idx+1}`).toString();
					const value = (f.value ?? '').toString();
					const fieldWrap = document.createElement('label');
					fieldWrap.className = 'block';
					fieldWrap.innerHTML = `
						<span class="text-sm font-medium text-[var(--text-secondary)]">${escapeHtml(label)}</span>
						<input data-dynamic-field="${escapeAttr(label)}" class="mt-1 block w-full rounded-xl border-transparent bg-[var(--input-bg)] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50" type="text" value="${escapeAttr(value)}" />
					`;
					container.appendChild(fieldWrap);
				});
				// Optionally store csv content for export later
				if (parsed.csv_content) {
					try { sessionStorage.setItem('ocrCsvContent', parsed.csv_content); } catch (e) {}
				}
			} else {
				console.log('[OCR] display_fields empty or container missing. Parsed keys:', Object.keys(parsed));
			}
		}
	} catch (e) {
		console.warn('Unable to render OCR fields', e);
	}

	// Discard button behavior
	const discardBtn = document.getElementById('discard-btn');
	if (discardBtn) {
		discardBtn.addEventListener('click', () => {
			try { sessionStorage.removeItem('scannedImageDataUrl'); } catch (e) { /* ignore */ }
			window.location.href = 'Document_Scan.html';
		});
	}

	const saveBtn = document.getElementById('save-btn');
	if (saveBtn) {
		saveBtn.addEventListener('click', () => {
			// Persist any edited dynamic fields back into storage
			try {
				const dynFields = Array.from(document.querySelectorAll('input[data-dynamic-field]')).map(inp => ({
					label: inp.getAttribute('data-dynamic-field'),
					value: inp.value
				}));
				if (dynFields.length) {
					const storedRaw = localStorage.getItem('ocrResultData') || sessionStorage.getItem('ocrResultData');
					if (storedRaw) {
						const obj = JSON.parse(storedRaw);
						obj.display_fields = dynFields;
						const serialized = JSON.stringify(obj);
						try { sessionStorage.setItem('ocrResultData', serialized); } catch(_) {}
						try { localStorage.setItem('ocrResultData', serialized); } catch(_) {}
					}
				}
			} catch(e) { console.warn('Failed to persist edited dynamic fields', e); }
			window.location.href = 'Data_Export_Options.html';
		});
	}
});

// Basic HTML escaping helpers
function escapeHtml(str) {
	return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
function escapeAttr(str) {
	return escapeHtml(str).replace(/`/g,'&#96;');
}

// Add form validation / save logic here.
