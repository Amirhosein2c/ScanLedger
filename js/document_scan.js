
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
	// Header buttons: first = flash, last = close (already handled elsewhere)
	const headerFlashBtn = document.querySelector('header button:first-of-type');
	// Top-right close (X) button: last button inside header
	const headerCloseBtn = document.querySelector('header button:last-of-type');
	const scanContainer = document.getElementById('camera-stream')?.parentElement; // container holding video/image
	let uploadedPdfData = null; // store PDF ArrayBuffer/base64 if needed
	let stream = null;
	let processingOverlay = null;

	// Handle flash / torch support detection
	let torchSupported = false;
	let torchOn = false;
	function disableFlashButton(reason) {
		if (!headerFlashBtn) return;
		headerFlashBtn.disabled = true;
		headerFlashBtn.title = reason || 'Flash not supported';
		headerFlashBtn.classList.add('opacity-40','pointer-events-none');
		const icon = headerFlashBtn.querySelector('.material-symbols-outlined');
		if (icon) icon.textContent = 'flash_off';
	}
	function enableFlashButton() {
		if (!headerFlashBtn) return;
		headerFlashBtn.disabled = false;
		headerFlashBtn.classList.remove('opacity-40','pointer-events-none');
		const icon = headerFlashBtn.querySelector('.material-symbols-outlined');
		if (icon) icon.textContent = torchOn ? 'flash_on' : 'flash_off';
	}

	// Start camera on load and detect torch capability
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		const constraints = { video: { facingMode: { ideal: 'environment' } } };
		navigator.mediaDevices.getUserMedia(constraints)
			.then(function(mediaStream) {
				stream = mediaStream;
				video.srcObject = mediaStream;
				video.classList.remove('hidden');
				scanBg.classList.add('hidden');
				// Torch detection
				try {
					const track = stream.getVideoTracks()[0];
					if (track && typeof track.getCapabilities === 'function') {
						const caps = track.getCapabilities();
						if (caps && 'torch' in caps) {
							torchSupported = true;
							enableFlashButton();
						} else {
							disableFlashButton('Flash not supported');
						}
					} else {
						disableFlashButton('Flash not supported');
					}
				} catch (e) {
					disableFlashButton('Flash error');
				}
			})
			.catch(function(err) {
				scanBg.classList.remove('hidden');
				alert('Could not access camera: ' + err.message);
				disableFlashButton('Camera unavailable');
			});
	} else {
		disableFlashButton('Media devices unsupported');
	}

	// Flash toggle handler
	if (headerFlashBtn) {
		headerFlashBtn.addEventListener('click', function() {
			if (!torchSupported || !stream) return;
			try {
				const track = stream.getVideoTracks()[0];
				if (!track) return;
				torchOn = !torchOn;
				track.applyConstraints({ advanced: [{ torch: torchOn }] }).catch(() => {
					// Revert on failure
					torchOn = !torchOn;
				});
				const icon = headerFlashBtn.querySelector('.material-symbols-outlined');
				if (icon) icon.textContent = torchOn ? 'flash_on' : 'flash_off';
			} catch (e) {
				console.warn('Torch toggle failed', e);
			}
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
	// Close button navigation
	if (headerCloseBtn) {
		headerCloseBtn.addEventListener('click', () => {
			window.location.href = 'Dashboard_Overview.html';
		});
	}

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
		confirmBtn.addEventListener('click', async function() {
			if (confirmBtn.disabled) return;
			if (!img || img.classList.contains('hidden') || !img.src) return;

			// OCR endpoint via Netlify proxy (avoid mixed content)
			const ocrPath = '/multi-agent-ocr';

			// Helper: convert dataURL to Blob
			function dataURLtoBlob(dataUrl) {
				const parts = dataUrl.split(',');
				const meta = parts[0];
				const base64 = parts[1];
				const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'image/png';
				const binary = atob(base64);
				const len = binary.length;
				const bytes = new Uint8Array(len);
				for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
				return new Blob([bytes], { type: mime });
			}

			// Visual feedback (button spinner + overlay message)
			const originalIcon = confirmBtn.innerHTML;
			confirmBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-2xl">progress_activity</span>';
			confirmBtn.disabled = true;
			confirmBtn.classList.add('opacity-70','pointer-events-none');

			showProcessingMessage();

			try {
				// Re-encode image to reduce size (avoid 504 on backend). Target ~0.75 quality JPEG.
				async function recompress(dataUrl, quality=0.95) {
					return await new Promise((resolve, reject) => {
						const i = new Image();
						i.onload = () => {
							try {
								const c = document.createElement('canvas');
								c.width = i.width; c.height = i.height;
								const ctx2 = c.getContext('2d');
								ctx2.drawImage(i, 0, 0);
								c.toBlob(b => b ? resolve(b) : reject(new Error('Blob fail')), 'image/jpeg', quality);
							} catch(e){ reject(e); }
						};
						i.onerror = () => reject(new Error('Image load fail'));
						i.src = dataUrl;
					});
				}
				let blob;
				try { blob = await recompress(img.src, 0.7); } catch { blob = dataURLtoBlob(img.src); }
				const formData = new FormData();
				const isPdfDerived = !!uploadedPdfData; // if came from PDF render
				const filename = isPdfDerived ? 'scanned_pdf_page.png' : 'scanned_image.png';
				formData.append('file', blob, filename);
				formData.append('source', isPdfDerived ? 'pdf_first_page_render' : 'camera_capture');
				formData.append('timestamp', new Date().toISOString());

				// Store locally for subsequent page, non-blocking
				try { sessionStorage.setItem('scannedImageDataUrl', img.src); } catch (e) { /* ignore */ }
				try { localStorage.setItem('scannedImageDataUrl', img.src); } catch (e) { /* ignore */ }

				const controller = new AbortController();
				const timeout = setTimeout(()=>controller.abort(), 120000); // 60s timeout
				let response;
				try {
					response = await fetch(`${window.API_BASE}${ocrPath}`, { method: 'POST', body: formData, signal: controller.signal });
				} catch(fetchErr) {
					if (controller.signal.aborted) throw new Error('Upload timed out. Please retry.');
					throw fetchErr;
				} finally { clearTimeout(timeout); }
				if (!response.ok) throw new Error('Upload failed: ' + response.status + ' ' + response.statusText);

				// Optionally capture response data (not required). If JSON attempt parse.
				let resultText = '';
				try {
					const ct = response.headers.get('content-type') || '';
					let rawObj = null;
					if (ct.includes('application/json')) {
						try { rawObj = await response.json(); } catch(_) {}
					} else {
						// attempt clone->text parse
						try {
							resultText = await response.text();
							try { rawObj = JSON.parse(resultText); } catch(_) {}
						} catch(_) {}
					}

					// Normalization for various n8n shapes: rawObj may be
					// 1) An array of items
					// 2) { data: [ items ] }
					// 3) Single object already containing display_fields
					let normalized = { display_fields: [], csv_content: null, raw: rawObj };
					try {
						let items = [];
						if (Array.isArray(rawObj)) items = rawObj;
						else if (rawObj && Array.isArray(rawObj.data)) items = rawObj.data;
						else if (rawObj) items = [rawObj];

						const collectedFields = [];
						for (const it of items) {
							const binaries = it?.binary || it?.json?.binary || it?.json?.data?.binary;
							const possibleDisplay = binaries?.display_data || binaries?.display || binaries?.display_json;
							if (possibleDisplay?.data) {
								try {
									const decoded = decodeBase64ToText(possibleDisplay.data);
									const dispJson = safeJsonParse(decoded);
									if (dispJson) {
										const f = extractDisplayFields(dispJson);
										if (f.length) collectedFields.push(...f);
									}
								} catch(e) { console.warn('display_data decode error', e); }
							}
							const csvBin = binaries?.csv_data || binaries?.csv || binaries?.csvfile;
							if (csvBin?.data && !normalized.csv_content) {
								try { normalized.csv_content = decodeBase64ToText(csvBin.data); } catch(e) {}
							}
							// Also check json directly for display_fields
							const jsonSection = it?.json || it;
							if (jsonSection) {
								const f2 = extractDisplayFields(jsonSection);
								if (f2.length) collectedFields.push(...f2);
							}
						}
						// Deduplicate by label+value
						const seen = new Set();
						normalized.display_fields = collectedFields.filter(f => {
							const key = (f.label||'') + '|' + (f.value||'');
							if (seen.has(key)) return false;
							seen.add(key); return true;
						});
						// direct fallback
						if (!normalized.display_fields.length && rawObj?.display_fields) {
							const direct = extractDisplayFields(rawObj);
							if (direct.length) normalized.display_fields = direct;
						}
						resultText = JSON.stringify(normalized);
					} catch(e) {
						console.warn('Normalization error', e);
						resultText = JSON.stringify({ raw: rawObj });
					}

					try { sessionStorage.setItem('ocrResultData', resultText); } catch (e) { /* ignore */ }
					try { localStorage.setItem('ocrResultData', resultText); } catch (e) { /* ignore */ }
					console.log('Webhook response:', resultText);
				} catch (e) { /* swallow parse errors */ }

				// Navigate after successful upload (overlay stays until new page loads)
				window.location.href = 'Document_Details_Edit.html';
			} catch (err) {
				console.error(err);
				alert('Failed to send image to processing workflow. Please try again.');
				confirmBtn.innerHTML = originalIcon; // restore
				confirmBtn.disabled = false;
				confirmBtn.classList.remove('opacity-70','pointer-events-none');
				hideProcessingMessage();
			} 
		});
	}

	function showProcessingMessage() {
		if (!scanContainer) return;
		if (processingOverlay) return; // already shown
		processingOverlay = document.createElement('div');
		processingOverlay.id = 'processing-overlay';
		processingOverlay.className = 'absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm text-center p-4 z-30';
		processingOverlay.innerHTML = `
			<div class="flex flex-col items-center gap-3">
				<span class="material-symbols-outlined animate-spin text-5xl text-green-400">progress_activity</span>
				<p class="text-white font-medium text-lg leading-snug">Processing the document,<br/>Please wait!</p>
				<p class="text-white/60 text-xs max-w-xs">Do not close this tab. Upload & OCR may take a few seconds.</p>
			</div>`;
		// Ensure relative positioning on container
		if (!scanContainer.classList.contains('relative')) scanContainer.classList.add('relative');
		// Hide guidance text if present
		const guide = scanContainer.querySelector('p');
		if (guide) guide.classList.add('opacity-0');
		scanContainer.appendChild(processingOverlay);
	}

	function hideProcessingMessage() {
		if (processingOverlay?.parentElement) {
			processingOverlay.parentElement.removeChild(processingOverlay);
		}
		processingOverlay = null;
		// Restore guidance text if still on this page and capture not confirmed
		if (scanContainer) {
			const guide = scanContainer.querySelector('p');
			if (guide) guide.classList.remove('opacity-0');
		}
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

	function decodeBase64ToText(b64) {
		try {
			if (typeof atob === 'function') {
				return decodeURIComponent(escape(atob(b64)));
			}
		} catch(e) {
			try { return atob(b64); } catch(_) {}
		}
		return '';
	}

	function safeJsonParse(text) {
		try { return JSON.parse(text); } catch(_) { return null; }
	}

	function extractDisplayFields(obj) {
		if (!obj || typeof obj !== 'object') return [];
		if (Array.isArray(obj.display_fields)) return sanitizeFields(obj.display_fields);
		if (Array.isArray(obj.fields)) return sanitizeFields(obj.fields);
		if (Array.isArray(obj)) return sanitizeFields(obj);
		return [];
	}

	function sanitizeFields(arr) {
		return arr
			.filter(f => f && (f.label || f.name || f.key))
			.map(f => ({
				label: String(f.label || f.name || f.key || ''),
				value: f.value != null ? String(f.value) : ''
			}));
	}
});
