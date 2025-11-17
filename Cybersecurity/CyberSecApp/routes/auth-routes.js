import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verify } from 'argon2';
import dbModule from '../app-modules/db.js';
import { logEvent } from '../app-modules/logger.js';
import { CaptchaService } from '../app-modules/captcha-service.js';
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

// Login page (no CAPTCHA required initially)
router.get('/login', (req, res) => {
  res.render('auth/login', { 
    message: null, 
    title: 'Logowanie',
    returnTo: req.query.returnTo || ''
  });
});

// Process login credentials first
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password, returnTo } = req.body;

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

    // Credentials are valid - store user temporarily and proceed to CAPTCHA
    req.session.pendingUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      first_login: user.first_login
    };
    
    // Store returnTo for after CAPTCHA
    if (returnTo) {
      req.session.pendingReturnTo = returnTo;
    }

    // Generate CAPTCHA challenge
    const challenge = CaptchaService.generateChallenge();
    req.session.captchaChallenge = challenge;

    res.redirect('/captcha');

  } catch (error) {
    console.error('Login process error:', error);
    return res.render('auth/login', {
      message: 'Błąd serwera podczas logowania',
      title: 'Logowanie',
      returnTo: returnTo || ''
    });
  }
});

// CAPTCHA page (after successful credentials)
router.get('/captcha', (req, res) => {
  // Check if user passed credentials first
  if (!req.session.pendingUser) {
    return res.redirect('/login');
  }

  const challenge = req.session.captchaChallenge;
  
  res.render('auth/captcha', {
    title: 'Weryfikacja CAPTCHA',
    challenge: challenge,
    message: null
  });
});

// Verify CAPTCHA and complete login
router.post('/verify-captcha', async (req, res) => {
  // Check if user passed credentials first
  if (!req.session.pendingUser) {
    return res.redirect('/login');
  }

  const { captcha_selections } = req.body;
  const storedChallenge = req.session.captchaChallenge;
  const pendingUser = req.session.pendingUser;
  const pendingReturnTo = req.session.pendingReturnTo;

  const isValid = CaptchaService.verifyChallenge(captcha_selections, storedChallenge);

  if (isValid) {
    // CAPTCHA passed - complete login using the existing function logic
    await clearLoginAttempts(pendingUser);

    req.session.userId = pendingUser.id;
    req.session.username = pendingUser.username;
    req.session.role = pendingUser.role;

    await new Promise((resolve, reject) => {
      req.session.save(err => err ? reject(err) : resolve());
    });

    await logEvent(pendingUser.username, 'login_success', 'Zalogowano pomyślnie');

    // Clear temporary data
    delete req.session.pendingUser;
    delete req.session.captchaChallenge;
    delete req.session.pendingReturnTo;

    // Handle redirect based on user status and returnTo
    if (pendingUser.first_login) {
      req.session.mustChangePassword = true;
      return res.redirect('/user/change-password');
    }

    let redirectUrl;
    if (pendingReturnTo && !req.session.mustChangePassword) {
      redirectUrl = pendingReturnTo;
    } else {
      redirectUrl = pendingUser.role === 'ADMIN' ? '/admin/settings' : '/user/change-password';
    }

    res.redirect(redirectUrl);

  } else {
    // CAPTCHA failed - generate new challenge
    const newChallenge = CaptchaService.generateChallenge();
    req.session.captchaChallenge = newChallenge;

    res.render('auth/captcha', {
      title: 'Weryfikacja CAPTCHA',
      challenge: newChallenge,
      message: 'Nieprawidłowa odpowiedź. Spróbuj ponownie.'
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