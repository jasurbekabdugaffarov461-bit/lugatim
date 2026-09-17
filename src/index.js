require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

require('./db');

const authRoutes = require('./routes/auth');
const topicsRoutes = require('./routes/topics');
const wordsRoutes = require('./routes/words');
const usersRoutes = require('./routes/users');
const { router: telegramRoutes } = require('./routes/telegram');
const { startReminderJob } = require('./jobs/reminders');
const { startTelegramReminderJob } = require('./jobs/telegramReminders');

const app = express();
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/telegram', telegramRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Topilmadi' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi`);
  startReminderJob();
  startTelegramReminderJob();
});
