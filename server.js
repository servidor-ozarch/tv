const express = require('express');
const https = require('https');

const app = express();

const BASE_URL = "https://www.cxtv.com.br/tv-ao-vivo/";

// 🔧 GET com headers de navegador (Essencial para não ser bloqueado)
function getHTML(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8",
                "Accept-Language": "pt-BR,pt;q=0.9",
                "Referer": "https://www.cxtv.com.br/",
                "Connection": "keep-alive"
            },
            timeout: 5000 // Evita que uma requisição trave o servidor
        };

        https.get(url, options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        }).on("error", reject);
    });
}

// 🔍 Extrai .m3u8 (Melhorado para links escapados)
function extrairM3U8(html) {
    const regex = /https?[:\/\\]+[^"' ]+\.m3u8[^"' ]*/gi;
    const match = html.match(regex);
    if (match) {
        return match[0].replace(/\\/g, ''); // Limpa barras invertidas de JSON
    }
    return null;
}

// 🔍 Extrai links relevantes (Filtro mais limpo)
function extrairLinks(html) {
    const links = new Set(); // Set evita links duplicados
    const regex = /(https?:\/\/[^"' ]+)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        const url = match[0];
        if (
            url.includes("embed") || 
            url.includes("player") || 
            url.includes(".php") || 
            url.includes("clictv") // CXTV usa muito esse domínio interno
        ) {
            links.add(url);
        }
    }
    return Array.from(links);
}

// 🔄 Busca profunda dinâmica
async function buscarStreamProfundo(url, nivel = 0) {
    if (nivel > 2) return null; // Reduzi para 2 níveis para ser mais rápido na rota

    try {
        console.log(`[Nível ${nivel}] Investigando: ${url}`);
        const html = await getHTML(url);

        const m3u8 = extrairM3U8(html);
        if (m3u8) return m3u8;

        const links = extrairLinks(html);
        for (let link of links) {
            const resultado = await buscarStreamProfundo(link, nivel + 1);
            if (resultado) return resultado;
        }
    } catch (e) {
        console.error(`Erro no nível ${nivel}: ${e.message}`);
    }
    return null;
}

// 🚀 ROTA DINÂMICA
app.get('/live/chucks.m3u8', async (req, res) => {
    const idCanal = req.query.canal;

    if (!idCanal) {
        return res.status(400).send("Informe o parâmetro ?canal=");
    }

    console.log(`🎯 Buscando stream para: ${idCanal}`);
    
    const urlAlvo = BASE_URL + idCanal;
    const linkFinal = await buscarStreamProfundo(urlAlvo);

    if (linkFinal) {
        console.log("✅ Sucesso! Redirecionando...");
        // Redireciona o player diretamente para o link bruto
        return res.redirect(302, linkFinal);
    }

    res.status(404).send("Não foi possível extrair o link m3u8 deste canal. ❌");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Servidor dinâmico na porta ${PORT}`));
