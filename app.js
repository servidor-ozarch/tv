const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// 🔑 TOKEN MERCADO PAGO
const TOKEN = 'APP_USR-502214761032345-122408-b5014c99ed3eb38dbfe805e6677eadf1-453884010';

// 🔓 LIBERA ACESSO DO HTML
app.use(cors());

// 🟢 ROTA PRINCIPAL
app.get('/', (req, res) => {
    res.send('API ONLINE 🚀');
});

// 💰 ROTA DE SALDO
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

        console.log('RESPOSTA MP:', data);

        let saldo = null;

        // tenta pegar saldo
        if (data.account_money && data.account_money.available_balance != null) {
            saldo = data.account_money.available_balance;
        }

        if (saldo === null) {
            return res.json({
                erro: 'Saldo não disponível nessa conta'
            });
        }

        res.json({
            saldo: saldo
        });

    } catch (err) {

        console.error('ERRO:', err.message);

        res.status(500).json({
            erro: 'Erro ao consultar Mercado Pago',
            detalhe: err.message
        });

    }
});

// 🔄 ROTA PING (ANTI-SLEEP)
app.get('/ping', (req, res) => {
    res.send('pong');
});

// 🌐 PORTA DO RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Servidor rodando na porta ' + PORT);
});
