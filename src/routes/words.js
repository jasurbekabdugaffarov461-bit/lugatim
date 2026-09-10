const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function getOwnedWord(wordId, userId) {
  return db
    .prepare(
      `SELECT w.* FROM words w
       JOIN topics t ON t.id = w.topic_id
       WHERE w.id = ? AND t.user_id = ?`
    )
    .get(wordId, userId);
}

router.put('/:id', (req, res) => {
  const word = getOwnedWord(req.params.id, req.userId);
  if (!word) {
    return res.status(404).json({ error: 'So\'z topilmadi' });
  }

  const { english, uzbek } = req.body || {};
  if (!english || !english.trim() || !uzbek || !uzbek.trim()) {
    return res.status(400).json({ error: 'Inglizcha va o\'zbekcha so\'z kiritilishi shart' });
  }

  db.prepare('UPDATE words SET english = ?, uzbek = ? WHERE id = ?').run(
    english.trim(),
    uzbek.trim(),
    word.id
  );

  const updated = db.prepare('SELECT id, english, uzbek, created_at FROM words WHERE id = ?').get(
    word.id
  );

  res.json({ word: updated });
});

router.delete('/:id', (req, res) => {
  const word = getOwnedWord(req.params.id, req.userId);
  if (!word) {
    return res.status(404).json({ error: 'So\'z topilmadi' });
  }

  db.prepare('DELETE FROM words WHERE id = ?').run(word.id);
  res.status(204).end();
});

module.exports = router;
