const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const TOKEN = process.env.TOKEN;

// 🔧 FUNÇÃO QUE FALTAVA
async function consultar(url) {
    try {
        const res = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${APP_USR-502214761032345-122408-b5014c99ed3eb38dbfe805e6677eadf1-453884010}`
            }
        });

        return { ok: true, dados: res.data };

    } catch (err) {

        return {
            ok: false,
            erro: err.response?.data || err.message
        };
    }
}

// 🟢 TESTE
app.get('/', (req, res) => {
    res.send('API ONLINE 🚀');
});

// 📊 RELATÓRIO
app.get('/relatorio', async (req, res) => {

    const relatorio = {

        usuario: {
            descricao: "Dados da conta",
            resposta: await consultar('https://api.mercadopago.com/users/me')
        },

        pagamentos: {
            descricao: "Consultar pagamentos",
            resposta: await consultar('https://api.mercadopago.com/v1/payments/search?limit=5')
        },

        clientes: {
            descricao: "Clientes cadastrados",
            resposta: await consultar('https://api.mercadopago.com/v1/customers/search')
        },

        assinaturas: {
            descricao: "Pagamentos recorrentes",
            resposta: await consultar('https://api.mercadopago.com/preapproval/search')
        },

        pedidos: {
            descricao: "Pedidos",
            resposta: await consultar('https://api.mercadopago.com/merchant_orders/search')
        },

        pix: {
            descricao: "Pagamento via Pix",
            disponivel: true
        },

        cartao: {
            descricao: "Pagamento com cartão",
            disponivel: true
        },

        nfc: {
            descricao: "Pagamento por aproximação",
            disponivel: false
        }

    };

    res.json(relatorio);
});

// PORTA
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Rodando na porta ' + PORT);
});
