// routes/adminUsers.js
import { Router } from 'express';
import { hash as _hash, verify } from 'argon2';
import dbModule from './db.js';
import { ensureAuthenticated, ensureAdmin } from './server-middleware.js';
const router = Router();
const { getDb } = dbModule;
router.use(ensureAuthenticated, ensureAdmin);

// Lista użytkowników
router.get('/users', async (req, res) => {
  const db = getDb();
  const users = await db.all("SELECT * FROM users");
  res.render('admin-users', { users, message: null, title: 'Użytkownicy' });
});

// Blokuj/odblokuj użytkownika
router.post('/users/:id/block', async (req, res) => {
  const db = getDb();
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (user) {
    await db.run("UPDATE users SET blocked = ? WHERE id = ?", [user.blocked ? 0 : 1, user.id]);
  }
  res.redirect('/admin/users');
});

// Usuń użytkownika
router.post('/users/:id/delete', async (req, res) => {
  const db = getDb();
  await db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.redirect('/admin/users');
});

// Dodaj użytkownika
router.post('/users/add', async (req, res) => {
  const { username, full_name, role, temp_password } = req.body;
  const db = getDb();
  const hash = await _hash(temp_password);
  const now = new Date().toISOString();
  const info = await db.run(
    "INSERT INTO users (username, full_name, password_hash, role, first_login, pwd_set_date) VALUES (?, ?, ?, ?, 1, ?)",
    [username, full_name, hash, role, now]
  );
  const uid = info.lastID;
  await db.run("INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)", [uid, hash, now]);
  res.redirect('/admin/users');
});

// Formularz edycji użytkownika
router.get('/users/:id/edit', async (req, res) => {
  const db = getDb();
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (!user) {
    return res.redirect('/admin/users');
  }
  res.render('admin-user-edit', { user, message: null, title: 'Edytuj użytkownika' });
});

// Zapis edytowanego użytkownika
router.post('/users/:id/edit', async (req, res) => {
  const { username, full_name, role, temp_password, blocked } = req.body;
  const db = getDb();
  const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (!user) {
    return res.redirect('/admin/users');
  }

  // Jeśli podano nowe hasło, aktualizujemy je z zachowaniem historii haseł
  if (temp_password) {
    const hash = await _hash(temp_password);
    const now = new Date().toISOString();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const recentHistory = await db.all(
      "SELECT password_hash FROM pwd_history WHERE user_id = ? AND set_date >= ?",
      [user.id, twoYearsAgo.toISOString()]
    );
    for (const h of recentHistory) {
      if (await verify(h.password_hash, temp_password)) {
        return res.render('admin-user-edit', {
          user,
          message: 'Hasło jest zbyt podobne do jednego z poprzednich haseł',
          title: 'Edytuj użytkownika'
        });
      }
    }
    await db.run("UPDATE users SET password_hash = ?, pwd_set_date = ?, first_login = 0 WHERE id = ?", [hash, now, user.id]);
    await db.run("INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)", [user.id, hash, now]);
  }

  // Aktualizacja pozostałych danych użytkownika
  await db.run(
    "UPDATE users SET username = ?, full_name = ?, role = ?, blocked = ? WHERE id = ?",
    [username, full_name, role, blocked ? 1 : 0, user.id]
  );

  res.redirect('/admin/users');
});

export default router;
