const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://www4.embedtv.cv';

const BLOCOS = [
    'sbtrj',
    'globo',
    'record'
];

// ==============================
// 🔎 PEGAR TXT COM VALIDAÇÃO
// ==============================
async function pegarTxtDaPagina(url) {
    try {
        const { data } = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const matches = data.match(/https?:\/\/[^\s"'<>]+\.txt/gi);

        if (!matches || matches.length === 0) {
            console.log('❌ Nenhum .txt encontrado em:', url);
            return null;
        }

        // 🔥 pega o primeiro válido
        const txt = matches.find(u =>
            !u.includes('.js') &&
            !u.includes('.css')
        );

        console.log('✅ TXT encontrado:', txt);

        return txt || null;

    } catch (e) {
        console.log('❌ Erro ao acessar:', url);
        return null;
    }
}

// ==============================
// 🎯 PROCESSAR BLOCOS
// ==============================
async function processarBlocos() {

    let lista = [];

    for (let bloco of BLOCOS) {

        const url = `${BASE_URL}/${bloco}`;

        console.log('\n🔎 Processando:', bloco);

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
// 🎬 GERAR M3U
// ==============================
function gerarM3U(lista) {

    if (!lista || lista.length === 0) {
        return '#EXTM3U\n# Nenhum canal encontrado';
    }

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
