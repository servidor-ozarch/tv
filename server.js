const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const URL_BASE = "https://www4.embedtv.best";

// ================= CACHE =================
const cache = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos

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
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote'
            ]
        });

        console.log("Browser iniciado");
        return browserInstance;

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

// ================= GERAR LISTA DINÂMICA =================
function gerarLista() {
    return canais.map((c, index) => ({
        id: index + 1,
        nome: c.nome,
        canal: c.canal,
        categoria: c.categoria,
        logo: `https://logo.clearbit.com/${c.canal}.com`,
        stream: `/stream?canal=${c.canal}`
    }));
}

// ================= API CANAIS =================
app.get('/canais', (req, res) => {
    res.json({
        status: "online",
        total: canais.length,
        canais: gerarLista()
    });
});

// ================= API STREAM =================
app.get('/stream', async (req, res) => {
    const canal = req.query.canal;

    if (!canal) {
        return res.status(400).send("Informe o canal");
    }

    // 🔥 CACHE
    const cached = cache[canal];
    if (cached && (Date.now() - cached.time < CACHE_TTL)) {
        console.log("CACHE HIT:", canal);
        return res.send(cached.url);
    }

    let page;

    try {
        const browser = await getBrowser();
        page = await browser.newPage();

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
            timeout: 25000
        });

        // Espera inteligente
        for (let i = 0; i < 10; i++) {
            if (linkDetectado) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (linkDetectado) {
            // 🔥 SALVA NO CACHE
            cache[canal] = {
                url: linkDetectado,
                time: Date.now()
            };

            console.log("STREAM:", canal);
            return res.send(linkDetectado);
        }

        res.status(404).send("Stream não detectado");

    } catch (err) {
        console.error("Erro:", err.message);
        res.status(500).send("Erro interno");

    } finally {
        if (page) {
            try { await page.close(); } catch {}
        }
    }
});

// ================= STATUS =================
app.get('/', (req, res) => {
    res.send("Servidor ONLINE 🚀");
});

// ================= PROTEÇÕES =================
process.on('unhandledRejection', err => {
    console.error('Erro não tratado:', err);
});

process.on('uncaughtException', err => {
    console.error('Exceção:', err);
});

process.on('SIGINT', async () => {
    if (browserInstance) await browserInstance.close();
    process.exit();
});

// ================= START =================
app.listen(PORT, () => {
    console.log(`Rodando na porta ${PORT}`);
});
