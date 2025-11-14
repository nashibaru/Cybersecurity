import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';

// Routes
import authRoutes from '../routes/auth-routes.js';
import userRoutes from '../routes/user-routes.js';
import adminRoutes from '../routes/admin-routes.js';

// Middleware
import { 
    securityHeadersMiddleware, 
    securityAuditMiddleware,
    sessionSecurityMiddleware,
    apiSecurityHeaders 
} from '../middleware/security-headers.js';

import {
    sessionTimeoutMiddleware,
    sessionExpiryWarning,
    absoluteSessionLifetime,
    sessionActivityTracker,
    sessionCleanup,
    handleSessionTimeout
} from '../middleware/session-timeout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function configureApp(app) {
    // Security middleware first
    app.use(securityAuditMiddleware);
    app.use(securityHeadersMiddleware());
    app.use(apiSecurityHeaders);
    
    // Static files
    app.use(express.static(path.join(__dirname, '..', 'public')));
    
    // View engine setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '..', 'views'));
    
    // Body parsing
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(express.json({ limit: '10mb' }));
    
    // Session configuration
    configureSession(app);
    
    // Session security middleware (after session is configured)
    app.use(sessionSecurityMiddleware);
    app.use(sessionActivityTracker);
    app.use(absoluteSessionLifetime);
    app.use(sessionTimeoutMiddleware); // Dynamic timeout adjustment
    app.use(sessionExpiryWarning); // Warning for soon-to-expire sessions
    app.use(handleSessionTimeout); // Graceful timeout handling
    app.use(sessionCleanup); // Occasional cleanup of expired sessions
    
    // Global template variables
    app.use((req, res, next) => {
        res.locals.title = 'Panel logowania';
        res.locals.currentPath = req.path;
        res.locals.user = req.session?.user || null;
        res.locals.sessionWarning = res.locals.sessionWarning || null;
        
        // Add session info for debugging in development
        if (process.env.NODE_ENV === 'development' && req.session) {
            res.locals.sessionInfo = {
                userId: req.session.userId,
                username: req.session.username,
                role: req.session.role,
                expires: req.session.cookie?.expires
            };
        }
        
        next();
    });
    
    // Routes
    app.use('/', authRoutes);
    app.use('/user', userRoutes);
    app.use('/admin', adminRoutes);
    
    // 404 handler
    app.use((req, res) => {
        res.status(404).render('errors/404', { 
            title: 'Strona nie znaleziona',
            user: req.session?.user || null
        });
    });
    
    // Error handler
    app.use((error, req, res, next) => {
        console.error('🔥 Application Error:', error);
        
        const errorDetails = process.env.NODE_ENV === 'development' ? error : null;
        
        res.status(500).render('errors/500', { 
            title: 'Błąd serwera',
            error: errorDetails,
            user: req.session?.user || null
        });
    });
    
    return app;
}

function configureSession(app) {
    const SQLiteStore = SQLiteStoreFactory(session);
    
    const sessionConfig = {
        store: new SQLiteStore({ 
            db: 'sessions.sqlite', 
            dir: './data',
            concurrentDB: true,
            // Clean up expired sessions every hour
            cleanupInterval: 60 * 60 * 1000 
        }),
        secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        rolling: true, // Renew session on every request
        cookie: { 
            maxAge: 30 * 60 * 1000, // 30 minutes default (will be overridden by middleware)
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        },
        name: 'securityApp.sid' // Custom session cookie name
    };
    
    app.use(session(sessionConfig));
}