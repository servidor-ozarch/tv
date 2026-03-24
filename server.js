const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

console.log("🔥 IPTV JS CAPTURE MASTER");

// 🌐 BASE
const BASE = "https://www3.embedtv.best/";

// 🖼️ LOGOS
const BASE_LOGO = "https://raw.githubusercontent.com/servidor-ozarch/tv/main/live/logotipo/";

// 📺 CANAIS
let canais = [
    { nome: "A&E", slug: "ae", url: null },
    { nome: "Cinemax", slug: "cinemax", url: null },
    { nome: "HBO", slug: "hbo", url: null },
    { nome: "Premiere", slug: "premiere", url: null }
];

// 🚀 CAPTURA REAL VIA JS (PUPPETEER)
async function capturarStream(slug) {
    let browser;

    try {
        const url = BASE + slug;

        console.log("🌐 Abrindo:", url);

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // capturar requisições de rede
        let streamEncontrado = null;

        page.on('response', async (response) => {
            const url = response.url();

            if (url.includes('.txt')) {
                console.log("🎯 TXT capturado:", url);
                streamEncontrado = url;
            }
        });

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // espera JS carregar
        await new Promise(r => setTimeout(r, 5000));

        await browser.close();

        return streamEncontrado;

    } catch (e) {
        console.log("Erro Puppeteer:", e.message);
        if (browser) await browser.close();
        return null;
    }
}

// 🔄 ATUALIZA CANAIS
async function atualizarCanais() {
    console.log("🔄 Atualizando canais...");

    for (let canal of canais) {

        console.log("🔍 Buscando:", canal.nome);

        const novoLink = await capturarStream(canal.slug);

        if (novoLink) {
            if (novoLink !== canal.url) {
                console.log("🔥 Atualizado:", canal.nome);
                canal.url = novoLink;
            } else {
                console.log("✔️ Mesmo link:", canal.nome);
            }
        } else {
            console.log("⚠️ Mantendo cache:", canal.nome);
        }
    }
}

// ⏱️ 5 MIN
setInterval(atualizarCanais, 300000);

// 🚀 PRIMEIRA EXECUÇÃO
atualizarCanais();

// 📺 LISTA IPTV
app.get('/api/lista-top.m3u8', (req, res) => {
    let m3u = "#EXTM3U\n";

    canais.forEach(c => {
        const logo = `${BASE_LOGO}${c.slug}.png`;

        if (c.url) {
            m3u += `#EXTINF:-1 tvg-name="${c.slug}" tvg-logo="${logo}" group-title="Canais",${c.nome}\n${c.url}\n`;
        } else {
            m3u += `#EXTINF:-1 tvg-name="${c.slug}" tvg-logo="${logo}" group-title="Canais",${c.nome}\n# aguardando stream\n`;
        }
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u);
});

// 📊 DEBUG
app.get('/api/canais', (req, res) => {
    res.json(canais);
});

// 🟢 STATUS
app.get('/', (req, res) => {
    res.send("IPTV JS CAPTURE ativo 🚀");
});

// 🚫 FALLBACK
app.use((req, res) => {
    res.status(404).send("Rota não encontrada ❌");
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});
