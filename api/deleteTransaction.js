const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { id } = req.body;
        const auth = new JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
        await doc.loadInfo();

        const logSheet = doc.sheetsByTitle['Operations'] || doc.sheetsByIndex[0];
        const prodSheet = doc.sheetsByTitle['Products'] || doc.sheetsByIndex[1];

        const logRows = await logSheet.getRows();
        const rowToDelete = logRows.find(r => r.rowNumber === id);

        if (rowToDelete) {
            const type = rowToDelete.get('Тип операции') || rowToDelete.get('Type');
            const amount = parseFloat((rowToDelete.get('Сумма') || rowToDelete.get('Amount')).toString().replace(',', '.'));
            const card = rowToDelete.get('Карта') || rowToDelete.get('Card');

            // Возвращаем деньги на баланс (обратная логика)
            const prodRows = await prodSheet.getRows();
            const cardRow = prodRows.find(r => (r.get('Name') || r.get('Название')) === card);
            
            if (cardRow) {
                let currentBalance = parseFloat(cardRow.get('Balance') || cardRow.get('Баланс'));
                if (type === 'Расход') currentBalance += amount;
                else if (type === 'Доход') currentBalance -= amount;
                
                cardRow.set('Balance', currentBalance.toString());
                await cardRow.save();
            }

            await rowToDelete.delete();
            return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Row not found' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
