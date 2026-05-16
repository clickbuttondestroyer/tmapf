const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, type, balance } = req.body;
    if (!name || !type || balance === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const auth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
    await doc.loadInfo();

    // Пытаемся найти лист "Products" по названию или индексу
    let sheet = doc.sheetsByTitle['Products'] || doc.sheetsByIndex[1]; 
    
    if (!sheet) {
      return res.status(500).json({ error: 'Sheet "Products" not found' });
    }

    await sheet.addRow([name, type, balance, new Date().toLocaleDateString('ru-RU')]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('AddProduct Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
