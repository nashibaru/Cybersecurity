export const PORT = process.env.PORT || 3000;
export const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-in-production';
export const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables
const requiredEnvVars = ['SESSION_SECRET'];

if (NODE_ENV === 'production') {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}