const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { type, amount, card, toCard, category, description } = req.body;
        const amountNum = parseFloat(amount);

        const auth = new JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
        await doc.loadInfo();

        const logSheet = doc.sheetsByIndex[0]; // Operations
        const prodSheet = doc.sheetsByIndex[1]; // Products
        const prodRows = await prodSheet.getRows();

        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU');
        const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        let finalBalance = 0;

        // ЛОГИКА ОБНОВЛЕНИЯ БАЛАНСОВ
        if (type === 'Перевод') {
            const fromRow = prodRows.find(r => r.get('Name') === card);
            const toRow = prodRows.find(r => r.get('Name') === toCard);

            if (fromRow && toRow) {
                fromRow.set('Balance', parseFloat(fromRow.get('Balance')) - amountNum);
                toRow.set('Balance', parseFloat(toRow.get('Balance')) + amountNum);
                await fromRow.save();
                await toRow.save();
                finalBalance = fromRow.get('Balance'); // Для лога берем остаток карты-отправителя
            }
        } else {
            const row = prodRows.find(r => r.get('Name') === card);
            if (row) {
                let current = parseFloat(row.get('Balance'));
                
                if (type === 'Расход') current -= amountNum;
                else if (type === 'Доход') current += amountNum;
                
                row.set('Balance', current);
                await row.save();
                finalBalance = current;

                // Если это погашение кредита/долга (категория "Кредиты" или "Долг")
                // Находим этот долг в реестре и уменьшаем его сумму
                if (category.includes('Кредит') || category.includes('Долг')) {
                    const debtRow = prodRows.find(r => r.get('Name') === description); // В описании передаем имя долга
                    if (debtRow) {
                        let debtBalance = parseFloat(debtRow.get('Balance'));
                        debtBalance -= amountNum;
                        if (debtBalance <= 0) {
                            // Если долг погашен — можно либо обнулить, либо оставить 0
                            debtRow.set('Balance', 0);
                        } else {
                            debtRow.set('Balance', debtBalance);
                        }
                        await debtRow.save();
                    }
                }
            }
        }

        // ЗАПИСЬ В ЛОГ ОПЕРАЦИЙ
        await logSheet.addRow([
            type, 
            dateStr, 
            timeStr, 
            amountNum, 
            type === 'Перевод' ? `${card} -> ${toCard}` : card, 
            category, 
            description, 
            finalBalance
        ]);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}