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
    { id: 'telecinefun', nome: 'Telecine Fun' },
    { id: 'telecinepipoca', nome: 'Telecine Pipoca' },
    { id: 'telecinepremium', nome: 'Telecine Premium' },
    { id: 'telecinetouch', nome: 'Telecine Touch' },
    { id: 'universaltv', nome: 'Universal TV' },
    { id: 'warnerchannel', nome: 'Warner Channel' },
    { id: 'animalplanet', nome: 'Animal Planet' },
    { id: 'discoverychannel', nome: 'Discovery Channel' },
    { id: 'discoveryhh', nome: 'Discovery H&H' },
    { id: 'discoveryid', nome: 'Discovery ID' },
    { id: 'discoveryscience', nome: 'Discovery Science' },
    { id: 'discoverytheater', nome: 'Discovery Theater' },
    { id: 'discoveryturbo', nome: 'Discovery Turbo' },
    { id: 'discoveryworld', nome: 'Discovery World' },
    { id: 'fishtv', nome: 'Fish TV' },
    { id: 'history', nome: 'History' },
    { id: 'history2', nome: 'History 2' },
    { id: 'tcm', nome: 'TCM' },
    { id: 'tnt', nome: 'TNT' },
    { id: 'tntnovelas', nome: 'TNT Novelas' },
    { id: 'tntseries', nome: 'TNT Series' },
    { id: 'tlc', nome: 'TLC' },
    { id: 'comedycentral', nome: 'Comedy Central' },
    { id: 'gnt', nome: 'GNT' },
    { id: 'hgtv', nome: 'HGTV' },
    { id: 'off', nome: 'Canal OFF' },
    { id: 'foodnetwork', nome: 'Food Network' },
    { id: 'mtv', nome: 'MTV' },
    { id: 'cheftv', nome: 'Master chef' },
    { id: 'multishow', nome: 'Multishow' },
    { id: 'cartoonnetwork', nome: 'Cartoon Network' },
    { id: 'cartoonito', nome: 'Cartoonito' },
    { id: 'discoverykids', nome: 'Discovery Kids' },
    { id: 'gloob', nome: 'Gloob' },
    { id: 'adultswim', nome: 'Adult Swim' },
    { id: 'bandsports', nome: 'Band Sports' },
    { id: 'combate', nome: 'Combate' },
    { id: 'ufcfightpass', nome: 'UFC Fight Pass' },
    { id: 'premiere', nome: 'Premiere' },
    { id: 'premiere2', nome: 'Premiere 2' },
    { id: 'premiere3', nome: 'Premiere 3' },
    { id: 'premiere4', nome: 'Premiere 4' },
    { id: 'premiere5', nome: 'Premiere 5' },
    { id: 'premiere6', nome: 'Premiere 6' },
    { id: 'premiere7', nome: 'Premiere 7' },
    { id: 'premiere8', nome: 'Premiere 8' },
    { id: 'espn', nome: 'ESPN' },
    { id: 'espn2', nome: 'ESPN 2' },
    { id: 'espn3', nome: 'ESPN 3' },
    { id: 'espn4', nome: 'ESPN 4' },
    { id: 'espn5', nome: 'ESPN 5' },
    { id: 'espn6', nome: 'ESPN 6' },
    { id: 'sportv', nome: 'SPORTV' },
    { id: 'sportv2', nome: 'SPORTV 2' },
    { id: 'sportv3', nome: 'SPORTV 3' },
    { id: 'sportv4', nome: 'SPORTV 4' },
    { id: 'globorj', nome: 'Globo RJ' },
    { id: 'globonews', nome: 'Globo News' },
    { id: 'sbtrj', nome: 'SBT RJ' },
    { id: 'recordrj', nome: 'Record RJ' },
    { id: 'bandrj', nome: 'Band RJ' },
    { id: 'bandnews', nome: 'Band News' },
    { id: 'cnnbrasil', nome: 'CNN Brasil' },
    { id: 'cultura', nome: 'TV Cultura' },
    { id: 'aparecida', nome: 'Aparecida' },
    { id: 'cancaonova', nome: 'Canção Nova' }
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
    telecinefun: 'telecinefun.png',
    telecinepipoca: 'telecinepipoca.png',
    telecinepremium: 'telecinepremium.png',
    telecinetouch: 'telecinetouch.png',
    universaltv: 'universaltv.png',
    warnerchannel: 'warnerchannel.png',
    animalplanet: 'animalplanet.png',
    discoverychannel: 'discoverychannel.png',
    discoveryhh: 'discoveryhh.png',
    discoveryid: 'discoverychannel.png',
    discoveryscience: 'discoveryscience.png',
    discoverytheater: 'discoverytheater.png',
    discoveryturbo: 'discoveryturbo.png',
    discoveryworld: 'discoveryworld.png',
    fishtv: 'fishtv.png',
    history: 'history.png',
    history2: 'history2.png',
    tcm: 'tcm.png',
    tnt: 'tnt.png',
    tntnovelas: 'tntnovelas.png',
    tntseries: 'tntseries.png',
    tlc: 'tlc.png',
    comedycentral: 'comedycentral.png',
    gnt: 'gnt.png',
    hgtv: 'hgtv.png',
    off: 'off.png',
    foodnetwork: 'foodnetwork.png',
    mtv: 'mtv.png',
    cheftv: 'cheftv.png',
    multishow: 'multishow.png',
    cartoonnetwork: 'cartoonnetwork.png',
    cartoonito: 'cartoonito.png',
    discoverykids: 'discoverykids.png',
    gloob: 'gloob.png',
    adultswim: 'adultswim.png',
    bandsports: 'bandsports.png',
    combate: 'combate.png',
    ufcfightpass: 'ufcfightpass.png',
    premiere: 'premiere.png',
    premiere2: 'premiere.png',
    premiere3: 'premiere.png',
    premiere3: 'premiere.png',
    premiere4: 'premiere.png',
    premiere5: 'premiere.png',
    premiere6: 'premiere.png',
    premiere7: 'premiere.png',
    premiere8: 'premiere.png',
    espn: 'espn.png',
    espn2: 'espn.png',
    espn3: 'espn.png',
    espn4: 'espn.png',
    espn5: 'espn.png',
    espn6: 'espn.png',
    sportv: 'sportv.png',
    sportv2: 'sportv.png',
    sportv3: 'sportv.png',
    sportv4: 'sportv.png',
    globorj: 'globo.png',
    globonews: 'globonews.png',
    sbtrj: 'sbt.png',
    recordrj: 'record.png',
    bandrj: 'band.png',
    bandnews: 'bandnews.png',
    cnnbrasil: 'cnnbrasil.png',
    cultura: 'cultura.png',
    aparecida: 'aparecida.png',
    cancaonova: 'cancaonova.png',
};

// ==============================
// 🧠 CACHE GLOBAL
// ==============================
let cacheM3U = null;
let ultimaAtualizacao = 0;
const CACHE_TEMPO = 1 * 60 * 1000; // 1 minutos

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
// 🔄 AUTO PING (1 MIN)
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
    setInterval(ping, 60000);
});
