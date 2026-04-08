const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/stream', async (req, res) => {
    const canal = req.query.canal; // Ex: /stream?canal=cinemax
    
    if (!canal) {
        return res.status(400).send("Informe o canal. Ex: ?canal=cinemax");
    }

    let browser;
    try {
        // Configuração vital para rodar em servidores (como Render/Heroku)
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        let linkDetectado = null;

        // Escuta as requisições de rede
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            // Lógica de detecção similar ao seu código Java/Sketchware
            if (url.includes('.txt') || url.includes('.m3u8') || url.includes('stream')) {
                linkDetectado = url;
            }
            request.continue();
        });

        const urlAlvo = `https://www4.embedtv.best/${canal}`;
        await page.goto(urlAlvo, { waitUntil: 'networkidle2', timeout: 30000 });

        // Espera opcional para garantir o carregamento do iframe
        await new Promise(r => setTimeout(r, 5000));

        if (linkDetectado) {
            // Retorna o link em formato texto plano para facilitar pro seu app
            res.send(linkDetectado);
        } else {
            res.status(404).send("Link não encontrado no momento.");
        }

    } catch (error) {
        res.status(500).send("Erro no servidor: " + error.message);
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`OZARCH rodando na porta ${PORT}`);
});
