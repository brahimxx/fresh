/**
 * Fresh Salon - Security Audit Checklist & Utilities
 * 
 * This file documents security measures implemented and provides
 * security utility functions for the application.
 */

// ============================================================
// SECURITY AUDIT CHECKLIST
// ============================================================

/**
 * ✅ COMPLETED SECURITY MEASURES
 * 
 * 1. AUTHENTICATION & AUTHORIZATION
 *    - [x] JWT-based authentication with refresh tokens
 *    - [x] Password hashing with bcrypt (cost factor 10+)
 *    - [x] Session timeout and token expiration
 *    - [x] Role-based access control (RBAC)
 *    - [x] Protected API routes with auth middleware
 * 
 * 2. HTTP SECURITY HEADERS (in next.config.mjs)
 *    - [x] Strict-Transport-Security (HSTS)
 *    - [x] X-Content-Type-Options: nosniff
 *    - [x] X-Frame-Options: DENY
 *    - [x] X-XSS-Protection: 1; mode=block
 *    - [x] Referrer-Policy: strict-origin-when-cross-origin
 *    - [x] Permissions-Policy (camera, microphone, geolocation)
 * 
 * 3. INPUT VALIDATION
 *    - [x] Server-side validation on all API routes
 *    - [x] Zod schemas for request validation
 *    - [x] SQL injection prevention (parameterized queries)
 *    - [x] XSS prevention (React auto-escaping)
 * 
 * 4. API SECURITY
 *    - [x] CORS configuration
 *    - [x] Rate limiting ready (needs Redis in production)
 *    - [x] Request size limits
 *    - [x] Webhook signature verification (Stripe)
 * 
 * 5. DATA PROTECTION
 *    - [x] Environment variables for secrets
 *    - [x] No sensitive data in client bundles
 *    - [x] HTTPS-only cookies
 *    - [x] Secure password reset flow
 * 
 * 6. ERROR HANDLING
 *    - [x] Generic error messages to clients
 *    - [x] Detailed logging server-side only
 *    - [x] Error boundaries to prevent app crashes
 */

// ============================================================
// SECURITY UTILITIES
// ============================================================

/**
 * Sanitize user input to prevent XSS
 * Note: React already handles this, but useful for non-React contexts
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check password strength
 * Returns: { valid: boolean, errors: string[] }
 */
export function validatePasswordStrength(password) {
  var errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain a special character');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    strength: errors.length === 0 ? 'strong' : errors.length <= 2 ? 'medium' : 'weak'
  };
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken() {
  if (typeof window === 'undefined') {
    var crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
  
  var array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, function(byte) {
    return byte.toString(16).padStart(2, '0');
  }).join('');
}

/**
 * Validate URL to prevent open redirect attacks
 */
export function isValidRedirectUrl(url, allowedHosts) {
  try {
    var parsed = new URL(url, window.location.origin);
    
    // Only allow relative URLs or URLs from allowed hosts
    if (parsed.origin === window.location.origin) {
      return true;
    }
    
    if (allowedHosts && allowedHosts.includes(parsed.host)) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Rate limiting helper (client-side)
 */
export function createRateLimiter(maxRequests, windowMs) {
  var requests = [];
  
  return function() {
    var now = Date.now();
    requests = requests.filter(function(time) {
      return now - time < windowMs;
    });
    
    if (requests.length >= maxRequests) {
      return false;
    }
    
    requests.push(now);
    return true;
  };
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data) {
  var sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
  
  function mask(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    var masked = Array.isArray(obj) ? [] : {};
    
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var lowerKey = key.toLowerCase();
        var isSensitive = sensitiveFields.some(function(field) {
          return lowerKey.includes(field.toLowerCase());
        });
        
        if (isSensitive) {
          masked[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object') {
          masked[key] = mask(obj[key]);
        } else {
          masked[key] = obj[key];
        }
      }
    }
    
    return masked;
  }
  
  return mask(data);
}

// ============================================================
// SECURITY HEADERS REFERENCE
// ============================================================

/**
 * Content Security Policy (CSP) - Add to next.config.mjs if needed
 * 
 * Example:
 * "Content-Security-Policy": 
 *   "default-src 'self'; " +
 *   "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
 *   "style-src 'self' 'unsafe-inline'; " +
 *   "img-src 'self' data: https:; " +
 *   "font-src 'self'; " +
 *   "connect-src 'self' https://api.stripe.com; " +
 *   "frame-ancestors 'none';"
 */

export default {
  sanitizeInput: sanitizeInput,
  isValidEmail: isValidEmail,
  validatePasswordStrength: validatePasswordStrength,
  generateCSRFToken: generateCSRFToken,
  isValidRedirectUrl: isValidRedirectUrl,
  createRateLimiter: createRateLimiter,
  maskSensitiveData: maskSensitiveData,
};
