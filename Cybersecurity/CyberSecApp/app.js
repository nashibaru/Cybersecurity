// app.js
import express from 'express';
import init from './app-modules/db.js'; // twoja inicjalizacja bazy
import configureApp from './app-modules/app-config.js';

import authRoutes from './app-modules/auth-routes.js';
import userRoutes from './app-modules/user-routes.js';
import adminSettingsRoutes from './app-modules/admin-settings.js';
import adminUsersRoutes from './app-modules/admin-users.js';
import adminLogsRoutes from './app-modules/admin-logs.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import argon2 from 'argon2';

const { initDb } = init;
const PORT = process.env.PORT || 3000;
const app = express();

// skonfiguruj aplikację, przekazując routery i ewentualnie sekret sesji
configureApp(app, {
  authRoutes,
  userRoutes,
  adminSettingsRoutes,
  adminUsersRoutes,
  adminLogsRoutes,
  sessionSecret: process.env.SESSION_SECRET
});

// uruchom DB i serwer
initDb(sqlite3, open, argon2)
  .then(() => {
    app.listen(PORT, () => console.log(`Server uruchomiony http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Błąd inicjalizacji bazy:', err);
    process.exit(1);
  });
