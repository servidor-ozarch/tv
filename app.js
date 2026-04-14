const express = require('express');
const axios = require('axios');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 🔒 CONTROLE (evita estourar memória)
let rodando = false;


// ==============================
// 🔎 1. TENTA PEGAR VIA AXIOS (.txt)
// ==============================
async function pegarTxt(url) {
    try {
        const { data } = await axios.get(url, {
            timeout: 10000
        });

        // procura URLs dentro do conteúdo
        const match = data.match(/https?:\/\/[^\s"]+/g);

        if (match) {
            return match[0];
        }

        return null;

    } catch (e) {
        console.log('Erro AXIOS:', e.message);
        return null;
    }
}


// ==============================
// 🧠 2. PUPPETEER (LEVE + CONTROLADO)
// ==============================
async function tentarPuppeteer(url) {
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();

        let resultado = null;

        // 🎯 captura requisições .txt
        page.on('response', async (response) => {
            const u = response.url();

            if (u.endsWith('.txt')) {
                resultado = u;
            }
        });

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        await page.waitForTimeout(5000); // espera JS rodar

        return resultado;

    } catch (e) {
        console.log('Erro Puppeteer:', e.message);
        return null;

    } finally {
        if (browser) await browser.close();
    }
}


// ==============================
// 🚦 3. CONTROLE DE FILA (ANTI-CRASH)
// ==============================
async function seguroPuppeteer(url) {
    if (rodando) {
        console.log('⛔ Puppeteer já em uso');
        return null;
    }

    rodando = true;

    const res = await tentarPuppeteer(url);

    rodando = false;

    return res;
}


// ==============================
// 🎯 4. FUNÇÃO PRINCIPAL
// ==============================
async function pegarLink(url) {

    // 🔥 tenta leve primeiro
    let link = await pegarTxt(url);

    if (link) {
        console.log('✅ Axios resolveu:', link);
        return link;
    }

    console.log('⚠️ Axios falhou, usando Puppeteer...');

    link = await seguroPuppeteer(url);

    if (link) {
        console.log('🔥 Puppeteer resolveu:', link);
    } else {
        console.log('❌ Nada encontrado');
    }

    return link;
}


// ==============================
// 🌐 5. API
// ==============================
app.get('/buscar', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({
            erro: 'Informe a URL'
        });
    }

    const resultado = await pegarLink(url);

    res.json({
        status: resultado ? 'ok' : 'erro',
        resultado: resultado
    });
});


// ==============================
// 🚀 START
// ==============================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
