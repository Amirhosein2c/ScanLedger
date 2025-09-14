
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
});
