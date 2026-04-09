const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

app.get('/stream', async (req, res) => {
    const canal = req.query.canal;

    let browser;
    let page;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox']
        });

        page = await browser.newPage();

        let link = null;

        await page.setRequestInterception(true);

        page.on('request', request => {
            const url = request.url();

            if (url.includes('.txt')) {
                link = url;
            }

            request.continue();
        });

        await page.goto(`https://www4.embedtv.best/${canal}`, {
            waitUntil: 'networkidle2'
        });

        await new Promise(r => setTimeout(r, 5000));

        if (link) {
            return res.send(link);
        }

        res.status(404).send("Não encontrado");

    } catch (err) {
        res.status(500).send("Erro");

    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
});

app.listen(3001);
