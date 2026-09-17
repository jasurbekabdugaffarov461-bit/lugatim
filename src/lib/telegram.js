const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

let cachedUsername = null;

function isConfigured() {
  return Boolean(BOT_TOKEN);
}

async function getBotUsername() {
  if (!isConfigured()) return null;
  if (cachedUsername) return cachedUsername;

  const res = await fetch(`${API_BASE}/getMe`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'Bot ma\'lumotini olib bo\'lmadi');

  cachedUsername = data.result.username;
  return cachedUsername;
}

async function sendMessage(chatId, text) {
  if (!isConfigured()) return;

  await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch((err) => console.error('Telegram xabar yuborishda xatolik:', err.message));
}

async function setWebhook(url) {
  if (!isConfigured()) throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan');

  const res = await fetch(`${API_BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

module.exports = { isConfigured, getBotUsername, sendMessage, setWebhook };
