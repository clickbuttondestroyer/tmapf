const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  // Настройка CORS, чтобы Telegram Mini App мог отправлять запросы без ошибок
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка предварительного запроса (preflight) от браузера
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Принимаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен. Используйте POST.' });
  }

  try {
    // Получаем данные транзакции от фронтенда
    const { type, date, time, amount, account, category, description, cardAfterBalance } = req.body;

    // Vercel иногда "съедает" реальные переносы строк в переменных окружения. 
    // Эта строчка гарантирует, что приватный ключ прочитается корректно.
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    // Настраиваем авторизацию для Google Sheets
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Подключаемся к документу по ID
    const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo(); // Загружаем информацию о документе

    // Выбираем первый лист (индекс 0) — наш лист Transactions
    const sheet = doc.sheetsByIndex[0];

    // Записываем новую строку в конец таблицы
    // Порядок должен совпадать с заголовками в твоей таблице!
    await sheet.addRow([type, date, time, amount, account, category, description, cardAfterBalance]);

    // Отвечаем фронтенду, что всё прошло успешно
    return res.status(200).json({ success: true, message: 'Транзакция успешно записана!' });

  } catch (error) {
    console.error('Ошибка записи в БД:', error);
    return res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
}