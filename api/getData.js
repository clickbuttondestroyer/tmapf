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

        const prodSheet = doc.sheetsByTitle['Products'] || doc.sheetsByIndex[1];
        const logSheet = doc.sheetsByTitle['Operations'] || doc.sheetsByIndex[0];

        const prodRows = await prodSheet.getRows();
        const products = prodRows.map(row => {
            const data = row.toObject();
            const find = (keys) => {
                const key = Object.keys(data).find(k => keys.some(s => k.toLowerCase().includes(s.toLowerCase())));
                return key ? data[key] : null;
            };
            return {
                name: find(['name', 'название']) || '',
                type: find(['type', 'тип']) || '',
                balance: parseFloat((find(['balance', 'баланс']) || '0').toString().replace(',', '.'))
            };
        });

        const logRows = await logSheet.getRows({ limit: 100 });
        const transactions = logRows.map(row => {
            const data = row.toObject();
            const find = (keys) => {
                const key = Object.keys(data).find(k => keys.some(s => k.toLowerCase() === s.toLowerCase() || k.toLowerCase().includes(s.toLowerCase())));
                return key ? data[key] : null;
            };

            return {
                id: row.rowNumber, // Сохраняем номер строки как ID
                type: find(['тип операции', 'type']),
                date: find(['дата операции', 'date', 'дата']),
                amount: find(['сумма', 'amount']),
                card: find(['карта', 'card']),
                category: find(['категория', 'category']),
                description: find(['описание', 'description', 'заметки'])
            };
        }).filter(t => t.type && t.amount).reverse().slice(0, 10);

        return res.status(200).json({ products, transactions });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
