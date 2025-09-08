// Document Details Edit page scripts
// Load scanned image from sessionStorage if present.

document.addEventListener('DOMContentLoaded', () => {
	const imgEl = document.getElementById('review-image');
	try {
		const stored = sessionStorage.getItem('scannedImageDataUrl');
		if (stored && imgEl) {
			imgEl.src = stored;
		}
	} catch (e) {
		console.warn('Unable to read scanned image from sessionStorage', e);
	}

	// Discard button behavior
	const discardBtn = document.getElementById('discard-btn');
	if (discardBtn) {
		discardBtn.addEventListener('click', () => {
			try { sessionStorage.removeItem('scannedImageDataUrl'); } catch (e) { /* ignore */ }
			window.location.href = 'Document_Scan.html';
		});
	}
});

// Add form validation / save logic here.
