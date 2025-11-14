import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verify } from 'argon2';
import dbModule from '../app-modules/db.js';
import { logEvent } from '../app-modules/logger.js';
import { ensureAuthenticated, checkAccountLock, handleFailedLogin, clearLoginAttempts } from '../middleware/auth-middleware.js';

const router = Router();
const { findUserByUsername, getDb } = dbModule;

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper functions
function destroySessionPromise(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy(err => err ? reject(err) : resolve());
  });
}

async function handleSuccessfulLogin(req, user) {
  await clearLoginAttempts(user);

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  await new Promise((resolve, reject) => {
    req.session.save(err => err ? reject(err) : resolve());
  });

  await logEvent(user.username, 'login_success', 'Zalogowano pomyślnie');

  if (user.first_login) {
    req.session.mustChangePassword = true;
    return '/user/change-password';
  }

  return user.role === 'ADMIN' ? '/admin/settings' : '/user/change-password';
}

// Routes
router.get('/', async (req, res) => {
  if (req.session?.userId) {
    const username = req.session.username || 'UNKNOWN';
    const redirectUrl = req.session.role === 'ADMIN' ? '/admin/settings' : '/user/change-password';
    await logEvent(username, 'session_active', `Przekierowanie do ${redirectUrl}`);
    return res.redirect(redirectUrl);
  }
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  res.render('auth/login', { 
    message: null, 
    title: 'Logowanie',
    returnTo: req.query.returnTo || ''
  });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password, returnTo } = req.body;
  const db = getDb();

  try {
    const user = await findUserByUsername(username);

    if (user && await checkAccountLock(user)) {
      const until = new Date(user.lock_until).toLocaleString('pl-PL');
      await logEvent(username, 'login_blocked', `Próba logowania podczas blokady do ${until}`);
      return res.render('auth/login', {
        message: `Konto zablokowane do ${until}`,
        title: 'Logowanie',
        returnTo: returnTo || ''
      });
    }

    if (!user) {
      await logEvent(username, 'login_failed', 'Nieistniejący użytkownik');
      return res.render('auth/login', {
        message: 'Login lub hasło niepoprawne',
        title: 'Logowanie',
        returnTo: returnTo || ''
      });
    }

    const isPasswordValid = await verify(user.password_hash, password);
    if (!isPasswordValid) {
      const result = await handleFailedLogin(user);
      if (result.locked) {
        const until = new Date(result.lockUntil).toLocaleString('pl-PL');
        return res.render('auth/login', {
          message: `Konto zablokowane do ${until}`,
          title: 'Logowanie',
          returnTo: returnTo || ''
        });
      }
      return res.render('auth/login', {
        message: 'Login lub hasło niepoprawne',
        title: 'Logowanie',
        returnTo: returnTo || ''
      });
    }

    const redirectUrl = await handleSuccessfulLogin(req, user);

    if (returnTo && !req.session.mustChangePassword) {
      return res.redirect(returnTo);
    }
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Login process error:', error);
    return res.render('auth/login', {
      message: 'Błąd serwera podczas logowania',
      title: 'Logowanie',
      returnTo: returnTo || ''
    });
  }
});

router.get('/logout', async (req, res) => {
  const username = req.session?.username || null;

  try {
    await logEvent(username, 'logout_success', 'Wylogowano pomyślnie');
  } catch (error) {
    console.error('Logout log error:', error);
  }

  try {
    await destroySessionPromise(req);
  } catch (error) {
    console.error('Session destruction error:', error);
  }

  res.redirect('/login');
});

// Session status check endpoint
router.get('/api/session-check', (req, res) => {
    if (!req.session || !req.session.cookie?.expires) {
        return res.json({ valid: false, expiresIn: 0 });
    }

    const expiryTime = new Date(req.session.cookie.expires);
    const now = new Date();
    const expiresIn = Math.ceil((expiryTime - now) / 60000); // minutes remaining

    res.json({
        valid: expiresIn > 0,
        expiresIn: Math.max(0, expiresIn),
        username: req.session.username
    });
});

export default router;