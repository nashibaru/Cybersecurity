import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import argon2 from 'argon2';

let db = null;

const SCHEMA = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      blocked INTEGER DEFAULT 0,
      first_login INTEGER DEFAULT 1,
      pwd_set_date TEXT,
      pwd_valid_days INTEGER DEFAULT 90,
      failed_attempts INTEGER DEFAULT 0,
      lock_until TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      free_uses INTEGER DEFAULT 5,
      is_key BOOLEAN DEFAULT 0
    )
  `,
  pwd_history: `
    CREATE TABLE IF NOT EXISTS pwd_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      password_hash TEXT NOT NULL,
      set_date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,
  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      min_length INTEGER DEFAULT 8,
      require_special INTEGER DEFAULT 1,
      require_lowercase INTEGER DEFAULT 1,
      require_uppercase INTEGER DEFAULT 0,
      pwd_valid_days INTEGER DEFAULT 90,
      session_timeout_minutes INTEGER DEFAULT 30,
      login_max_attempts INTEGER DEFAULT 5,
      lock_minutes INTEGER DEFAULT 15,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `,
  activity_logs: `
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      event TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT
    )
  `,
  license_keys: `
    CREATE TABLE IF NOT EXISTS license_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL UNIQUE,
      shift_key INTEGER NOT NULL,
      encrypted_key TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      used_by INTEGER,
      used_at TEXT,
      is_used BOOLEAN DEFAULT 0,
      FOREIGN KEY (used_by) REFERENCES users (id) ON DELETE SET NULL
    )
  `,
  security_events: `
    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      event_type TEXT NOT NULL,
      description TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `
};

const DEFAULT_SETTINGS = {
  min_length: 8,
  require_special: 1,
  require_lowercase: 1,
  require_uppercase: 0,
  pwd_valid_days: 90,
  session_timeout_minutes: 30,
  login_max_attempts: 5,
  lock_minutes: 15
};

const DEFAULT_ADMIN = {
  username: 'ADMIN',
  full_name: 'Administrator',
  password: 'Admin@123',
  role: 'ADMIN'
};

export async function initDb() {
  try {
    db = await open({ 
      filename: './data/db.sqlite', 
      driver: sqlite3.Database 
    });

    // Create tables
    for (const [tableName, schema] of Object.entries(SCHEMA)) {
      await db.exec(schema);
      console.log(`✅ Table ${tableName} initialized`);
    }
    
    // Initialize default settings
    await initializeDefaultSettings();
    
    // Initialize admin user
    await initializeAdminUser();
    console.log('🎉 Database initialization completed');
    return db;
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    throw error;
  }
}

async function initializeDefaultSettings() {
  const existingSettings = await db.get("SELECT * FROM settings WHERE id = 1");
  
  if (!existingSettings) {
    await db.run(
      `INSERT INTO settings (id, min_length, require_special, require_lowercase, require_uppercase, pwd_valid_days, session_timeout_minutes, login_max_attempts, lock_minutes)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(DEFAULT_SETTINGS)
    );
    console.log('✅ Default settings initialized');
  }
}

async function initializeAdminUser() {
  const existingAdmin = await db.get("SELECT * FROM users WHERE username = 'ADMIN' COLLATE NOCASE");
  
  if (!existingAdmin) {
    const passwordHash = await argon2.hash(DEFAULT_ADMIN.password);
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO users (username, full_name, password_hash, role, first_login, pwd_set_date)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [DEFAULT_ADMIN.username, DEFAULT_ADMIN.full_name, passwordHash, DEFAULT_ADMIN.role, now]
    );

    await db.run(
      "INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)",
      [result.lastID, passwordHash, now]
    );

    console.log(`✅ Default admin user created: ${DEFAULT_ADMIN.username} / ${DEFAULT_ADMIN.password}`);
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export async function findUserByUsername(username) {
  return getDb().get("SELECT * FROM users WHERE username = ? COLLATE NOCASE", [username]);
}

export default {
  initDb,
  getDb,
  findUserByUsername
};
