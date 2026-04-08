const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const URL_BASE = "https://www4.embedtv.best";

// ================= CACHE =================
const cache = {};
const CACHE_TTL = 1000 * 60 * 10; // 10 minutos

// ================= BROWSER =================
let browserInstance = null;
let isLaunching = false;

async function getBrowser() {
    if (browserInstance) return browserInstance;

    if (isLaunching) {
        while (!browserInstance) {
            await new Promise(r => setTimeout(r, 300));
        }
        return browserInstance;
    }

    try {
        isLaunching = true;

        browserInstance = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote'
            ]
        });

        console.log("✅ Browser iniciado");
        return browserInstance;

    } catch (err) {
        console.error("❌ ERRO AO INICIAR BROWSER:", err);
        browserInstance = null;
        throw err;
    } finally {
        isLaunching = false;
    }
}

// ================= LISTA DE CANAIS =================
const canais = [
    { nome: "Cinemax", canal: "cinemax", categoria: "Filmes" },
    { nome: "HBO", canal: "hbo", categoria: "Filmes" },
    { nome: "SBT", canal: "sbt", categoria: "TV Aberta" }
];

// ================= API CANAIS =================
app.get('/canais', (req, res) => {
    res.json({
        status: "online",
        total: canais.length,
        canais: canais.map((c, i) => ({
            id: i + 1,
            nome: c.nome,
            categoria: c.categoria,
            canal: c.canal,
            stream: `/stream?canal=${c.canal}`
        }))
    });
});

// ================= STREAM =================
app.get('/stream', async (req, res) => {
    const canal = req.query.canal;

    if (!canal) {
        return res.status(400).send("Informe o canal");
    }

    // 🔥 CACHE
    if (cache[canal] && Date.now() - cache[canal].time < CACHE_TTL) {
        console.log("⚡ CACHE:", canal);
        return res.send(cache[canal].url);
    }

    let page;

    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
        );

        await page.setRequestInterception(true);

        let linkDetectado = null;

        page.on('request', (request) => {
            const url = request.url();

            if (
                url.includes('.m3u8') ||
                url.includes('.txt') ||
                url.includes('playlist')
            ) {
                linkDetectado = url;
            }

            request.continue();
        });

        await page.goto(`${URL_BASE}/${canal}`, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // ⏳ espera inteligente
        for (let i = 0; i < 20; i++) {
            if (linkDetectado) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (linkDetectado) {
            cache[canal] = {
                url: linkDetectado,
                time: Date.now()
            };

            console.log("🎯 CAPTURADO:", canal);
            return res.send(linkDetectado);
        }

        res.status(404).send("Stream não detectado");

    } catch (err) {
        console.error("❌ ERRO COMPLETO:", err);
        res.status(500).send("Erro interno");

    } finally {
        if (page) {
            try { await page.close(); } catch {}
        }
    }
});

// ================= HOME =================
app.get('/', (req, res) => {
    res.send("Servidor ONLINE 🚀");
});

// ================= PROTEÇÃO =================
process.on('unhandledRejection', err => {
    console.error('ERRO NÃO TRATADO:', err);
});

process.on('uncaughtException', err => {
    console.error('EXCEÇÃO:', err);
});

// ================= START =================
app.listen(PORT, () => {
    console.log(`🚀 Rodando na porta ${PORT}`);
});
