const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { publicUser } = require('../utils/publicUser');
const telegram = require('../lib/telegram');
const { ensureLinkCode } = require('./telegram');

const router = express.Router();
router.use(authRequired);

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname) || '';
    cb(null, `user-${req.userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error('Faqat PNG, JPEG yoki WEBP rasm qabul qilinadi'));
    }
    cb(null, true);
  },
});

function deleteAvatarFile(avatarPath) {
  if (!avatarPath) return;
  const filePath = path.join(uploadsDir, path.basename(avatarPath));
  fs.unlink(filePath, () => {});
}

router.post('/me/avatar', (req, res) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Rasm yuklab bo\'lmadi' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Rasm fayli kiritilishi shart' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    deleteAvatarFile(user.avatar_path);

    const avatarPath = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').run(avatarPath, req.userId);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    res.json({ user: publicUser(updated, req) });
  });
});

router.delete('/me/avatar', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  deleteAvatarFile(user.avatar_path);

  db.prepare('UPDATE users SET avatar_path = NULL WHERE id = ?').run(req.userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({ user: publicUser(updated, req) });
});

router.put('/me/push-token', (req, res) => {
  const { pushToken } = req.body || {};
  if (!pushToken || typeof pushToken !== 'string') {
    return res.status(400).json({ error: 'pushToken kiritilishi shart' });
  }

  db.prepare('UPDATE users SET push_token = ? WHERE id = ?').run(pushToken, req.userId);
  res.status(204).end();
});

router.get('/me/telegram-link', async (req, res) => {
  if (!telegram.isConfigured()) {
    return res.status(503).json({ error: 'Telegram bot hali sozlanmagan' });
  }

  try {
    const username = await telegram.getBotUsername();
    const code = ensureLinkCode(req.userId);
    res.json({ url: `https://t.me/${username}?start=${code}` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Telegram havolasini olib bo\'lmadi' });
  }
});

module.exports = router;
