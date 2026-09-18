const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, adminRequired);

// Barcha foydalanuvchilar ro'yxati — har biri qancha so'z yodlaganini ko'rsatadi
router.get('/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.created_at, u.last_active_at,
              u.telegram_chat_id IS NOT NULL AS telegram_linked,
              (SELECT COUNT(*) FROM topics t WHERE t.user_id = u.id) AS topic_count,
              (SELECT COUNT(*) FROM words w
                 JOIN topics t ON t.id = w.topic_id
                WHERE t.user_id = u.id) AS word_count
       FROM users u
       ORDER BY u.last_active_at DESC NULLS LAST, u.created_at DESC`
    )
    .all();

  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastActiveAt: u.last_active_at,
      telegramLinked: Boolean(u.telegram_linked),
      topicCount: u.topic_count,
      wordCount: u.word_count,
    })),
  });
});

// Tanlangan foydalanuvchining mavzulari
router.get('/users/:id/topics', (req, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  }

  const topics = db
    .prepare(
      `SELECT t.id, t.name, t.created_at,
              (SELECT COUNT(*) FROM words w WHERE w.topic_id = t.id) AS word_count
       FROM topics t
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`
    )
    .all(user.id);

  res.json({ user, topics });
});

// Tanlangan mavzudagi so'zlar
router.get('/topics/:id/words', (req, res) => {
  const topic = db
    .prepare('SELECT t.id, t.name, t.user_id FROM topics t WHERE t.id = ?')
    .get(req.params.id);
  if (!topic) {
    return res.status(404).json({ error: 'Mavzu topilmadi' });
  }

  const words = db
    .prepare('SELECT id, english, uzbek, created_at FROM words WHERE topic_id = ? ORDER BY created_at DESC')
    .all(topic.id);

  res.json({ topic, words });
});

module.exports = router;
