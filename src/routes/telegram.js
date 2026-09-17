const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const telegram = require('../lib/telegram');

const router = express.Router();

// Telegram serverlari shu manzilga foydalanuvchi botga yozganda POST so'rov yuboradi.
// Autentifikatsiya talab qilinmaydi — bu ochiq webhook.
router.post('/webhook', async (req, res) => {
  res.status(200).end(); // Telegramga darrov javob beramiz, qolganini fonda bajaramiz

  try {
    const message = req.body?.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text.startsWith('/start')) {
      const code = text.split(' ')[1];
      if (!code) {
        await telegram.sendMessage(
          chatId,
          "Salom! Ilovadagi \"Telegram bot bilan bog'lanish\" tugmasi orqali kelgan bo'lsangiz, bog'lanish avtomatik amalga oshadi."
        );
        return;
      }

      const user = db.prepare('SELECT id FROM users WHERE telegram_link_code = ?').get(code);
      if (!user) {
        await telegram.sendMessage(chatId, "Havola yaroqsiz. Ilovadan qaytadan urinib ko'ring.");
        return;
      }

      db.prepare('UPDATE users SET telegram_chat_id = ? WHERE id = ?').run(String(chatId), user.id);
      await telegram.sendMessage(
        chatId,
        "✅ Bog'landi! Endi agar 24 soat ilovaga kirmasangiz, sizga shu yerdan eslatma yuboraman."
      );
    }
  } catch (err) {
    console.error('Telegram webhook xatosi:', err);
  }
});

function ensureLinkCode(userId) {
  const user = db.prepare('SELECT telegram_link_code FROM users WHERE id = ?').get(userId);
  if (user.telegram_link_code) return user.telegram_link_code;

  const code = crypto.randomBytes(12).toString('hex');
  db.prepare('UPDATE users SET telegram_link_code = ? WHERE id = ?').run(code, userId);
  return code;
}

module.exports = { router, ensureLinkCode };
