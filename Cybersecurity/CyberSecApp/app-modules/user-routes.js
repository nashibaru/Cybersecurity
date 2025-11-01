// routes/user.js
import { Router } from 'express';
import { verify, hash as _hash } from 'argon2';
import dbModule from './db.js';
import { ensureAuthenticated } from './server-middleware.js';
import { logEvent } from './logger.js';

const router = Router();
const { getDb } = dbModule;
// Formularz zmiany hasła
router.get('/change-password', ensureAuthenticated, async (req, res) => {
  const must = !!req.session.mustChangePassword;
  res.render('change-password', { message: null, mustChange: must, title: 'Zmiana hasła' });
});

// Obsługa zmiany hasła
router.post('/change-password', ensureAuthenticated, async (req, res) => {
  const { old_password, new_password, new_password2 } = req.body;
  const db = getDb();
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.session.userId]);

  if (!old_password) {
    return res.render('change-password', { message: 'Podaj stare hasło', mustChange: !!req.session.mustChangePassword, title: 'Zmiana hasła' });
  }
  try {
    if (!await verify(user.password_hash, old_password)) {
      return res.render('change-password', { message: 'Stare hasło jest niepoprawne', mustChange: !!req.session.mustChangePassword, title: 'Zmiana hasła' });
    }
  } catch {
    return res.render('change-password', { message: 'Błąd weryfikacji hasła', mustChange: !!req.session.mustChangePassword, title: 'Zmiana hasła' });
  }

  if (!new_password || new_password !== new_password2) {
    return res.render('change-password', { message: 'Hasła się nie zgadzają', mustChange: !!req.session.mustChangePassword, title: 'Zmiana hasła' });
  }

  // Sprawdzenie ustawień (długość i znaki)
  const settings = await db.get("SELECT * FROM settings WHERE id = 1");
  if (new_password.length < settings.min_length) {
    return res.render('change-password', { message: `Hasło musi mieć co najmniej ${settings.min_length} znaków.`, mustChange: !!req.session.mustChangePassword, title: 'Zmiana hasła' });
  }
  if (settings.require_special && !/[!@#$%^&*(),.?":{}|<>]/.test(new_password)) {
    return res.render('change-password', { message: 'Hasło musi zawierać przynajmniej jeden znak specjalny.', mustChange: !!req.session.mustChangePassword, title: 'Zmiana hasła' });
  }
  if (settings.require_lowercase && !/[a-z]/.test(new_password)) {
    return res.render('change-password', { message: 'Hasło musi zawierać przynajmniej jedną małą literę.', mustChange: !!req.session.mustChangePassword, title: 'Zmiana hasła' });
  }

  // Sprawdzenie historii haseł (ostatnie 2 lata)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const recentHistory = await db.all(
    "SELECT password_hash FROM pwd_history WHERE user_id = ? AND set_date >= ?",
    [user.id, twoYearsAgo.toISOString()]
  );
  for (const h of recentHistory) {
    if (await verify(h.password_hash, new_password)) {
      return res.render('change-password', { message: 'Hasło jest zbyt podobne do jednego z poprzednich haseł', mustChange: !!req.session.mustChangePassword, title: 'Zmiana hasła' });
    }
  }

  // Zapisanie nowego hasła
  const hash = await _hash(new_password);
  const now = new Date().toISOString();
  const username = await db.all(
    "SELECT username FROM users WHERE user_id = ?",
    [user.id]
  );
  await db.run("UPDATE users SET password_hash = ?, first_login = 0, pwd_set_date = ? WHERE id = ?", [hash, now, user.id]);
  await db.run("INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)", [user.id, hash, now]);

  req.session.mustChangePassword = false;
  logEvent(username, 'password_changed', 'Hasło zmienione pomyślnie');
  res.render('change-password', { message: 'Hasło zostało zmienione pomyślnie', mustChange: false, title: 'Zmiana hasła' });
});

export default router;
