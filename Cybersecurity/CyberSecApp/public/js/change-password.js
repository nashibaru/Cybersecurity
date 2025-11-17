// change-password.js - Password change functionality with reCAPTCHA
document.addEventListener('DOMContentLoaded', function() {
    initializePasswordForm();
});

function initializePasswordForm() {
    const form = document.getElementById('passwordForm');
    const submitButton = document.getElementById('submitButton');
    const recaptchaError = document.getElementById('recaptchaError');
    
    if (!form) return;

    // Password confirmation validation
    const newPassword2 = document.getElementById('new_password2');
    if (newPassword2) {
        newPassword2.addEventListener('input', validatePasswordMatch);
    }

    // Form submission handler
    form.addEventListener('submit', handleFormSubmit);
}

function validatePasswordMatch() {
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = this.value;
    
    if (newPassword !== confirmPassword) {
        this.setCustomValidity('Hasła nie są identyczne');
    } else {
        this.setCustomValidity('');
    }
}

function handleFormSubmit(e) {
    const recaptchaResponse = grecaptcha.getResponse();
    
    if (!recaptchaResponse) {
        e.preventDefault();
        document.getElementById('recaptchaError').style.display = 'block';
        return false;
    }
}

// reCAPTCHA callbacks - these are called by Google reCAPTCHA
window.onRecaptchaSuccess = function(token) {
    document.getElementById('recaptchaError').style.display = 'none';
    document.getElementById('submitButton').disabled = false;
};

window.onRecaptchaExpired = function() {
    document.getElementById('recaptchaError').style.display = 'block';
    document.getElementById('submitButton').disabled = true;
};

window.onRecaptchaError = function() {
    document.getElementById('recaptchaError').style.display = 'block';
    document.getElementById('submitButton').disabled = true;
};