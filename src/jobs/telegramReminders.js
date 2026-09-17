const cron = require('node-cron');
const db = require('../db');
const telegram = require('../lib/telegram');

const INACTIVITY_HOURS = 24;

const MESSAGES = [
  "Assalomu alaykum! 24 soatdan beri ilovaga kirmadingiz — siz dars qilishingiz kerak 📚",
  "So'zlarni unutmang! Bugun hali Lug'atim'ga kirmadingiz, birozgina vaqt ajratsangiz-chi?",
  "Yodlash — kunlik odat bo'lishi kerak. Keling, hozir Lug'atim'ni ochib, bir necha so'z o'rganamiz!",
  "Til o'rganish uzluksizlik bilan yaxshi natija beradi. Lug'atim sizni sog'indi!",
];

function pickMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

async function sendInactivityReminders() {
  if (!telegram.isConfigured()) return;

  const candidates = db
    .prepare(
      `SELECT id, telegram_chat_id FROM users
       WHERE telegram_chat_id IS NOT NULL
         AND (last_active_at IS NULL OR datetime(last_active_at) <= datetime('now', ?))
         AND (last_reminder_sent_at IS NULL OR datetime(last_reminder_sent_at) <= datetime('now', ?))`
    )
    .all(`-${INACTIVITY_HOURS} hours`, `-${INACTIVITY_HOURS} hours`);

  for (const user of candidates) {
    await telegram.sendMessage(user.telegram_chat_id, pickMessage());
    db.prepare("UPDATE users SET last_reminder_sent_at = datetime('now') WHERE id = ?").run(user.id);
  }
}

function startTelegramReminderJob() {
  // Har soatda bir marta tekshiradi — kim 24 soatdan beri faol emasligini topadi
  cron.schedule('0 * * * *', () => {
    sendInactivityReminders().catch((err) => console.error('Telegram eslatma xatosi:', err));
  });
}

module.exports = { startTelegramReminderJob, sendInactivityReminders };
