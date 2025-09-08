
// Document Scan page scripts
// Add camera / scanning interactions here.
document.addEventListener('DOMContentLoaded', function() {
	const video = document.getElementById('camera-stream');
	const img = document.getElementById('captured-image');
	const scanBg = document.getElementById('scan-bg');
	const captureBtn = document.querySelector('button span.material-symbols-outlined.text-4xl')?.parentElement;
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
		});
	}
});
