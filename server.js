const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

let browserInstance = null;
let isLaunching = false;

async function getBrowser() {
    if (browserInstance) return browserInstance;

    if (isLaunching) {
        // Espera enquanto o browser está iniciando
        while (!browserInstance) {
            await new Promise(r => setTimeout(r, 500));
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

        console.log("Browser iniciado com sucesso");
        return browserInstance;

    } catch (err) {
        console.error("Erro ao iniciar browser:", err);
        browserInstance = null;
        throw err;
    } finally {
        isLaunching = false;
    }
}

app.get('/stream', async (req, res) => {
    const canal = req.query.canal;

    if (!canal) {
        return res.status(400).send("Informe o canal.");
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

        await page.goto(`https://www4.embedtv.best/${canal}`, {
            waitUntil: 'domcontentloaded',
            timeout: 25000
        });

        // Espera inteligente (menos travamento)
        for (let i = 0; i < 10; i++) {
            if (linkDetectado) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (linkDetectado) {
            res.send(linkDetectado);
        } else {
            res.status(404).send("Stream não detectado.");
        }

    } catch (err) {
        console.error("Erro:", err.message);
        res.status(500).send("Erro interno.");

    } finally {
        if (page) {
            try {
                await page.close();
            } catch {}
        }
    }
});

// Proteção extra contra crash
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

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
