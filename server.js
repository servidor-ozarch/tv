const express = require('express');
const https = require('https');

const app = express();

console.log("🔥 IPTV FLEX MASTER COM LOGO RODANDO");

// 🌐 Base das páginas
const BASE = "https://www3.embedtv.best/";

// 🖼️ Base dos logos (GitHub RAW)
const BASE_LOGO = "https://raw.githubusercontent.com/servidor-ozarch/tv/main/live/logotipo/";

// 📺 Lista de canais (adicione novos canais facilmente)
let canais = [
    { nome: "A&E", slug: "ae", url: null },
    { nome: "Cinemax", slug: "cinemax", url: null },
    { nome: "HBO", slug: "hbo", url: null },
    { nome: "Premiere", slug: "premiere", url: null }
];

// 🔧 Requisição HTTP com header de navegador
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

// 🔍 Extrai link .m3u8 ou .txt
function extrairStream(html) {
    const match = html.match(/https?:\/\/[^"' ]+\.(m3u8|txt)[^"' ]*/);
    return match ? match[0] : null;
}

// 🔍 Extrai links internos para busca recursiva
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

// 🔄 Busca recursiva de stream (até profundidade 4)
async function buscarStream(url, nivel = 0) {
    if (nivel > 4) return null;
    try {
        const html = await getHTML(url);

        // tenta direto
        const stream = extrairStream(html);
        if (stream) return stream;

        // tenta links internos
        const links = extrairLinks(html);
        for (let link of links) {
            const resultado = await buscarStream(link, nivel + 1);
            if (resultado) return resultado;
        }

    } catch (e) {
        console.log("Erro ao buscar stream:", e.message);
    }
    return null;
}

// 🔄 Atualiza canais com cache inteligente
async function atualizarCanais() {
    console.log("🔄 Atualizando canais...");
    for (let canal of canais) {
        const urlPagina = BASE + canal.slug;
        console.log("🔍 Buscando:", canal.nome);

        const novoLink = await buscarStream(urlPagina);

        if (novoLink) {
            if (novoLink !== canal.url) {
                console.log("✅ Atualizado:", canal.nome, "->", novoLink);
                canal.url = novoLink;
            } else {
                console.log("✔️ Mesmo link:", canal.nome);
            }
        } else {
            console.log("⚠️ Mantendo cache:", canal.nome);
        }
    }
}

// ⏱️ Atualiza a cada 5 minutos
setInterval(atualizarCanais, 300000);

// 🚀 Primeira execução
atualizarCanais();

// 📺 Lista IPTV dinâmica com logo
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

// 📊 Debug: ver canais e links atuais
app.get('/api/canais', (req, res) => {
    res.json(canais);
});

// 🟢 Status do servidor
app.get('/', (req, res) => {
    res.send("IPTV FLEX MASTER ativo 🚀");
});

// 🚫 Fallback para rotas inválidas
app.use((req, res) => {
    res.status(404).send("Rota não encontrada ❌");
});

// 🚀 Start do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});
