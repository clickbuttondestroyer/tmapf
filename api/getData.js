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
        const products = prodRows.map(row => ({
            name: row.get('Name'),
            type: row.get('Type'),
            balance: parseFloat(row.get('Balance')) || 0
        }));

        const logRows = await logSheet.getRows({ limit: 10, offset: 0 }); // Последние 10 операций
        const transactions = logRows.map(row => ({
            type: row.get('Type'),
            date: row.get('Date'),
            amount: row.get('Amount'),
            card: row.get('Card'),
            category: row.get('Category')
        })).reverse();

        return res.status(200).json({ products, transactions });
    } catch (error) {
        console.error('GetData Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
