const express = require('express');
const axios = require('axios');
const app = express();

// 🔑 SEU TOKEN MERCADO PAGO
const TOKEN = 'APP_USR-502214761032345-122408-b5014c99ed3eb38dbfe805e6677eadf1-453884010';

// 🔥 ROTA DE SALDO
app.get('/saldo', async (req, res) => {
    try {

        const response = await axios.get(
            'https://api.mercadopago.com/users/me',
            {
                headers: {
                    Authorization: `Bearer ${TOKEN}`
                }
            }
        );

        const data = response.data;

        console.log("RESPOSTA MP:", data);

        let saldo = null;

        // tenta pegar saldo real
        if (data.account_money?.available_balance != null) {
            saldo = data.account_money.available_balance;
        }

        if (saldo === null) {
            return res.json({
                erro: 'Sua conta não expõe saldo via API'
            });
        }

        res.json({
            saldo: saldo
        });

    } catch (err) {
        res.status(500).json({
            erro: 'Erro ao consultar Mercado Pago',
            detalhe: err.message
        });
    }
});

// 🔥 SERVIDOR
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
