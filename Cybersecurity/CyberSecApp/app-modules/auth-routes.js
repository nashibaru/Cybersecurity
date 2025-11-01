// routes/auth.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verify } from 'argon2';
import dbModule from './db.js';
import { logEvent } from './logger.js';

const router = Router();
const { findUserByUsername, getDb } = dbModule;
// Limit prób logowania
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts, try again later."
});

// Strona główna i przekierowanie w zależności od sesji
router.get('/', async (req, res) => {
  
  if (req.session && req.session.userId) {
    if (req.session.role === 'ADMIN') {
      await logEvent(username, 'login_success', 'Zalogowano pomyślnie - ADMIN');
      return res.redirect('/admin/settings');
    }
    await logEvent(username, 'login_success', 'Zalogowano pomyślnie');
    return res.redirect('/user/change-password');
  }
  res.redirect('/login');
});

// Formularz logowania
router.get('/login', (req, res) => {
  res.render('login', { message: null, title: 'Logowanie' });
});

// Obsługa logowania (POST)
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const user = await findUserByUsername(username);
  if (!user) {
    await logEvent(username, 'login_password_error', 'Nie zalogowano - błędny login');
    return res.render('login', { message: 'Login lub hasło niepoprawne', title: 'Logowanie' });
  }
  if (user.blocked) {
    await logEvent(username, 'account_blocked', 'Nie zalogowano - konto zablokowane');
    return res.render('login', { message: 'Konto zablokowane', title: 'Logowanie' });
  }
  try {
    if (!await verify(user.password_hash, password)) {
      await logEvent(username, 'login_password_error', 'Nie zalogowano - błędne hasło');
      return res.render('login', { message: 'Login lub hasło niepoprawne', title: 'Logowanie' });
    }
  } catch {
    return res.render('login', { message: 'Błąd weryfikacji hasła', title: 'Logowanie' });
  }

  // Zapisanie sesji
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  // Sprawdzenie konieczności zmiany hasła
  const db = getDb();
  const settings = await db.get("SELECT * FROM settings WHERE id = 1");
  if (user.pwd_set_date) {
    const set = new Date(user.pwd_set_date);
    const validDays = user.pwd_valid_days || settings.pwd_valid_days;
    const expiry = new Date(set.getTime() + validDays * 24*3600*1000);
    if (new Date() > expiry) {
      req.session.mustChangePassword = true;
      return res.redirect('/user/change-password');
    }
  }
  if (user.first_login) {
    req.session.mustChangePassword = true;
    return res.redirect('/user/change-password');
  }

  // Przekierowanie według roli
  if (user.role === 'ADMIN') {
    return res.redirect('/admin/settings');
  }
  res.redirect('/user/change-password');
});

// Wylogowanie
router.get('/logout', async (req, res) => {
  await logEvent(user.username, 'logout_success', 'Wylogowano pomyślnie');
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

export default router;
