const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://www4.embedtv.cv';

// ==============================
// 📺 CANAIS
// ==============================
const CANAIS = [
    { id: 'ae', nome: 'A&E' },
    { id: 'amc', nome: 'AMC' },
    { id: 'axn', nome: 'AXN' },
    { id: 'cinemax', nome: 'Cinemax' },
    { id: 'hbo', nome: 'HBO' },
    { id: 'hbo2', nome: 'HBO 2' },
    { id: 'hbofamily', nome: 'HBO Family' },
    { id: 'hbomundi', nome: 'HBO Mundi' },
    { id: 'hbopop', nome: 'HBO Pop' },
    { id: 'hboplus', nome: 'HBO Plus' },
    { id: 'hboxtreme', nome: 'HBO Xtreme' },
    { id: 'megapix', nome: 'Megapix' },
    { id: 'sonychannel', nome: 'Sony Channel' },
    { id: 'space', nome: 'SPACE' },
    { id: 'studiouniversal', nome: 'Studio Universal' },
    { id: 'telecineaction', nome: 'Telecine Action' },
    { id: 'telecinecult', nome: 'Telecine Cult' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' },
    { id: '000', 000: '000' }
];

// ==============================
// 🖼️ LOGOS
// ==============================
const LOGOS = {
    ae: 'ae.png',
    amc: 'amc.png',
    axn: 'axn.png',
    cinemax: 'cinemax.png',
    hbo: 'hbo.png',
    hbo2: 'hbo2.png',
    hbofamily: 'hbofamily.png',
    hbomundi: 'hbomundi.png',
    hbopop: 'hbopop.png',
    hboplus: 'hboplus.png',
    hboxtreme: 'hboxtreme.png',
    megapix: 'megapix.png',
    sonychannel: 'sonychannel.png',
    space: 'space.png',
    studiouniversal: 'studiouniversal.png',
    telecineaction: 'telecineaction.png',
    telecinecult: 'telecinecult.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
    000: '000.png',
};

// ==============================
// 🧠 CACHE GLOBAL
// ==============================
let cacheM3U = null;
let ultimaAtualizacao = 0;
const CACHE_TEMPO = 5 * 60 * 1000; // 5 minutos

// ==============================
// 🔎 PEGA TXT
// ==============================
async function pegarTxtDaPagina(url) {
    try {
        const { data } = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const match = data.match(/https?:\/\/[^\s"'<>]+\.txt/gi);

        if (!match) return null;

        return match.find(u => !u.includes('.js') && !u.includes('.css')) || null;

    } catch {
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

        const txtUrl = await pegarTxtDaPagina(url);

        if (!txtUrl) continue;

        lista.push({
            id: canal.id,
            nome: canal.nome,
            url: txtUrl
        });
    }

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
// ♻️ ATUALIZA CACHE
// ==============================
async function atualizarCache() {
    console.log('🔄 Atualizando cache...');

    const lista = await processarCanais();
    cacheM3U = gerarM3U(lista);
    ultimaAtualizacao = Date.now();

    console.log('✅ Cache atualizado');
}

// ==============================
// 🌐 ENDPOINT
// ==============================
app.get('/playlist', async (req, res) => {

    // se não tem cache ainda → gera
    if (!cacheM3U) {
        await atualizarCache();
    }

    // se cache expirou → atualiza em background
    if (Date.now() - ultimaAtualizacao > CACHE_TEMPO) {
        atualizarCache(); // NÃO espera (não trava request)
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline');

    res.send(cacheM3U);
});

// ==============================
// 🔄 AUTO PING (5 MIN)
// ==============================
const URL = 'https://tv-5p23.onrender.com/playlist';

function ping() {
    axios.get(URL)
        .then(() => console.log('♻️ Ping OK'))
        .catch(() => console.log('⚠️ Falha no ping'));
}

// ==============================
// 🚀 START
// ==============================
app.listen(PORT, async () => {
    console.log('🚀 Servidor rodando na porta', PORT);

    // 🔥 gera cache inicial ao subir
    await atualizarCache();

    // 🔁 inicia ping
    ping();
    setInterval(ping, 300000);
});
