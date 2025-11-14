// Password strength indicator
class PasswordStrengthIndicator {
  constructor() {
    this.requirements = {
      minLength: 8,
      requireSpecial: true,
      requireLowercase: true,
      requireUppercase: false
    };

    this.init();
  }

  init() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
      if (input.name.includes('password') && !input.name.includes('old')) {
        this.addStrengthIndicator(input);
      }
    });
  }

  addStrengthIndicator(input) {
    const container = input.parentElement;
    const strengthBar = document.createElement('div');
    strengthBar.className = 'password-strength';
    
    const requirementsList = document.createElement('div');
    requirementsList.className = 'password-requirements';
    requirementsList.style.cssText = `
      font-size: 0.8rem;
      color: #6c757d;
      margin-top: 0.5rem;
    `;

    container.appendChild(strengthBar);
    container.appendChild(requirementsList);

    input.addEventListener('input', () => {
      this.updateStrengthIndicator(input.value, strengthBar, requirementsList);
    });
  }

  updateStrengthIndicator(password, strengthBar, requirementsList) {
    const checks = {
      length: password.length >= this.requirements.minLength,
      special: !this.requirements.requireSpecial || /[!@#$%^&*(),.?":{}|<>]/.test(password),
      lowercase: !this.requirements.requireLowercase || /[a-z]/.test(password),
      uppercase: !this.requirements.requireUppercase || /[A-Z]/.test(password)
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.values(checks).length;
    const strength = passedChecks / totalChecks;

    // Update strength bar
    strengthBar.className = 'password-strength';
    if (password.length === 0) {
      strengthBar.style.width = '0%';
      strengthBar.style.backgroundColor = '';
    } else if (strength < 0.5) {
      strengthBar.className += ' strength-weak';
    } else if (strength < 0.75) {
      strengthBar.className += ' strength-fair';
    } else if (strength < 1) {
      strengthBar.className += ' strength-good';
    } else {
      strengthBar.className += ' strength-strong';
    }

    // Update requirements list
    const requirements = [
      `✓ Długość: min. ${this.requirements.minLength} znaków`,
      `✓ Znak specjalny`,
      `✓ Mała litera`,
      `✓ Wielka litera`
    ];

    requirementsList.innerHTML = requirements.map((req, index) => {
      const isMet = Object.values(checks)[index];
      return `<div style="color: ${isMet ? '#28a745' : '#dc3545'}">${req}</div>`;
    }).join('');
  }
}

// Initialize password strength indicator
document.addEventListener('DOMContentLoaded', () => {
  new PasswordStrengthIndicator();
});