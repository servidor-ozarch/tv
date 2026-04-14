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
app.get('/relatorio', async (req, res) => {

    const relatorio = {

        // 🔍 DADOS REAIS
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
            descricao: "Pedidos (merchant orders)",
            resposta: await consultar('https://api.mercadopago.com/merchant_orders/search')
        },

        // 🧠 CAPACIDADES (SEM RISCO)
        pix: {
            descricao: "Pagamento via Pix",
            disponivel: true,
            como_usar: "Criar pagamento com payment_method_id = pix"
        },

        cartao: {
            descricao: "Pagamento com cartão",
            disponivel: true,
            como_usar: "Usar token de cartão na API /v1/payments"
        },

        parcelamento: {
            descricao: "Pagamento parcelado",
            disponivel: true,
            como_usar: "Usar campo installments"
        },

        qr_code: {
            descricao: "Pagamento via QR Code",
            disponivel: true,
            como_usar: "Gerado automaticamente em pagamentos Pix ou Point"
        },

        nfc: {
            descricao: "Pagamento por aproximação (NFC)",
            disponivel: false,
            detalhe: "Disponível apenas via maquininhas Point ou SDK mobile"
        },

        link_pagamento: {
            descricao: "Link de pagamento",
            disponivel: true,
            como_usar: "Endpoint /checkout/preferences"
        },

        transferencia: {
            descricao: "Transferência de dinheiro",
            disponivel: false,
            detalhe: "Restrito para contas com permissão especial"
        }

    };

    res.json(relatorio);
});
