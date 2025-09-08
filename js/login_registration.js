// Login / Registration page scripts
// Add authentication logic here.
document.addEventListener('DOMContentLoaded', function() {
	const signUpLink = document.querySelector('footer .text-center a.font-medium');
	if (signUpLink) {
		signUpLink.addEventListener('click', function(e) {
			e.preventDefault();
			window.location.href = 'New_User_SignUp.html';
		});
	}
});
