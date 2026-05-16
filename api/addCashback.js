const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { card, category, percent } = req.body;
        const auth = new JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
        await doc.loadInfo();

        let sheet = doc.sheetsByTitle['Cashback'];
        if (!sheet) {
            // Если листа нет, создаем его с заголовками
            sheet = await doc.addSheet({ title: 'Cashback', headerValues: ['Карта', 'Категория', 'Процент'] });
        }

        await sheet.addRow([card, category, percent]);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
