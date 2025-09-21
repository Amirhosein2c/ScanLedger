// Document Details Edit page scripts
// Load scanned image from sessionStorage if present and handle n8n OCR results.

document.addEventListener('DOMContentLoaded', () => {
	// Load scanned image
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

	// Load and render OCR results from n8n backend
	try {
		let raw = sessionStorage.getItem('ocrResultData');
		if (!raw) raw = localStorage.getItem('ocrResultData');
		
		if (raw) {
			const parsed = JSON.parse(raw);
			console.log('[OCR] Parsed OCR data:', parsed);
			
			// Handle n8n response format - could be array or nested object
			let ocrFields = extractOcrFields(parsed);
			
			const container = document.getElementById('extracted-fields-container');
			const defaultBlock = document.getElementById('default-fields-block');
			
			if (container && ocrFields.length > 0) {
				console.log('[OCR] Rendering', ocrFields.length, 'extracted fields');
				container.innerHTML = '';
				
				// Hide default fields when we have OCR data
				if (defaultBlock) defaultBlock.classList.add('hidden');
				
				// Create input fields for each extracted field
				ocrFields.forEach((field, idx) => {
					const fieldWrap = document.createElement('label');
					fieldWrap.className = 'block';
					
					// Create appropriate input type based on field name/content
					const inputType = getInputType(field.label, field.value);
					const inputElement = createInputElement(field.label, field.value, inputType);
					
					fieldWrap.innerHTML = `
						<span class="text-sm font-medium text-[var(--text-secondary)]">${escapeHtml(field.label)}</span>
						${inputElement}
					`;
					container.appendChild(fieldWrap);
				});
				
				// Store fields for CSV generation
				const csvData = generateCsvFromFields(ocrFields);
				try {
					sessionStorage.setItem('ocrCsvContent', csvData);
					localStorage.setItem('ocrCsvContent', csvData);
				} catch (e) {
					console.warn('Failed to store CSV data', e);
				}
			} else {
				console.log('[OCR] No extractable fields found, showing default form');
				// Keep default fields visible
			}
		} else {
			console.log('[OCR] No OCR result data found in storage');
		}
	} catch (e) {
		console.warn('Unable to render OCR fields', e);
	}

	// Discard button behavior
	const discardBtn = document.getElementById('discard-btn');
	if (discardBtn) {
		discardBtn.addEventListener('click', () => {
			// Clear stored data
			try { 
				sessionStorage.removeItem('scannedImageDataUrl');
				sessionStorage.removeItem('ocrResultData');
				localStorage.removeItem('scannedImageDataUrl');
				localStorage.removeItem('ocrResultData');
			} catch (e) { /* ignore */ }
			window.location.href = 'Document_Scan.html';
		});
	}

	// Save button behavior
	const saveBtn = document.getElementById('save-btn');
	if (saveBtn) {
		saveBtn.addEventListener('click', () => {
			// Collect all field values (both dynamic and default)
			const allFields = [];
			
			// Get dynamic OCR fields
			const dynFields = Array.from(document.querySelectorAll('input[data-dynamic-field]')).map(inp => ({
				label: inp.getAttribute('data-dynamic-field'),
				value: inp.value.trim()
			}));
			
			if (dynFields.length > 0) {
				allFields.push(...dynFields);
			} else {
				// Fallback to default fields if no OCR fields
				const defaultFields = [
					{ label: 'Date', value: document.querySelector('input[type="date"]')?.value || '' },
					{ label: 'Amount', value: document.querySelector('input[type="text"]')?.value || '' },
					{ label: 'Vendor', value: document.querySelector('input[placeholder*="Starbucks"]')?.value || '' },
					{ label: 'Category', value: document.querySelector('select')?.value || '' }
				];
				allFields.push(...defaultFields.filter(f => f.value));
			}

			// Update stored OCR data with edited values
			try {
				const updatedData = {
					display_fields: allFields,
					csv_content: generateCsvFromFields(allFields),
					timestamp: new Date().toISOString()
				};
				
				const serialized = JSON.stringify(updatedData);
				sessionStorage.setItem('ocrResultData', serialized);
				localStorage.setItem('ocrResultData', serialized);
				
				console.log('[OCR] Saved', allFields.length, 'fields for export');
			} catch (e) {
				console.warn('Failed to persist edited fields', e);
			}
			
			// Navigate to export options
			window.location.href = 'Data_Export_Options.html';
		});
	}
});

/**
 * Extract OCR fields from various n8n response formats
 */
function extractOcrFields(data) {
	const fields = [];
	
	try {
		// Handle direct array format: [{ "Date": "value", "Invoice #": "value", ... }]
		if (Array.isArray(data) && data.length > 0) {
			const firstItem = data[0];
			if (firstItem && typeof firstItem === 'object') {
				for (const [key, value] of Object.entries(firstItem)) {
					if (value !== null && value !== undefined && String(value).trim()) {
						fields.push({
							label: key,
							value: String(value).trim()
						});
					}
				}
			}
		}
		// Handle nested format with 'data' property
		else if (data && Array.isArray(data.data) && data.data.length > 0) {
			const firstItem = data.data[0];
			if (firstItem && typeof firstItem === 'object') {
				for (const [key, value] of Object.entries(firstItem)) {
					if (value !== null && value !== undefined && String(value).trim()) {
						fields.push({
							label: key,
							value: String(value).trim()
						});
					}
				}
			}
		}
		// Handle object format: { "Date": "value", "Invoice #": "value", ... }
		else if (data && typeof data === 'object' && !Array.isArray(data)) {
			for (const [key, value] of Object.entries(data)) {
				// Skip metadata fields
				if (['display_fields', 'csv_content', 'timestamp', 'raw'].includes(key)) continue;
				
				if (value !== null && value !== undefined && String(value).trim()) {
					fields.push({
						label: key,
						value: String(value).trim()
					});
				}
			}
		}
		// Handle legacy format with display_fields
		else if (data && Array.isArray(data.display_fields)) {
			return data.display_fields.filter(f => f && f.label && f.value);
		}
	} catch (e) {
		console.warn('Error extracting OCR fields', e);
	}
	
	return fields;
}

/**
 * Determine appropriate input type based on field name and value
 */
function getInputType(label, value) {
	const labelLower = label.toLowerCase();
	
	// Date fields
	if (labelLower.includes('date') || labelLower.includes('due')) {
		// Try to parse the date value
		const dateValue = parseDate(value);
		return dateValue ? 'date' : 'text';
	}
	
	// Amount/monetary fields
	if (labelLower.includes('amount') || labelLower.includes('total') || 
		labelLower.includes('price') || labelLower.includes('subtotal') ||
		labelLower.includes('tax') || value.includes('$')) {
		return 'currency';
	}
	
	// Email fields
	if (labelLower.includes('email')) {
		return 'email';
	}
	
	// Phone fields
	if (labelLower.includes('phone') || labelLower.includes('tel')) {
		return 'tel';
	}
	
	// Default to text
	return 'text';
}

/**
 * Create appropriate input element HTML
 */
function createInputElement(label, value, type) {
	const baseClasses = 'mt-1 block w-full rounded-xl border-transparent bg-[var(--input-bg)] px-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50';
	
	switch (type) {
		case 'date':
			const dateValue = parseDate(value);
			return `<input data-dynamic-field="${escapeAttr(label)}" class="${baseClasses}" type="date" value="${dateValue || ''}" />`;
		
		case 'currency':
			const numericValue = value.replace(/[^0-9.-]/g, '');
			return `
				<div class="relative mt-1">
					<span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--text-secondary)]">$</span>
					<input data-dynamic-field="${escapeAttr(label)}" class="block w-full rounded-xl border-transparent bg-[var(--input-bg)] pl-8 pr-4 py-3 text-base text-white focus:border-[var(--primary-color)] focus:ring focus:ring-[var(--primary-color)] focus:ring-opacity-50" type="text" value="${escapeAttr(numericValue)}" />
				</div>
			`;
		
		case 'email':
			return `<input data-dynamic-field="${escapeAttr(label)}" class="${baseClasses}" type="email" value="${escapeAttr(value)}" />`;
		
		case 'tel':
			return `<input data-dynamic-field="${escapeAttr(label)}" class="${baseClasses}" type="tel" value="${escapeAttr(value)}" />`;
		
		default:
			return `<input data-dynamic-field="${escapeAttr(label)}" class="${baseClasses}" type="text" value="${escapeAttr(value)}" />`;
	}
}

/**
 * Parse date string to YYYY-MM-DD format for date input
 */
function parseDate(dateStr) {
	if (!dateStr) return '';
	
	try {
		// Try various date formats
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return '';
		
		// Format as YYYY-MM-DD
		return date.toISOString().split('T')[0];
	} catch (e) {
		return '';
	}
}

/**
 * Generate CSV content from fields array
 */
function generateCsvFromFields(fields) {
	if (!fields || fields.length === 0) return '';
	
	const header = 'Field,Value';
	const rows = fields.map(field => {
		const label = (field.label || '').replace(/"/g, '""');
		const value = (field.value || '').replace(/"/g, '""');
		return `"${label}","${value}"`;
	});
	
	return [header, ...rows].join('\n');
}

/**
 * HTML escaping helpers
 */
function escapeHtml(str) {
	return String(str).replace(/[&<>"']/g, c => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	}[c]));
}

function escapeAttr(str) {
	return escapeHtml(String(str)).replace(/`/g, '&#96;');
}