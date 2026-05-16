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
            const data = rowToDelete.toObject();
            const find = (keys) => {
                const key = Object.keys(data).find(k => keys.some(s => k.toLowerCase().includes(s.toLowerCase())));
                return key ? data[key] : null;
            };

            const type = find(['type', 'тип']);
            const amount = parseFloat((find(['amount', 'сумма']) || '0').toString().replace(',', '.'));
            const card = find(['card', 'карта']);

            // Возвращаем деньги на баланс
            const prodRows = await prodSheet.getRows();
            const cardRow = prodRows.find(r => {
                const pData = r.toObject();
                const name = pData['Name'] || pData['Название'] || pData['name'] || pData['название'];
                return name === card;
            });
            
            if (cardRow) {
                const bKey = Object.keys(cardRow.toObject()).find(k => k.toLowerCase().includes('balance') || k.toLowerCase().includes('баланс'));
                let currentBalance = parseFloat(cardRow.get(bKey).toString().replace(',', '.'));
                
                if (type.toLowerCase().includes('расход')) currentBalance += amount;
                else if (type.toLowerCase().includes('доход')) currentBalance -= amount;
                
                cardRow.set(bKey, currentBalance.toString());
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
