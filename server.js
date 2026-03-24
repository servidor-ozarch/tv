const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

console.log("🔥 IPTV CLICK + TOKEN MASTER");

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

// 🚀 CAPTURA REAL COM CLIQUE
async function capturarStream(slug) {
    let browser;

    try {
        const url = BASE + slug;

        console.log("🌐 Abrindo:", url);

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });

        const page = await browser.newPage();

        let streamEncontrado = null;

        // 🚫 BLOQUEAR REDIRECIONAMENTO (ADS)
        await page.setRequestInterception(true);

        page.on('request', (request) => {
            const reqUrl = request.url();

            // bloqueia domínios suspeitos
            if (
                reqUrl.includes('gappedpeatmen') ||
                reqUrl.includes('doubleclick') ||
                reqUrl.includes('ads') ||
                reqUrl.includes('tracker')
            ) {
                return request.abort();
            }

            request.continue();
        });

        // 🎯 CAPTURA RESPOSTAS (.txt)
        page.on('response', async (response) => {
            const resUrl = response.url();

            if (resUrl.includes('.txt')) {
                console.log("🎯 TXT encontrado:", resUrl);
                streamEncontrado = resUrl;
            }
        });

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // ⏳ Espera botão aparecer
        try {
            await page.waitForSelector('.startplayer', { timeout: 8000 });

            console.log("🖱️ Botão encontrado, clicando...");

            await page.evaluate(() => {
                const btn = document.querySelector('.startplayer');
                if (btn) btn.click();
            });

        } catch (e) {
            console.log("⚠️ Botão não apareceu, seguindo...");
        }

        // ⏳ espera o player carregar e fazer requisições
        await new Promise(r => setTimeout(r, 8000));

        await browser.close();

        return streamEncontrado;

    } catch (e) {
        console.log("Erro capturarStream:", e.message);

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
    res.send("IPTV CLICK ativo 🚀");
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
