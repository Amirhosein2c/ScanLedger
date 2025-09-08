
// Document Scan page scripts
// Add camera / scanning interactions here.
document.addEventListener('DOMContentLoaded', function() {
	const video = document.getElementById('camera-stream');
	const img = document.getElementById('captured-image');
	const scanBg = document.getElementById('scan-bg');
	const captureBtn = document.querySelector('button span.material-symbols-outlined.text-4xl')?.parentElement;
	const retakeBtn = document.getElementById('retake-btn');
	const confirmBtn = document.getElementById('confirm-btn');
	const pdfUploadBtn = document.getElementById('pdf-upload-btn');
	const pdfFileInput = document.getElementById('pdf-file-input');
	let uploadedPdfData = null; // store PDF ArrayBuffer/base64 if needed
	let stream = null;

	// Start camera on load
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
			.then(function(mediaStream) {
				stream = mediaStream;
				video.srcObject = mediaStream;
				video.classList.remove('hidden');
				scanBg.classList.add('hidden');
			})
			.catch(function(err) {
				scanBg.classList.remove('hidden');
				alert('Could not access camera: ' + err.message);
			});
	}

	function enableActionButtons() {
		[retakeBtn, confirmBtn].forEach(btn => {
			if (!btn) return;
			btn.disabled = false;
			btn.setAttribute('aria-disabled', 'false');
			btn.classList.remove('opacity-40', 'pointer-events-none');
			btn.classList.remove('text-white/60');
		});
		// Colorize icons
		if (retakeBtn) retakeBtn.querySelector('span')?.classList.add('text-red-400');
		if (confirmBtn) confirmBtn.querySelector('span')?.classList.add('text-green-400');
	}

	function disableActionButtons() {
		[retakeBtn, confirmBtn].forEach(btn => {
			if (!btn) return;
			btn.disabled = true;
			btn.setAttribute('aria-disabled', 'true');
			btn.classList.add('opacity-40', 'pointer-events-none');
			btn.classList.add('text-white/60');
		});
		if (retakeBtn) retakeBtn.querySelector('span')?.classList.remove('text-red-400');
		if (confirmBtn) confirmBtn.querySelector('span')?.classList.remove('text-green-400');
	}

	// Capture photo
	if (captureBtn) {
		captureBtn.addEventListener('click', function() {
			if (!video || video.classList.contains('hidden')) return;
			const canvas = document.createElement('canvas');
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext('2d');
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			const dataUrl = canvas.toDataURL('image/png');
			img.src = dataUrl;
			img.classList.remove('hidden');
			video.classList.add('hidden');
			enableActionButtons();
		});
	}

	// Retake logic
	if (retakeBtn) {
		retakeBtn.addEventListener('click', function() {
			if (!img || img.classList.contains('hidden')) return; // nothing to retake
			img.classList.add('hidden');
			video.classList.remove('hidden');
			disableActionButtons();
		});
	}

	// Confirm logic (placeholder: could navigate / save)
	if (confirmBtn) {
		confirmBtn.addEventListener('click', function() {
			if (confirmBtn.disabled) return;
			if (!img || img.classList.contains('hidden') || !img.src) return;
			try {
				sessionStorage.setItem('scannedImageDataUrl', img.src);
			} catch (e) {
				console.warn('Could not save image to sessionStorage', e);
			}
			// Navigate to review/edit page
			window.location.href = 'Document_Details_Edit.html';
		});
	}

	// Ensure buttons start disabled
	disableActionButtons();

	// PDF Upload handling
	if (pdfUploadBtn && pdfFileInput) {
		pdfUploadBtn.addEventListener('click', () => pdfFileInput.click());
		pdfFileInput.addEventListener('change', async (e) => {
			const file = e.target.files?.[0];
			if (!file) return;
			if (file.type !== 'application/pdf') {
				alert('Please select a PDF file.');
				return;
			}
			try {
				const arrayBuffer = await file.arrayBuffer();
				uploadedPdfData = arrayBuffer; // keep raw data if needed later
				await ensurePdfJs();
				const pdfjs = window['pdfjsLib'];
				if (!pdfjs) throw new Error('PDF.js still not available');
				const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
				const page = await pdf.getPage(1);
				const viewport = page.getViewport({ scale: 1.5 });
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				canvas.width = viewport.width;
				canvas.height = viewport.height;
				await page.render({ canvasContext: ctx, viewport }).promise;
				const dataUrl = canvas.toDataURL('image/png');
				img.src = dataUrl;
				img.classList.remove('hidden');
				video.classList.add('hidden');
				// enable confirm (retake resets camera)
				enableActionButtons();
			} catch (err) {
				console.error('Error processing PDF', err);
				alert('Could not load PDF.');
			}
		});
	}

	async function ensurePdfJs() {
		if (window['pdfjsLib']) {
			// ensure worker configured
			if (!window['pdfjsLib'].GlobalWorkerOptions.workerSrc) {
				window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
			}
			return;
		}
		await new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
			script.onload = () => {
				if (window['pdfjsLib']) {
					window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
					resolve();
				} else {
					reject(new Error('PDF.js failed to load'));
				}
			};
			script.onerror = () => reject(new Error('Network error loading PDF.js'));
			document.head.appendChild(script);
		});
	}
});
