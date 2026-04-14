const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://www4.embedtv.cv';

// 🔥 BLOCOS (adicione quantos quiser)
const BLOCOS = [
    'sbtrj',
    'globoes',
    'record'
];

// ==============================
// 🔎 PEGA O .TXT DA PÁGINA
// ==============================
async function pegarTxtDaPagina(url) {
    try {
        const { data } = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        console.log('\n🌐 HTML RECEBIDO:', url);

        const match = data.match(/https?:\/\/[^\s"'<>]+\.txt/gi);

        console.log('🔍 MATCH:', match);

        if (!match || match.length === 0) {
            console.log('❌ Nenhum .txt encontrado');
            return null;
        }

        const txt = match.find(u =>
            !u.includes('.js') &&
            !u.includes('.css')
        );

        console.log('✅ TXT FINAL:', txt);

        return txt || null;

    } catch (e) {
        console.log('❌ ERRO AO ACESSAR:', url);
        console.log('Motivo:', e.message);
        return null;
    }
}

// ==============================
// 🎯 PROCESSA TODOS OS BLOCOS
// ==============================
async function processarBlocos() {

    let lista = [];

    for (let bloco of BLOCOS) {

        const url = `${BASE_URL}/${bloco}`;

        console.log('\n🔎 Processando bloco:', bloco);

        const txtUrl = await pegarTxtDaPagina(url);

        if (!txtUrl) {
            console.log('⚠️ Pulando bloco:', bloco);
            continue;
        }

        lista.push({
            canal: bloco,
            url: txtUrl
        });
    }

    console.log('\n📦 TOTAL NA LISTA:', lista.length);

    return lista;
}

// ==============================
// 🎬 GERAR PLAYLIST M3U + LOGO
// ==============================
function gerarM3U(lista) {

    if (!lista || lista.length === 0) {
        return '#EXTM3U\n# Nenhum canal encontrado';
    }

    let m3u = '#EXTM3U\n';

    lista.forEach(item => {

        // 🔥 monta logo automático
        const logo = `https://raw.githubusercontent.com/servidor-ozarch/tv/refs/heads/main/live/logotipo/${item.canal}.png`;

        m3u += `#EXTINF:-1 tvg-logo="${logo}",${item.canal}\n`;
        m3u += `${item.url}\n`;
    });

    return m3u;
}

// ==============================
// 🌐 ENDPOINT PLAYLIST
// ==============================
app.get('/playlist', async (req, res) => {

    const lista = await processarBlocos();

    const m3u = gerarM3U(lista);

    // 🔥 HEADERS CORRETOS
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline');

    res.send(m3u);
});

// ==============================
// 🚀 START
// ==============================
app.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
});
