// captcha.js - CAPTCHA functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeCaptcha();
});

function initializeCaptcha() {
    const captchaImages = document.querySelectorAll('.captcha-image');
    const selectedCount = document.getElementById('selectedCount');
    const submitButton = document.getElementById('submitBtn');
    
    // Add click event listeners to all captcha images
    captchaImages.forEach(image => {
        image.addEventListener('click', function() {
            toggleImage(this);
        });
        
        // Add keyboard accessibility
        image.setAttribute('tabindex', '0');
        image.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleImage(this);
            }
        });
    });
    
    // Add error handling for images
    const captchaImgs = document.querySelectorAll('.captcha-image img');
    captchaImgs.forEach(img => {
        img.addEventListener('error', function() {
            handleImageError(this);
        });
    });
}

function toggleImage(element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    const isSelected = element.classList.contains('selected');
    
    if (isSelected) {
        element.classList.remove('selected');
        checkbox.checked = false;
    } else {
        element.classList.add('selected');
        checkbox.checked = true;
    }
    
    updateSelectionCount();
}

function updateSelectionCount() {
    const selectedCount = document.querySelectorAll('.captcha-image.selected').length;
    const selectedCountElement = document.getElementById('selectedCount');
    const submitButton = document.getElementById('submitBtn');
    
    if (selectedCountElement) {
        selectedCountElement.textContent = selectedCount;
    }
    
    if (submitButton) {
        submitButton.disabled = selectedCount === 0;
    }
}

function handleImageError(imgElement) {
    // Replace broken image with a placeholder
    const parent = imgElement.parentElement;
    imgElement.style.display = 'none';
    
    // Create a placeholder div
    const placeholder = document.createElement('div');
    placeholder.style.width = '100%';
    placeholder.style.height = '120px';
    placeholder.style.background = 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.color = 'white';
    placeholder.style.fontWeight = 'bold';
    placeholder.textContent = imgElement.alt || 'Image';
    
    parent.insertBefore(placeholder, imgElement.nextSibling);
}