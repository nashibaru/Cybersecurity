// Admin Users Management JavaScript
class AdminUsersManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    // Generate OTP for new user
    const generateBtn = document.getElementById('generateOtpBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateOTP('new'));
    }

    // Generate OTP for edit user
    const generateEditBtn = document.getElementById('generateOtpBtnEdit');
    if (generateEditBtn) {
      generateEditBtn.addEventListener('click', () => this.generateOTP('edit'));
    }

    // Form validation
    const userForm = document.querySelector('form[action*="/users/add"]');
    if (userForm) {
      userForm.addEventListener('submit', (e) => this.validateUserForm(e));
    }

    // Delete confirmation
    const deleteForms = document.querySelectorAll('form[action*="/delete"]');
    deleteForms.forEach(form => {
      form.addEventListener('submit', (e) => this.confirmDelete(e));
    });
  }

  async generateOTP(context) {
    const usernameInput = context === 'new' 
      ? document.getElementById('new_username')
      : document.getElementById('edit_username');
    
    const passwordInput = context === 'new'
      ? document.getElementById('temp_password')
      : document.getElementById('edit_temp_password');

    const button = context === 'new'
      ? document.getElementById('generateOtpBtn')
      : document.getElementById('generateOtpBtnEdit');

    if (!usernameInput?.value?.trim()) {
      this.showAlert('Podaj najpierw nazwę użytkownika.', 'error');
      return;
    }

    const username = usernameInput.value.trim();
    
    try {
      this.setButtonLoading(button, true);

      const response = await fetch('/admin/users/generate-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new URLSearchParams({ username }),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      const { otp } = await response.json();
      
      if (passwordInput) {
        passwordInput.value = otp;
        passwordInput.type = 'text'; // Show the generated password
        
        // Revert to password field after 30 seconds
        setTimeout(() => {
          if (passwordInput.value === otp) {
            passwordInput.type = 'password';
          }
        }, 30000);
      }

      this.showAlert(
        `Wygenerowano hasło jednorazowe: ${otp}\nPamiętaj: przekaż je bezpiecznie użytkownikowi.`, 
        'success',
        10000
      );

    } catch (error) {
      console.error('OTP generation error:', error);
      this.showAlert(`Błąd podczas generowania hasła: ${error.message}`, 'error');
    } finally {
      this.setButtonLoading(button, false);
    }
  }

  setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span> Generowanie...';
      button.classList.add('loading');
    } else {
      button.disabled = false;
      button.innerHTML = 'Generuj hasło jednorazowe';
      button.classList.remove('loading');
    }
  }

  showAlert(message, type = 'info', duration = 5000) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `custom-alert alert alert-${type}`;
    alert.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>${message.replace(/\n/g, '<br>')}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">×</button>
      </div>
    `;

    // Add custom alert styles if not exists
    if (!document.querySelector('#custom-alert-styles')) {
      const styles = document.createElement('style');
      styles.id = 'custom-alert-styles';
      styles.textContent = `
        .custom-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          min-width: 300px;
          max-width: 500px;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(alert);

    if (duration > 0) {
      setTimeout(() => {
        if (alert.parentElement) {
          alert.remove();
        }
      }, duration);
    }
  }

  validateUserForm(event) {
    const form = event.target;
    const username = form.querySelector('input[name="username"]')?.value?.trim();
    const password = form.querySelector('input[name="temp_password"]')?.value?.trim();

    if (!username) {
      this.showAlert('Nazwa użytkownika jest wymagana', 'error');
      event.preventDefault();
      return;
    }

    if (!password) {
      this.showAlert('Hasło tymczasowe jest wymagane', 'error');
      event.preventDefault();
      return;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      this.showAlert('Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślniki', 'error');
      event.preventDefault();
      return;
    }
  }

  confirmDelete(event) {
    const username = event.target.closest('tr').querySelector('td:nth-child(2)').textContent;
    
    if (!confirm(`Czy na pewno chcesz usunąć użytkownika "${username}"? Tej operacji nie można cofnąć.`)) {
      event.preventDefault();
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AdminUsersManager();
});