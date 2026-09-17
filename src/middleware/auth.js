const jwt = require('jsonwebtoken');
const db = require('../db');

const touchActivity = db.prepare(
  "UPDATE users SET last_active_at = datetime('now') WHERE id = ?"
);

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token topilmadi' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    touchActivity.run(payload.userId);
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz yoki muddati o\'tgan' });
  }
}

module.exports = { authRequired };
