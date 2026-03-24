const express = require('express');
const https = require('https');

const app = express();

let canal = {
    nome: "Aracati",
    url: null
};

// 🔧 GET simples
function getHTML(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        }).on("error", reject);
    });
}

// 🔍 extrai m3u8
function extrairM3U8(html) {
    const match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);
    return match ? match[0] : null;
}

// 🔍 extrai todos os possíveis embeds
function extrairLinks(html) {
    const links = [];
    const regex = /(https?:\/\/[^"' ]+)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        if (
            match[0].includes("embed") ||
            match[0].includes("player") ||
            match[0].includes(".php") ||
            match[0].includes(".html")
        ) {
            links.push(match[0]);
        }
    }

    return links;
}

// 🔄 busca profunda
async function buscarStreamProfundo(url, nivel = 0) {
    if (nivel > 3) return null; // limite

    try {
        const html = await getHTML(url);

        // tenta direto
        const m3u8 = extrairM3U8(html);
        if (m3u8) return m3u8;

        // tenta links internos
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

// 🔄 loop contínuo
async function atualizar() {
    console.log("🔍 Procurando stream...");

    const link = await buscarStreamProfundo("https://www.cxtv.com.br/tv-ao-vivo/tv-aracati-hd");

    if (link) {
        canal.url = link;
        console.log("✅ Encontrado:", link);
    } else {
        console.log("❌ Não encontrado");
    }
}

setInterval(atualizar, 15000);

// 📺 lista IPTV
app.get('/api/lista-top.m3u8', (req, res) => {
    let m3u = "#EXTM3U\n";

    if (canal.url) {
        m3u += `#EXTINF:-1,${canal.nome}\n${canal.url}\n`;
    } else {
        m3u += `#EXTINF:-1,${canal.nome}\n# aguardando stream\n`;
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u);
});

app.listen(process.env.PORT || 3000);
