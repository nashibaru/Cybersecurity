/**
 * Security Headers Middleware
 * Implements best practices for web security headers
 */

import helmet from 'helmet';

export function securityHeadersMiddleware() {
  return [
    // Basic Helmet setup with CSP
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for EJS
          scriptSrc: [
            "'self'", 
            "https://www.google.com", 
            "https://www.gstatic.com"
          ], // Allow reCAPTCHA scripts
          scriptSrcElem: [
            "'self'", 
            "https://www.google.com", 
            "https://www.gstatic.com"
          ], // Specifically for script elements
          connectSrc: [
            "'self'", 
            "https://www.google.com", 
            "https://www.gstatic.com",
            "https://www.google.com/recaptcha/",
            "https://www.gstatic.com/recaptcha/"
          ], // Allow reCAPTCHA API calls
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'", "https://www.google.com"], // Allow reCAPTCHA iframe
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"], // Prevent clickjacking
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
      },
      crossOriginEmbedderPolicy: false, // Disable for better compatibility
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' }, // Prevent clickjacking
      hidePoweredBy: true, // Remove X-Powered-By header
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true, // Prevent MIME type sniffing
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" }
    }),

    // Custom security headers
    (req, res, next) => {
      // Prevent caching of sensitive pages
      if (req.path.includes('/admin') || req.path.includes('/user')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
      }

      // Additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Feature Policy (now Permissions Policy)
      res.setHeader('Permissions-Policy', 
        'camera=(), microphone=(), geolocation=(), payment=()'
      );

      next();
    },

    // Rate limiting headers (complement to express-rate-limit)
    (req, res, next) => {
      if (req.path === '/login') {
        res.setHeader('X-RateLimit-Limit', '10');
        res.setHeader('X-RateLimit-Remaining', '9'); // This would be dynamic in real implementation
      }
      next();
    }
  ];
}

/**
 * Specific CSP for different routes
 */
export function dynamicCSP(req, res, next) {

  // For licenses route, allow inline scripts
  if (req.path.includes('/admin/licenses')) {
    // Remove existing CSP header
    res.removeHeader('Content-Security-Policy');
    
    // Set specific CSP for licenses that allows inline scripts
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' https://www.google.com https://www.gstatic.com 'unsafe-inline'; " +
      "script-src-elem 'self' https://www.google.com https://www.gstatic.com 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "frame-src 'self' https://www.google.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https://www.google.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'"
    );
    return next();
  }

  // For change-password route, ensure reCAPTCHA works
  if (req.path.includes('/user/change-password')) {
    // Remove existing CSP header
    res.removeHeader('Content-Security-Policy');
    
    // Set specific CSP for change-password that allows reCAPTCHA
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' https://www.google.com https://www.gstatic.com; " +
      "script-src-elem 'self' https://www.google.com https://www.gstatic.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "frame-src 'self' https://www.google.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https://www.google.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'"
    );
    return next();
  }
  
  // For other routes that need special CSP
  if (req.path.includes('/admin/users') || req.path.includes('/admin/user-edit')) {
    // Remove existing CSP header
    res.removeHeader('Content-Security-Policy');
    
    // Set specific CSP for admin routes
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' https://www.google.com https://www.gstatic.com; " +
      "script-src-elem 'self' https://www.google.com https://www.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "frame-src 'self' https://www.google.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://www.google.com https://www.gstatic.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    );
    return next();
  }
  
  next();
}

/**
 * Security headers for API routes
 */
export function apiSecurityHeaders(req, res, next) {
  if (req.path.startsWith('/api/') || req.path.includes('/admin/users/generate-otp')) {
    // Additional security for API endpoints
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-API-Version', '1.0');
    
    // CORS headers for API (adjust as needed)
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || req.headers.origin || '');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
}

/**
 * Security audit middleware - logs security-related events
 */
export function securityAuditMiddleware(req, res, next) {
  const securityEvents = [];

  // Check for suspicious user agents
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    'nmap', 'sqlmap', 'metasploit', 'nikto', 
    'w3af', 'acunetix', 'appscan', 'burpsuite'
  ];

  if (suspiciousPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
    securityEvents.push(`Suspicious User-Agent: ${userAgent}`);
  }

  // Check for common attack patterns in URL
  const attackPatterns = [
    /\.\.\//, // Directory traversal
    /<script>/i, // Script injection
    /union.*select/i, // SQL injection
    /eval\(/i, // Code execution
    /\.env/, // Environment file access
  ];

  if (attackPatterns.some(pattern => pattern.test(req.url))) {
    securityEvents.push(`Potential attack pattern in URL: ${req.url}`);
  }

  // Log security events
  if (securityEvents.length > 0) {
    console.warn('🚨 Security events detected:', {
      ip: req.ip,
      url: req.url,
      userAgent: userAgent,
      events: securityEvents,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to send this to a security monitoring service
  }

  next();
}

/**
 * Session security middleware
 */
export function sessionSecurityMiddleware(req, res, next) {
  if (req.session) {
    // Regenerate session ID on privilege change
    if (req.session.oldRole && req.session.oldRole !== req.session.role) {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
        }
      });
    }

    // Set session security flags
    req.session.ip = req.ip;
    req.session.userAgent = req.get('User-Agent');
  }

  next();
}

export default {
  securityHeadersMiddleware,
  dynamicCSP,
  apiSecurityHeaders,
  securityAuditMiddleware,
  sessionSecurityMiddleware
};