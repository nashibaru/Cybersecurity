// routes/adminSettings.js
import { Router } from 'express';
import dbModule from './db.js';
import { ensureAuthenticated, ensureAdmin } from './server-middleware.js';
const router = Router();
const { getDb } = dbModule;
// Wymaga zalogowania i roli ADMIN dla wszystkich ścieżek w tym routerze
router.use(ensureAuthenticated, ensureAdmin);

// Widok aktualnych ustawień
router.get('/settings', async (req, res) => {
  const db = getDb();
  const settings = await db.get("SELECT * FROM settings WHERE id = 1");
  res.render('admin-settings', { settings, message: null, title: 'Ustawienia bezpieczeństwa' });
});

// Zapis nowych ustawień
router.post('/settings', async (req, res) => {
  const { min_length, require_special, require_lowercase, require_uppercase, pwd_valid_days } = req.body;
  const db = getDb();
  await db.run(
    "UPDATE settings SET min_length = ?, require_special = ?, require_lowercase = ?, require_uppercase = ?, pwd_valid_days = ? WHERE id = 1",
    [min_length, require_special ? 1 : 0, require_lowercase ? 1 : 0, require_uppercase ? 1 : 0, pwd_valid_days]
  );
  const settings = await db.get("SELECT * FROM settings WHERE id = 1");
  res.render('admin-settings', { settings, message: 'Zapisano ustawienia', title: 'Ustawienia bezpieczeństwa' });
});

export default router;
