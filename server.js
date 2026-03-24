const axios = require('axios');

const TOKEN = "Bearer APP_USR-502214761032345-122408-b5014c99ed3eb38dbfe805e6677eadf1-453884010";

app.get('/api/ultimo-pagamento', async (req, res) => {
    try {
        const response = await axios.get(
            'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=1',
            {
                headers: {
                    Authorization: `Bearer ${TOKEN}`
                }
            }
        );

        const pagamento = response.data.results[0];

        res.json({
            nome: pagamento.payer?.first_name || "Desconhecido",
            email: pagamento.payer?.email,
            valor: pagamento.transaction_amount,
            data: pagamento.date_created,
            status: pagamento.status
        });

    } catch (e) {
        res.status(500).json({
            erro: true,
            msg: e.message
        });
    }
});
