const express = require('express');
const https = require('https');

const app = express();

let canal = {
    nome: "Aracati",
    url: null
};

// 🔧 função simples GET (sem axios)
function getHTML(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = "";

            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));

        }).on("error", reject);
    });
}

// 🔍 buscar .m3u8
function extrairM3U8(html) {
    const match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);
    return match ? match[0] : null;
}

// 🔍 extrair iframe
function extrairIframe(html) {
    const match = html.match(/<iframe[^>]+src="([^"]+)"/i);
    return match ? match[1] : null;
}

// 🔄 processo principal
async function buscarStream() {
    try {
        console.log("Buscando página principal...");

        const html = await getHTML("https://www.cxtv.com.br/tv-ao-vivo/tv-aracati-hd");

        // 1️⃣ tenta direto
        let link = extrairM3U8(html);

        if (link) {
            canal.url = link;
            console.log("Encontrado direto:", link);
            return;
        }

        // 2️⃣ tenta iframe
        const iframe = extrairIframe(html);

        if (iframe) {
            console.log("Buscando iframe:", iframe);

            const htmlIframe = await getHTML(iframe);

            link = extrairM3U8(htmlIframe);

            if (link) {
                canal.url = link;
                console.log("Encontrado no iframe:", link);
                return;
            }
        }

        console.log("Nenhum link encontrado");

    } catch (e) {
        console.log("Erro:", e.message);
    }
}

// 🔄 loop
setInterval(buscarStream, 10000);

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

// 🟢 status
app.get('/', (req, res) => {
    res.send("Servidor rodando 🚀");
});

app.listen(process.env.PORT || 3000);
