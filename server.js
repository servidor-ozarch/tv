const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

// Variável global para reutilizar o navegador e economizar RAM
let browserInstance = null;

async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process' // Essencial para rodar em instâncias pequenas
            ]
        });
    }
    return browserInstance;
}

app.get('/stream', async (req, res) => {
    const canal = req.query.canal;
    
    if (!canal) {
        return res.status(400).send("Informe o canal. Ex: /stream?canal=cinemax");
    }

    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        // Timeout curto para a página para não travar o servidor
        page.setDefaultNavigationTimeout(30000);

        let linkDetectado = null;

        // Interceptação de rede para capturar o .txt ou .m3u8
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('.txt') || url.includes('.m3u8') || url.includes('playlist.m3u8')) {
                linkDetectado = url;
            }
            request.continue();
        });

        const urlAlvo = `https://www4.embedtv.best/${canal}`;
        
        // Navega e aguarda um pouco o carregamento do player
        await page.goto(urlAlvo, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 4000)); 

        if (linkDetectado) {
            console.log(`[OZARCH] Capturado: ${canal} -> ${linkDetectado}`);
            res.send(linkDetectado);
        } else {
            res.status(404).send("Stream não detectado. Tente novamente.");
        }

    } catch (error) {
        console.error("Erro na captura:", error.message);
        res.status(500).send("Erro interno ao processar o stream.");
    } finally {
        if (page) {
            await page.close(); // Fecha apenas a aba, mantém o browser vivo
        }
    }
});

// Fecha o navegador se o processo do Node for encerrado
process.on('SIGINT', async () => {
    if (browserInstance) await browserInstance.close();
    process.exit();
});

app.listen(PORT, () => {
    console.log(`OZARCH ativo na porta ${PORT}`);
});
