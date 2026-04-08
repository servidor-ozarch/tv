const puppeteer = require('puppeteer');

async function extrairLinkStream(canal) {
    const urlAlvo = `https://www4.embedtv.best/${canal}`;
    
    // Lançar navegador em modo "headless" (escondido)
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Configurar User-Agent para parecer um navegador real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');

    let linkDetectado = null;

    // INTERCEPTAÇÃO DE REDE (Igual ao seu shouldInterceptRequest)
    await page.setRequestInterception(true);

    page.on('request', request => {
        const url = request.url();
        
        // Filtro lógico baseado no seu código Java
        if (
            url.includes('.m3u8') || 
            url.includes('.txt') || 
            url.includes('chunklist') ||
            url.includes('manifest')
        ) {
            linkDetectado = url;
            console.log(`[SUCESSO] Link capturado: ${linkDetectado}`);
        }
        
        request.continue();
    });

    try {
        // Navega até o site do canal
        await page.goto(urlAlvo, { waitUntil: 'networkidle2', timeout: 30000 });

        // Aguarda um pouco para o JavaScript interno do iframe rodar
        await new Promise(r => setTimeout(r, 5000)); 

    } catch (e) {
        console.error("Erro na navegação:", e.message);
    } finally {
        await browser.close();
    }

    return linkDetectado;
}

// Exemplo de uso para gerar a saída M3U8
async function gerarLista(canalNome) {
    const streamUrl = await extrairLinkStream(canalNome);
    
    if (streamUrl) {
        const m3u8Dinamico = `#EXTM3U\n#EXTINF:-1,${canalNome}\n${streamUrl}`;
        console.log("\n--- SUA LISTA DINÂMICA ---");
        console.log(m3u8Dinamico);
    } else {
        console.log("Não foi possível capturar o stream.");
    }
}

gerarLista('cinemax');
