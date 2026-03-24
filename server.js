const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

console.log("🔥 IPTV FLEX PLAYER");

// 🌐 BASE FIXA
const BASE = "https://www3.embedtv.best/";

// 🚀 CAPTURA DINÂMICA
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

        // 🎯 CAPTURA .TXT
        page.on('response', async (response) => {
            const resUrl = response.url();

            if (resUrl.includes('.txt')) {
                console.log("🎯 TXT:", resUrl);
                streamEncontrado = resUrl;
            }
        });

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // ❌ REMOVE BOTÃO FAKE
        await page.evaluate(() => {
            const btn = document.querySelector('.startplayer');
            if (btn) btn.remove();
        });

        // ⏳ espera carregar
        await new Promise(r => setTimeout(r, 4000));

        // 🔍 IFRAMES
        const frames = page.frames();

        for (let frame of frames) {
            try {
                const frameUrl = frame.url();

                if (
                    frameUrl.includes("embed") ||
                    frameUrl.includes("player") ||
                    frameUrl.includes("video")
                ) {
                    console.log("🎥 Iframe:", frameUrl);

                    await frame.evaluate(() => {
                        const video = document.querySelector('video');
                        if (video) {
                            video.muted = true;
                            video.play().catch(() => {});
                        }

                        const btnPlay = document.querySelector('.vjs-big-play-button');
                        if (btnPlay) btnPlay.click();
                    });
                }

            } catch (e) {}
        }

        // ⏳ aguarda stream
        await new Promise(r => setTimeout(r, 8000));

        await browser.close();

        return streamEncontrado;

    } catch (e) {
        console.log("Erro:", e.message);

        if (browser) await browser.close();

        return null;
    }
}

// 🚀 ROTA FLEXÍVEL
app.get('/lista-top.txt', async (req, res) => {

    const canal = req.query.canal;

    if (!canal) {
        return res.send("Informe o canal: ?canal=nome");
    }

    console.log("🎯 Canal solicitado:", canal);

    const stream = await capturarStream(canal);

    if (stream) {
        console.log("🚀 Redirecionando...");

        return res.redirect(stream);
    }

    res.send("Stream não encontrado ❌");
});

// 🟢 STATUS
app.get('/', (req, res) => {
    res.send("IPTV FLEX ativo 🚀");
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});
