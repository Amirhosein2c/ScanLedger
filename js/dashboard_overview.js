
// Dashboard Overview page scripts
// Add interactive logic here.
document.addEventListener('DOMContentLoaded', function() {
	const scanBtn = document.getElementById('scan-new-doc-btn');
	if (scanBtn) {
		scanBtn.addEventListener('click', function() {
			window.location.href = 'Document_Scan.html';
		});
	}
});
