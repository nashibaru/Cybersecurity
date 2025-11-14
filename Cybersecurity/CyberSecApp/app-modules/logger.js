// app-mpdules/logger.js
import dbModule from './db.js';
const { getDb } = dbModule;

export async function logEvent(username, event, details = '') {
  const db = getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO activity_logs (username, event, details, created_at) VALUES (?, ?, ?, ?)`,
    [username || null, event, details, now]
  );
}

export async function fetchLogs(limit = 500, offset = 0) {
  const db = getDb();
  return db.all(
    `SELECT id, username, event, details, created_at
     FROM activity_logs
     ORDER BY datetime(created_at) DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}