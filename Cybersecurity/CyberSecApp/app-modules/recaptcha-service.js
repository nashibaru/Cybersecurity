// reCAPTCHA verification service
import fetch from 'node-fetch';

export class RecaptchaService {
  static async verifyRecaptcha(token) {
    // Skip verification in development if needed
    if (process.env.SKIP_CAPTCHA === 'true') {
      return { success: true };
    }

    if (!token) {
      return { success: false, error: 'Missing reCAPTCHA token' };
    }

    try {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secretKey}&response=${token}`
      });

      const data = await response.json();
      
      return {
        success: data.success,
        score: data.score,
        errors: data['error-codes'],
        timestamp: data.challenge_ts
      };
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  static getSiteKey() {
    return process.env.RECAPTCHA_SITE_KEY;
  }
}

export default RecaptchaService;