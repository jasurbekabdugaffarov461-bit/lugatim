const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { publicUser } = require('../utils/publicUser');

const router = express.Router();

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 3650; // ~10 yil — foydalanuvchi bir marta kirsa, deyarli umrbod qayta kirmaydi

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ensureAdminFlag(user) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (adminEmail && user.email === adminEmail && !user.is_admin) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
    user.is_admin = 1;
  }
  return user;
}

function issueAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
    userId,
    token,
    expiresAt
  );
  return token;
}

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email manzilni to\'g\'ri kiriting' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Parol kamida 6 belgidan iborat bo\'lishi kerak' });
  }
  const normalizedEmail = email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'Bu email bilan akkount allaqachon mavjud' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(normalizedEmail, passwordHash);
  const user = ensureAdminFlag(db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid));

  const accessToken = issueAccessToken(user.id);
  const refreshToken = issueRefreshToken(user.id);

  res.status(201).json({ accessToken, refreshToken, user: publicUser(user, req) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email va parol kiritilishi shart' });
  }
  const normalizedEmail = email.trim().toLowerCase();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
  }
  ensureAdminFlag(user);

  const accessToken = issueAccessToken(user.id);
  const refreshToken = issueRefreshToken(user.id);

  res.json({ accessToken, refreshToken, user: publicUser(user, req) });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken kiritilishi shart' });
  }

  const row = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
  if (!row) {
    return res.status(401).json({ error: 'Refresh token yaroqsiz' });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
    return res.status(401).json({ error: 'Refresh token muddati tugagan, qayta kiring' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  if (!user) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
    return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
  }
  ensureAdminFlag(user);

  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE refresh_tokens SET expires_at = ? WHERE id = ?').run(newExpiresAt, row.id);

  const accessToken = issueAccessToken(user.id);
  res.json({ accessToken, user: publicUser(user, req) });
});

router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }
  res.status(204).end();
});

module.exports = router;
