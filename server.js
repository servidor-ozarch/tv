const express = require('express');
const https = require('https');

const app = express();

console.log("🔥 SERVER REDIRECT IPTV");

// 🌐 BASE
const BASE = "https://www.cxtv.com.br/tv-ao-vivo/";

// 🔧 GET HTML
function getHTML(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "text/html",
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

// 🔍 EXTRAI M3U8
function extrairM3U8(html) {
    const match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);
    return match ? match[0] : null;
}

// 🔍 EXTRAI LINKS
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

// 🔄 BUSCA PROFUNDA
async function buscarStreamProfundo(url, nivel = 0) {
    if (nivel > 3) return null;

    try {
        console.log(`🔍 Nível ${nivel}: ${url}`);

        const html = await getHTML(url);

        const m3u8 = extrairM3U8(html);
        if (m3u8) {
            console.log("✅ Encontrado:", m3u8);
            return m3u8;
        }

        const links = extrairLinks(html);

        for (let link of links) {
            const resultado = await buscarStreamProfundo(link, nivel + 1);
            if (resultado) return resultado;
        }

    } catch (e) {
        console.log("Erro:", e.message);
    }

    return null;
}

// 🚀 ROTA REDIRECT
app.get('/live/chucks.m3u8', async (req, res) => {

    const canal = req.query.canal;

    if (!canal) {
        return res.status(400).send("Canal não informado");
    }

    const url = BASE + canal;

    console.log("🎯 Canal:", canal);

    const stream = await buscarStreamProfundo(url);

    if (stream) {
        console.log("🚀 Redirecionando para:", stream);
        return res.redirect(stream);
    }

    res.status(404).send("Stream não encontrado ❌");
});

// 🟢 STATUS
app.get('/', (req, res) => {
    res.send("Server IPTV redirect 🚀");
});

// 🚫 FALLBACK
app.use((req, res) => {
    res.status(404).send("Rota não encontrada ❌");
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Rodando na porta " + PORT);
});
