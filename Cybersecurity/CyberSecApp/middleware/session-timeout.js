/**
 * Session Timeout Middleware
 * Dynamically adjusts session timeout based on application settings
 */

import dbModule from '../app-modules/db.js';
const { getDb } = dbModule;

/**
 * Middleware to dynamically adjust session timeout based on settings
 */
export async function sessionTimeoutMiddleware(req, res, next) {
    try {
        // Skip if no session exists
        if (!req.session) {
            return next();
        }

        let timeoutMinutes = null;

        // 1) First try to get from app locals (cached settings)
        if (req.app.locals?.settings?.session_timeout_minutes) {
            timeoutMinutes = req.app.locals.settings.session_timeout_minutes;
        } 
        // 2) Fallback: query the database directly
        else {
            const db = getDb();
            try {
                const settings = await db.get("SELECT session_timeout_minutes FROM settings WHERE id = 1");
                timeoutMinutes = settings?.session_timeout_minutes || null;
                
                // Cache the settings in app locals for future requests
                if (!req.app.locals.settings) {
                    req.app.locals.settings = {};
                }
                req.app.locals.settings.session_timeout_minutes = timeoutMinutes;
            } catch (dbError) {
                console.error('Database error in session timeout middleware:', dbError);
                // Continue with default timeout if DB query fails
            }
        }

        // Apply the timeout if configured
        if (timeoutMinutes) {
            const timeoutMs = parseInt(timeoutMinutes, 10) * 60 * 1000;
            
            // Only update if the timeout has changed to avoid unnecessary session writes
            if (req.session.cookie.maxAge !== timeoutMs) {
                req.session.cookie.maxAge = timeoutMs;
                
                // Log timeout changes in development
                if (process.env.NODE_ENV === 'development') {
                    console.log(`🕐 Session timeout set to ${timeoutMinutes} minutes for user:`, req.session.username);
                }
            }
        }

        // Track session activity for monitoring
        req.session.lastActivity = new Date().toISOString();

    } catch (error) {
        // Don't break the request if session timeout logic fails
        console.error('❌ Session timeout middleware error:', error);
    } finally {
        next();
    }
}

/**
 * Middleware to check if session is about to expire
 * Warns users when their session is close to timing out
 */
export function sessionExpiryWarning(req, res, next) {
    if (!req.session || !req.session.cookie?.expires) {
        return next();
    }

    const expiryTime = new Date(req.session.cookie.expires);
    const now = new Date();
    const timeUntilExpiry = expiryTime - now;
    const warningThreshold = 5 * 60 * 1000; // 5 minutes warning

    // Add warning to locals if session is about to expire
    if (timeUntilExpiry < warningThreshold && timeUntilExpiry > 0) {
        res.locals.sessionWarning = {
            message: `Twoja sesja wygaśnie za ${Math.ceil(timeUntilExpiry / 60000)} minut`,
            expiresIn: Math.ceil(timeUntilExpiry / 60000)
        };
    }

    next();
}

/**
 * Middleware to enforce absolute session lifetime
 * Prevents sessions from being renewed indefinitely
 */
export function absoluteSessionLifetime(req, res, next) {
    if (!req.session) {
        return next();
    }

    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours maximum
    
    // Initialize session creation time if not set
    if (!req.session.createdAt) {
        req.session.createdAt = new Date().toISOString();
    }

    const sessionAge = Date.now() - new Date(req.session.createdAt).getTime();
    
    // Force logout if session is too old
    if (sessionAge > maxSessionAge) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying expired session:', err);
            }
        });
        
        return res.redirect('/login?message=sesja_wygasla');
    }

    next();
}

/**
 * Middleware to track session activity and prevent session fixation
 */
export function sessionActivityTracker(req, res, next) {
    if (!req.session) {
        return next();
    }

    // Initialize activity tracking
    if (!req.session.activity) {
        req.session.activity = {
            startTime: new Date().toISOString(),
            requestCount: 0,
            lastRequestTime: new Date().toISOString()
        };
    }

    // Update activity metrics
    req.session.activity.requestCount++;
    req.session.activity.lastRequestTime = new Date().toISOString();

    // Regenerate session ID on significant events to prevent fixation
    const shouldRegenerate = 
        req.method === 'POST' && 
        (req.path.includes('/login') || 
         req.path.includes('/change-password') ||
         req.session.activity.requestCount % 50 === 0); // Every 50 requests

    if (shouldRegenerate) {
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
            } else {
                console.log('🆔 Session regenerated for security');
            }
        });
    }

    next();
}

/**
 * Middleware to clean up expired sessions from the database
 * This runs occasionally to prevent session table bloat
 */
export async function sessionCleanup(req, res, next) {
    // Only run cleanup occasionally (1% of requests) to avoid performance impact
    if (Math.random() > 0.01) {
        return next();
    }

    try {
        const db = getDb();
        const cutoffTime = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
        
        await db.run(
            "DELETE FROM sessions WHERE expires < ?",
            [cutoffTime.toISOString()]
        );
        
        console.log('🧹 Session cleanup completed');
    } catch (error) {
        console.error('Session cleanup error:', error);
        // Don't break the request if cleanup fails
    } finally {
        next();
    }
}

/**
 * Utility function to get current session timeout settings
 */
export function getSessionTimeoutSettings() {
    try {
        const db = getDb();
        return db.get("SELECT session_timeout_minutes FROM settings WHERE id = 1");
    } catch (error) {
        console.error('Error getting session timeout settings:', error);
        return null;
    }
}

/**
 * Middleware to handle session timeout gracefully
 * Redirects to login with appropriate message when session times out
 */
export function handleSessionTimeout(req, res, next) {
    if (req.session && req.session.cookie?.expires) {
        const expiryTime = new Date(req.session.cookie.expires);
        if (expiryTime < new Date()) {
            req.session.destroy(() => {
                return res.redirect('/login?message=sesja_wygasla');
            });
            return;
        }
    }
    next();
}

export default {
    sessionTimeoutMiddleware,
    sessionExpiryWarning,
    absoluteSessionLifetime,
    sessionActivityTracker,
    sessionCleanup,
    getSessionTimeoutSettings,
    handleSessionTimeout
};