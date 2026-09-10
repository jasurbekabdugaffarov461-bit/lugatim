const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// Foydalanuvchining barcha mavzulari (so'zlar sonini ham qaytaradi)
router.get('/', (req, res) => {
  const topics = db
    .prepare(
      `SELECT t.id, t.name, t.created_at,
              (SELECT COUNT(*) FROM words w WHERE w.topic_id = t.id) AS word_count
       FROM topics t
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`
    )
    .all(req.userId);

  res.json({ topics });
});

router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Mavzu nomi kiritilishi shart' });
  }

  const result = db
    .prepare('INSERT INTO topics (user_id, name) VALUES (?, ?)')
    .run(req.userId, name.trim());

  const topic = db.prepare('SELECT id, name, created_at FROM topics WHERE id = ?').get(
    result.lastInsertRowid
  );

  res.status(201).json({ topic });
});

function getOwnedTopic(topicId, userId) {
  return db
    .prepare('SELECT * FROM topics WHERE id = ? AND user_id = ?')
    .get(topicId, userId);
}

router.get('/:id', (req, res) => {
  const topic = getOwnedTopic(req.params.id, req.userId);
  if (!topic) {
    return res.status(404).json({ error: 'Mavzu topilmadi' });
  }
  res.json({ topic });
});

router.delete('/:id', (req, res) => {
  const topic = getOwnedTopic(req.params.id, req.userId);
  if (!topic) {
    return res.status(404).json({ error: 'Mavzu topilmadi' });
  }
  db.prepare('DELETE FROM topics WHERE id = ?').run(topic.id);
  res.status(204).end();
});

// Mavzuga tegishli so'zlar (lug'at)
router.get('/:id/words', (req, res) => {
  const topic = getOwnedTopic(req.params.id, req.userId);
  if (!topic) {
    return res.status(404).json({ error: 'Mavzu topilmadi' });
  }

  const words = db
    .prepare('SELECT id, english, uzbek, created_at FROM words WHERE topic_id = ? ORDER BY created_at DESC')
    .all(topic.id);

  res.json({ topic, words });
});

router.post('/:id/words', (req, res) => {
  const topic = getOwnedTopic(req.params.id, req.userId);
  if (!topic) {
    return res.status(404).json({ error: 'Mavzu topilmadi' });
  }

  const { english, uzbek } = req.body || {};
  if (!english || !english.trim() || !uzbek || !uzbek.trim()) {
    return res.status(400).json({ error: 'Inglizcha va o\'zbekcha so\'z kiritilishi shart' });
  }

  const result = db
    .prepare('INSERT INTO words (topic_id, english, uzbek) VALUES (?, ?, ?)')
    .run(topic.id, english.trim(), uzbek.trim());

  const word = db
    .prepare('SELECT id, english, uzbek, created_at FROM words WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json({ word });
});

module.exports = router;
