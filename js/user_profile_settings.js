// Display user's name and surname from localStorage if available
document.addEventListener('DOMContentLoaded', function() {
	const fullnameElem = document.getElementById('user-fullname');
	if (fullnameElem) {
		const name = localStorage.getItem('user_name');
		const surname = localStorage.getItem('user_surname');
		if (name && surname) {
			fullnameElem.textContent = name + ' ' + surname;
		}
	}
});
// User Profile Settings page scripts
// Add settings interactions here.
