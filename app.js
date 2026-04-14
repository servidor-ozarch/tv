const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://www4.embedtv.cv';

// 🔥 BLOCOS DINÂMICOS
const BLOCOS = [
    'sbtrj',
    'globo',
    'record'
];

// ==============================
// 🔎 PEGA APENAS O LINK .TXT
// ==============================
async function pegarTxtDaPagina(url) {
    try {
        const { data } = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const match = data.match(/https?:\/\/[^\s"'<>]+\.txt/gi);

        if (match) {
            return match[0];
        }

        return null;

    } catch (e) {
        console.log('Erro página:', url);
        return null;
    }
}

// ==============================
// 🎯 PROCESSA BLOCOS (SEM ABRIR TXT)
// ==============================
async function processarBlocos() {

    let lista = [];

    for (let bloco of BLOCOS) {

        const url = `${BASE_URL}/${bloco}`;

        console.log('🔎 Processando:', url);

        const txtUrl = await pegarTxtDaPagina(url);

        if (!txtUrl) {
            console.log('❌ Sem TXT:', bloco);
            continue;
        }

        console.log('✅ TXT encontrado:', txtUrl);

        // 🔥 adiciona direto o .txt
        lista.push({
            canal: bloco,
            url: txtUrl
        });
    }

    return lista;
}

// ==============================
// 🎬 GERAR PLAYLIST (USANDO .TXT)
// ==============================
function gerarM3U(lista) {

    let m3u = '#EXTM3U\n';

    lista.forEach(item => {
        m3u += `#EXTINF:-1,${item.canal}\n`;
        m3u += `${item.url}\n`;
    });

    return m3u;
}

// ==============================
// 🌐 API
// ==============================
app.get('/playlist', async (req, res) => {

    const lista = await processarBlocos();

    const m3u = gerarM3U(lista);

    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.send(m3u);
});

// ==============================
// 🚀 START
// ==============================
app.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
});
