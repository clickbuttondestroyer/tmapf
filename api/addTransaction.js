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

        const logSheet = doc.sheetsByTitle['Operations'] || doc.sheetsByIndex[0];
        const prodSheet = doc.sheetsByTitle['Products'] || doc.sheetsByIndex[1];
        
        if (!logSheet || !prodSheet) {
            return res.status(500).json({ error: 'Required sheets (Operations or Products) not found' });
        }

        const prodRows = await prodSheet.getRows();
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU');
        const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        let finalBalance = 0;

        if (type === 'Перевод') {
            const fromRow = prodRows.find(r => r.get('Name') === card);
            const toRow = prodRows.find(r => r.get('Name') === toCard);

            if (fromRow && toRow) {
                fromRow.set('Balance', (parseFloat(fromRow.get('Balance')) - amountNum).toString());
                toRow.set('Balance', (parseFloat(toRow.get('Balance')) + amountNum).toString());
                await fromRow.save();
                await toRow.save();
                finalBalance = fromRow.get('Balance');
            } else {
                return res.status(400).json({ error: 'One or both accounts not found' });
            }
        } else {
            const row = prodRows.find(r => r.get('Name') === card);
            if (row) {
                let current = parseFloat(row.get('Balance'));
                if (type === 'Расход') current -= amountNum;
                else if (type === 'Доход') current += amountNum;
                
                row.set('Balance', current.toString());
                await row.save();
                finalBalance = current;

                if (category.includes('Кредит') || category.includes('Долг')) {
                    const debtRow = prodRows.find(r => r.get('Name') === description);
                    if (debtRow) {
                        let debtBalance = parseFloat(debtRow.get('Balance'));
                        debtBalance -= amountNum;
                        debtRow.set('Balance', Math.max(0, debtBalance).toString());
                        await debtRow.save();
                    }
                }
            } else {
                return res.status(400).json({ error: 'Account not found' });
            }
        }

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
        console.error('AddTransaction Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
