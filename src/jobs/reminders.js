const cron = require('node-cron');
const db = require('../db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const REMINDER_TITLE = "Lug'atim";
const REMINDER_BODY = "Bugungi so'zlarni yodlashni unutmang!";

async function sendPushBatch(tokens) {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    title: REMINDER_TITLE,
    body: REMINDER_BODY,
    sound: 'default',
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('Push xabar yuborishda xatolik:', err.message);
  }
}

async function sendDailyReminders() {
  const rows = db.prepare('SELECT push_token FROM users WHERE push_token IS NOT NULL').all();
  const tokens = rows.map((r) => r.push_token);

  // Expo push API bir so'rovda ko'pi bilan 100 tokenni qabul qiladi
  for (let i = 0; i < tokens.length; i += 100) {
    await sendPushBatch(tokens.slice(i, i + 100));
  }
}

function startReminderJob() {
  // Har kuni soat 19:00 da (server vaqti bo'yicha)
  cron.schedule('0 19 * * *', () => {
    sendDailyReminders().catch((err) => console.error('Kunlik eslatma xatosi:', err));
  });
}

module.exports = { startReminderJob, sendDailyReminders };
