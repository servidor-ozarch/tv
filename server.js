const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

let canal = {
    nome: "Aracati",
    url: null
};

// 🔍 função que busca o .m3u8
async function buscarStream() {
    try {
        console.log("Buscando stream...");

        const { data } = await axios.get('https://www.cxtv.com.br/tv-ao-vivo/tv-aracati-hd');

        // 🔎 regex simples pra pegar .m3u8
        const match = data.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);

        if (match && match[0]) {
            canal.url = match[0];
            console.log("Link encontrado:", canal.url);
        } else {
            console.log("Nenhum .m3u8 encontrado");
        }

    } catch (e) {
        console.log("Erro ao buscar:", e.message);
    }
}

// 🔄 roda a cada 10 segundos
setInterval(buscarStream, 10000);

// 📺 lista IPTV
app.get('/api/lista.m3u8', (req, res) => {
    let m3u = "#EXTM3U\n";

    if (canal.url) {
        m3u += `#EXTINF:-1,${canal.nome}\n${canal.url}\n`;
    } else {
        m3u += `#EXTINF:-1,${canal.nome}\n# aguardando stream\n`;
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');

    res.send(m3u);
});

// 🟢 status
app.get('/', (req, res) => {
    res.send("Servidor IPTV rodando 🚀");
});

app.listen(process.env.PORT || 3000);
