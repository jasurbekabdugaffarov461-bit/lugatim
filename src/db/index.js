const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

// Docker'da doimiy volume orqali saqlash uchun DATA_DIR beriladi;
// lokal ishlab chiqishda esa loyihaning o'z papkasi ishlatiladi.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'data.sqlite'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    english TEXT NOT NULL,
    uzbek TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Eski (allaqachon yaratilgan) bazalarda yangi ustun bo'lmasligi mumkin —
// CREATE TABLE IF NOT EXISTS eski jadvalni o'zgartirmaydi, shuning uchun
// ustunlarni qo'lda qo'shamiz va ular allaqachon bor bo'lsa xatoni e'tiborsiz qoldiramiz.
const extraColumns = [
  'ALTER TABLE users ADD COLUMN push_token TEXT',
  'ALTER TABLE users ADD COLUMN telegram_chat_id TEXT',
  'ALTER TABLE users ADD COLUMN telegram_link_code TEXT',
  'ALTER TABLE users ADD COLUMN last_active_at TEXT',
  'ALTER TABLE users ADD COLUMN last_reminder_sent_at TEXT',
];
for (const sql of extraColumns) {
  try {
    db.exec(sql);
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}

module.exports = db;
