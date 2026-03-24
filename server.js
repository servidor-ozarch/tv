const express = require('express');
const https = require('https');

const app = express();

console.log("🔥 IPTV FLEX TXT MASTER RODANDO");

// 🌐 BASE
const BASE = "https://www3.embedtv.best/";

// 🖼️ LOGOS
const BASE_LOGO = "https://raw.githubusercontent.com/servidor-ozarch/tv/main/live/logotipo/";

// 📺 CANAIS
let canais = [
    { nome: "A&E", slug: "ae", url: null },
    { nome: "Cinemax", slug: "cinemax", url: null },
    { nome: "HBO", slug: "hbo", url: null },
    { nome: "Premiere", slug: "premiere", url: null }
];

// 🔧 REQUEST
function getHTML(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "*/*",
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

// 🔍 CAPTURA SOMENTE .TXT
function extrairStreamTXT(html) {
    const match = html.match(/https?:\/\/[^"' ]+\.txt[^"' ]*/i);
    return match ? match[0] : null;
}

// 🔍 LINKS INTERNOS
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

// ✅ VALIDAR SE É PLAYLIST REAL
async function validarTXT(url) {
    try {
        const data = await getHTML(url);

        if (data.includes("#EXTM3U")) {
            return true;
        }

    } catch (e) {
        console.log("Erro validarTXT:", e.message);
    }

    return false;
}

// 🔄 BUSCA PROFUNDA
async function buscarStream(url, nivel = 0) {
    if (nivel > 4) return null;

    try {
        const html = await getHTML(url);

        // tenta pegar .txt
        const stream = extrairStreamTXT(html);

        if (stream) {
            const valido = await validarTXT(stream);
            if (valido) {
                console.log("🎯 TXT válido encontrado:", stream);
                return stream;
            }
        }

        // tenta internos
        const links = extrairLinks(html);

        for (let link of links) {
            const resultado = await buscarStream(link, nivel + 1);
            if (resultado) return resultado;
        }

    } catch (e) {
        console.log("Erro buscarStream:", e.message);
    }

    return null;
}

// 🔄 ATUALIZA CANAIS (CACHE INTELIGENTE)
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

// ⏱️ 5 MINUTOS
setInterval(atualizarCanais, 300000);

// 🚀 PRIMEIRA EXECUÇÃO
atualizarCanais();

// 📺 LISTA IPTV
app.get('/api/lista-top.m3u8', (req, res) => {
    let m3u = "#EXTM3U\n";

    canais.forEach(c => {
        const logo = `${BASE_LOGO}${c.slug}.png`;

        if (c.url) {
            m3u += `#EXTINF:-1 tvg-name="${c.slug}" tvg-logo="${logo}" group-title="Canais",${c.nome}\n${c.url}\n`;
        } else {
            m3u += `#EXTINF:-1 tvg-name="${c.slug}" tvg-logo="${logo}" group-title="Canais",${c.nome}\n# aguardando stream\n`;
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
    res.send("IPTV TXT ativo 🚀");
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
