const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://www4.embedtv.cv';

// ==============================
// 📺 CANAIS (ID + NOME BONITO)
// ==============================
const CANAIS = [
    { id: 'sbtrj', nome: 'SBT RJ' },
    { id: 'globoes', nome: 'Globo' },
    { id: 'record', nome: 'Record TV' }
    { id: 'cinemax', nome: 'Cinemax' }
];

// ==============================
// 🖼️ LOGOS (SEPARADO)
// ==============================
const LOGOS = {
    sbtrj: 'sbt.png',
    globo: 'globo.png',
    record: 'record.png',
    cinemax: 'cinemax.png'
};

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

        console.log('\n🌐 HTML:', url);

        const match = data.match(/https?:\/\/[^\s"'<>]+\.txt/gi);

        if (!match || match.length === 0) {
            console.log('❌ Sem .txt');
            return null;
        }

        const txt = match.find(u =>
            !u.includes('.js') &&
            !u.includes('.css')
        );

        console.log('✅ TXT:', txt);

        return txt || null;

    } catch (e) {
        console.log('❌ ERRO:', url);
        console.log(e.message);
        return null;
    }
}

// ==============================
// 🎯 PROCESSA CANAIS
// ==============================
async function processarCanais() {

    let lista = [];

    for (let canal of CANAIS) {

        const url = `${BASE_URL}/${canal.id}`;

        console.log('\n🔎 Processando:', canal.nome);

        const txtUrl = await pegarTxtDaPagina(url);

        if (!txtUrl) {
            console.log('⚠️ Pulando:', canal.nome);
            continue;
        }

        lista.push({
            id: canal.id,
            nome: canal.nome,
            url: txtUrl
        });
    }

    console.log('\n📦 TOTAL:', lista.length);

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

        const logoFile = LOGOS[item.id] || `${item.id}.png`;

        const logo = `https://raw.githubusercontent.com/servidor-ozarch/tv/refs/heads/main/live/logotipo/${logoFile}`;

        m3u += `#EXTINF:-1 tvg-logo="${logo}",${item.nome}\n`;
        m3u += `${item.url}\n`;
    });

    return m3u;
}

// ==============================
// 🌐 ENDPOINT
// ==============================
app.get('/playlist', async (req, res) => {

    const lista = await processarCanais();

    const m3u = gerarM3U(lista);

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
