let db;

async function initDb(sqlite3, open, argon2) {
  db = await open({ filename: './data/db.sqlite', driver: sqlite3.Database });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'USER',
      blocked INTEGER DEFAULT 0,
      first_login INTEGER DEFAULT 1,
      pwd_set_date TEXT,
      pwd_valid_days INTEGER DEFAULT 90
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pwd_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      password_hash TEXT NOT NULL,
      set_date TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      min_length INTEGER DEFAULT 8,
      require_special INTEGER DEFAULT 1,
      require_lowercase INTEGER DEFAULT 1,
      require_uppercase INTEGER DEFAULT 0,
      pwd_valid_days INTEGER DEFAULT 90
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      event TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const settings = await db.get("SELECT * FROM settings WHERE id=1");
  if (!settings) {
    await db.run(`INSERT INTO settings (id, min_length, require_special, require_lowercase, require_uppercase, pwd_valid_days)
                  VALUES (1, 8, 1, 1, 0, 90)`);
  }

  const admin = await db.get("SELECT * FROM users WHERE username = 'ADMIN' COLLATE NOCASE");
  if (!admin) {
    const defaultPw = 'Admin@123';
    const h = await argon2.hash(defaultPw);
    const now = new Date().toISOString();
    const info = await db.run(
      `INSERT INTO users (username, full_name, password_hash, role, blocked, first_login, pwd_set_date, pwd_valid_days)
       VALUES (?, ?, ?, 'ADMIN', 0, 1, ?, 90)`,
      ['ADMIN', 'Administrator', h, now]
    );
    const uid = info.lastID;
    await db.run("INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)", [uid, h, now]);
    console.log("Utworzono domyślnego ADMIN: 'ADMIN' z hasłem 'Admin@123' (pierwsze logowanie wymaga zmiany hasła).");
  }
}

/**
 * Znajduje użytkownika po nazwie w bazie.
 * @param {string} username 
 */
async function findUserByUsername(username) {
  return db.get("SELECT * FROM users WHERE username = ? COLLATE NOCASE", [username]);
}

function getDb() {
  return db;
}

export default {
  initDb,
  findUserByUsername,
  getDb
};
