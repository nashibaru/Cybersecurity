// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Now process.env will have the variables from .env
export const PORT = process.env.PORT || 3000;
export const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-in-production';
export const NODE_ENV = process.env.NODE_ENV || 'development';

// hCaptcha Configuration
export const HCAPTCHA_SITE_KEY = process.env.HCAPTCHA_SITE_KEY;
export const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY;
export const SKIP_CAPTCHA = process.env.SKIP_CAPTCHA === 'true';

// Validate required environment variables
const requiredEnvVars = ['SESSION_SECRET'];

// In production, require hCaptcha keys unless explicitly skipped
if (NODE_ENV === 'production' && !SKIP_CAPTCHA) {
  requiredEnvVars.push('HCAPTCHA_SITE_KEY', 'HCAPTCHA_SECRET_KEY');
}

// Check for missing variables
const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Log configuration status
console.log('🛡️ Environment Configuration:');
console.log(`   - Environment: ${NODE_ENV}`);
console.log(`   - PORT: ${PORT}`);
console.log(`   - CAPTCHA Enabled: ${!SKIP_CAPTCHA}`);
console.log(`   - SESSION_SECRET: ${SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);
if (HCAPTCHA_SITE_KEY) {
  console.log(`   - hCaptcha Site Key: ${HCAPTCHA_SITE_KEY.substring(0, 10)}...`);
}