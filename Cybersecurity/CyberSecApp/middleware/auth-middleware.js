import dbModule from '../app-modules/db.js';
const { getDb } = dbModule;

export function ensureAuthenticated(req, res, next) {
    console.log('ensureAuthenticated check:', {
        hasSession: !!req.session,
        userId: req.session?.userId,
        path: req.path
    });
    if (req?.session?.userId) return next();

    const returnTo = req?.originalUrl ? `?returnTo=${encodeURIComponent(req.originalUrl)}` : '';
    return res.redirect(`/login${returnTo}`);
}

export function ensureAdmin(req, res, next) {
    if (req?.session?.role === 'ADMIN') return next();
    return res.status(403).render('errors/403', {
        title: 'Brak dostępu',
        message: 'Nie masz uprawnień do tej sekcji.'
    });
}

export async function checkAccountLock(user) {
    if (!user?.lock_until) return false;
    const lockUntil = new Date(user.lock_until);
    return new Date() < lockUntil;
}

export async function handleFailedLogin(user) {
    const db = getDb();
    const settings = await db.get("SELECT login_max_attempts, lock_minutes FROM settings WHERE id = 1") || {};
    const maxAttempts = parseInt(settings.login_max_attempts || 5, 10);
    const lockMinutes = parseInt(settings.lock_minutes || 15, 10);
    const currentAttempts = (user?.failed_attempts || 0) + 1;

    if (currentAttempts >= maxAttempts) {
        const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();
        await db.run("UPDATE users SET failed_attempts = 0, lock_until = ? WHERE id = ?", [lockUntil, user.id]);
        return { locked: true, lockUntil, attempts: currentAttempts };
    } else {
        await db.run("UPDATE users SET failed_attempts = ? WHERE id = ?", [currentAttempts, user.id]);
        return { locked: false, attempts: currentAttempts };
    }
}

export async function clearLoginAttempts(user) {
    const db = getDb();
    await db.run("UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?", [user.id]);
}