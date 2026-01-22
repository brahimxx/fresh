/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based solution like @upstash/ratelimit
 */

class RateLimiter {
  constructor() {
    this.requests = new Map();
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request should be allowed
   * @param {string} key - Unique identifier (IP, email, etc.)
   * @param {number} maxAttempts - Maximum attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} { success: boolean, remaining: number, resetAt: Date }
   */
  check(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request log for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requestLog = this.requests.get(key);

    // Filter out requests outside the current window
    const validRequests = requestLog.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= maxAttempts) {
      const oldestRequest = Math.min(...validRequests);
      const resetAt = new Date(oldestRequest + windowMs);
      
      return {
        success: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000), // seconds
      };
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return {
      success: true,
      remaining: maxAttempts - validRequests.length,
      resetAt: new Date(now + windowMs),
    };
  }

  /**
   * Reset rate limit for a specific key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const maxWindow = 60 * 60 * 1000; // 1 hour max window

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(t => t > now - maxWindow);
      
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;

/**
 * Rate limit presets
 */
export const RateLimitPresets = {
  // 5 attempts per 15 minutes (auth endpoints)
  AUTH: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  
  // 10 attempts per 15 minutes (password reset)
  PASSWORD_RESET: { maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  
  // 20 attempts per minute (general API)
  API: { maxAttempts: 20, windowMs: 60 * 1000 },
  
  // 3 attempts per hour (strict)
  STRICT: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
};
