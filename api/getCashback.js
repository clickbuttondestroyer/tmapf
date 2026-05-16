const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const auth = new JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
        await doc.loadInfo();

        const sheet = doc.sheetsByTitle['Cashback'] || doc.sheetsByIndex[2];
        if (!sheet) return res.status(200).json({ categories: [] });

        const rows = await sheet.getRows();
        
        // Получаем текущий месяц в формате ММ-ГГГГ
        const now = new Date();
        const currentPeriod = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;

        const categories = rows.map(r => ({
            period: r.get('Period') || '',
            source: r.get('Source') || '',
            category: r.get('Category') || '',
            percent: r.get('Value') || '0'
        })).filter(c => c.period === currentPeriod); // Показываем только актуальные

        return res.status(200).json({ categories });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
