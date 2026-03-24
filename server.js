const express = require('express');
const https = require('https');

const app = express();

console.log("🔥 SERVER IPTV AVANÇADO RODANDO");

// 🌐 BASE FIXA
const BASE = "https://www.cxtv.com.br/tv-ao-vivo/";

// 🔧 GET com headers
function getHTML(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "pt-BR,pt;q=0.9",
                "Connection": "keep-alive"
            }
        };

        https.get(url, options, (res) => {
            let data = "";

            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));

        }).on("error", reject);
    });
}

// 🔍 extrai .m3u8
function extrairM3U8(html) {
    const match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);
    return match ? match[0] : null;
}

// 🔍 extrai links internos
function extrairLinks(html) {
    const links = [];
    const regex = /(https?:\/\/[^"' ]+)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        if (
            match[0].includes("embed") ||
            match[0].includes("player") ||
            match[0].includes(".php") ||
            match[0].includes(".html") ||
            match[0].includes(".js")
        ) {
            links.push(match[0]);
        }
    }

    return links;
}

// 🔄 busca profunda
async function buscarStreamProfundo(url, nivel = 0) {
    if (nivel > 3) return null;

    try {
        console.log(`🔍 Nível ${nivel} -> ${url}`);

        const html = await getHTML(url);

        // tenta direto
        const m3u8 = extrairM3U8(html);
        if (m3u8) {
            console.log("✅ M3U8 encontrado:", m3u8);
            return m3u8;
        }

        // tenta links internos
        const links = extrairLinks(html);

        for (let link of links) {
            const resultado = await buscarStreamProfundo(link, nivel + 1);
            if (resultado) return resultado;
        }

    } catch (e) {
        console.log("❌ Erro:", e.message);
    }

    return null;
}

// 🚀 ROTA DINÂMICA (NOVO CAMINHO)
app.get('/live/chucks.m3u8', async (req, res) => {

    const canal = req.query.canal;

    if (!canal) {
        return res.send("#EXTM3U\n# canal não informado");
    }

    const urlFinal = BASE + canal;

    console.log("🎯 Canal solicitado:", canal);

    const link = await buscarStreamProfundo(urlFinal);

    let m3u = "#EXTM3U\n";

    if (link) {
        m3u += `#EXTINF:-1,${canal}\n${link}\n`;
    } else {
        m3u += `#EXTINF:-1,${canal}\n# aguardando stream\n`;
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');

    res.send(m3u);
});

// 🧪 TESTE
app.get('/teste', (req, res) => {
    res.send("OK FUNCIONANDO");
});

// 🟢 STATUS
app.get('/', (req, res) => {
    res.send("API IPTV avançada 🚀");
});

// 🚫 FALLBACK
app.use((req, res) => {
    res.status(404).send("Rota não encontrada ❌");
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 Servidor rodando na porta " + PORT);
});
