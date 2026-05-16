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
            name: row.get('Name') || row.get('Название') || '',
            type: row.get('Type') || row.get('Тип') || '',
            balance: parseFloat(row.get('Balance') || row.get('Баланс') || 0)
        }));

        // Получаем последние операции (берем чуть больше, чтобы отфильтровать пустые если есть)
        const logRows = await logSheet.getRows({ limit: 50 }); 
        
        const transactions = logRows.map(row => {
            // Маппинг с учетом возможных русских названий колонок из твоего описания
            const type = row.get('Тип операции') || row.get('Type') || '';
            const date = row.get('Дата операции') || row.get('Date') || '';
            const amount = row.get('Сумма') || row.get('Amount') || 0;
            const card = row.get('Карта') || row.get('Card') || '';
            const category = row.get('Категория') || row.get('Category') || '';
            
            return { type, date, amount, card, category };
        }).filter(t => t.type).reverse().slice(0, 10); // Оставляем только 10 последних

        return res.status(200).json({ products, transactions });
    } catch (error) {
        console.error('GetData Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
