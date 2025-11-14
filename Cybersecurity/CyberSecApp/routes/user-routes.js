import { Router } from 'express';
import { verify, hash } from 'argon2';
import dbModule from '../app-modules/db.js';
import { ensureAuthenticated } from '../middleware/auth-middleware.js';
import { logEvent } from '../app-modules/logger.js';
import { validatePasswordRequirements, checkPasswordHistory } from '../middleware/validation-middleware.js';

const router = Router();
const { getDb } = dbModule;

router.get('/change-password', ensureAuthenticated, (req, res) => {
  res.render('user/change-password', { 
    message: null, 
    mustChange: !!req.session.mustChangePassword,
    title: 'Zmiana hasła' 
  });
});

router.post('/change-password', ensureAuthenticated, async (req, res) => {
  const { old_password, new_password, new_password2 } = req.body;
  const db = getDb();

  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.session.userId]);
    if (!user) {
      return res.redirect('/logout');
    }

    if (!old_password) {
      return renderError('Podaj stare hasło');
    }

    const isOldPasswordValid = await verify(user.password_hash, old_password);
    if (!isOldPasswordValid) {
      return renderError('Stare hasło jest niepoprawne');
    }

    if (!new_password || new_password !== new_password2) {
      return renderError('Hasła się nie zgadzają');
    }

    const settings = await db.get("SELECT * FROM settings WHERE id = 1");
    const validationErrors = validatePasswordRequirements(new_password, settings);
    if (validationErrors.length > 0) {
      return renderError(validationErrors[0]);
    }

    const isNewPasswordValid = await checkPasswordHistory(user.id, new_password, db);
    if (!isNewPasswordValid) {
      return renderError('Hasło jest zbyt podobne do jednego z poprzednich haseł');
    }

    const newHash = await hash(new_password);
    const now = new Date().toISOString();
    await db.run("UPDATE users SET password_hash = ?, first_login = 0, pwd_set_date = ? WHERE id = ?", [newHash, now, user.id]);
    await db.run("INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)", [user.id, newHash, now]);

    // Clear the must-change-password flag
    req.session.mustChangePassword = false;
    await logEvent(user.username, 'password_changed', 'Hasło zmienione pomyślnie');

    res.render('user/change-password', { 
      message: 'Hasło zostało zmienione pomyślnie', 
      mustChange: false,
      title: 'Zmiana hasła' 
    });

  } catch (error) {
    console.error('Password change error:', error);
    renderError('Błąd serwera podczas zmiany hasła');
  }

  function renderError(message) {
    res.render('user/change-password', { 
      message, 
      mustChange: !!req.session.mustChangePassword,
      title: 'Zmiana hasła' 
    });
  }
});

export default router;