const express = require('express');
const https = require('https');

const app = express();

console.log("🔥 IPTV MASTER COM LOGO RODANDO");

// 🌐 BASE DAS PÁGINAS
const BASE = "https://www.cxtv.com.br/tv-ao-vivo/";

// 🖼️ BASE DOS LOGOS (RAW GITHUB)
const BASE_LOGO = "https://raw.githubusercontent.com/servidor-ozarch/tv/main/live/logotipo/";

// 📺 LISTA DE CANAIS
let canais = [
    { nome: "Aracati", slug: "tv-aracati-hd", url: null },
    { nome: "Filmes", slug: "tv-filmes-hd", url: null },
    { nome: "Séries", slug: "tv-series-hd", url: null },
    { nome: "Música", slug: "tv-musica-hd", url: null }
];

// 🔧 REQUISIÇÃO HTTP COM HEADER DE NAVEGADOR
function getHTML(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "text/html",
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

// 🔍 EXTRAI LINK M3U8
function extrairM3U8(html) {
    const match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);
    return match ? match[0] : null;
}

// 🔍 EXTRAI LINKS INTERNOS
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
async function buscarStream(url, nivel = 0) {
    if (nivel > 3) return null;

    try {
        const html = await getHTML(url);

        // tenta direto
        const m3u8 = extrairM3U8(html);
        if (m3u8) return m3u8;

        // tenta internos
        const links = extrairLinks(html);

        for (let link of links) {
            const resultado = await buscarStream(link, nivel + 1);
            if (resultado) return resultado;
        }

    } catch (e) {
        console.log("Erro:", e.message);
    }

    return null;
}

// 🔄 ATUALIZA CANAIS COM CACHE INTELIGENTE
async function atualizarCanais() {
    console.log("🔄 Atualizando canais...");

    for (let canal of canais) {
        const urlPagina = BASE + canal.slug;

        console.log("🔍 Buscando:", canal.nome);

        const novoLink = await buscarStream(urlPagina);

        if (novoLink) {
            if (novoLink !== canal.url) {
                console.log("✅ Atualizado:", canal.nome);
                canal.url = novoLink;
            } else {
                console.log("✔️ Mesmo link:", canal.nome);
            }
        } else {
            console.log("⚠️ Mantendo cache:", canal.nome);
        }
    }
}

// ⏱️ atualiza a cada 5 minutos
setInterval(atualizarCanais, 300000);

// 🚀 primeira execução
atualizarCanais();

// 📺 LISTA IPTV COM LOGO AUTOMÁTICO
app.get('/api/lista-top.m3u8', (req, res) => {
    let m3u = "#EXTM3U\n";

    canais.forEach(c => {
        if (c.url) {

            const logo = `${BASE_LOGO}${c.slug}.png`;

            m3u += `#EXTINF:-1 tvg-name="${c.slug}" tvg-logo="${logo}" group-title="Canais",${c.nome}\n${c.url}\n`;
        }
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');

    res.send(m3u);
});

// 📊 DEBUG
app.get('/api/canais', (req, res) => {
    res.json(canais);
});

// 🟢 STATUS
app.get('/', (req, res) => {
    res.send("IPTV sistema com logos ativo 🚀");
});

// 🚫 FALLBACK
app.use((req, res) => {
    res.status(404).send("Rota não encontrada ❌");
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});
