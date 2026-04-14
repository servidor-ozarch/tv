const axios = require('axios');

const BASE_URL = 'https://www4.embedtv.cv';

// 🔥 LISTA DE BLOCOS (EDITÁVEL)
const BLOCOS = [
    'sbtrj',
    'globo',
    'record'
];

// ==============================
// 🔎 PEGA TXT DA PÁGINA
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
// 📥 LÊ O CONTEÚDO DO TXT
// ==============================
async function lerTxt(urlTxt) {
    try {
        const { data } = await axios.get(urlTxt, {
            timeout: 10000
        });

        const links = data.match(/https?:\/\/[^\s"'<>]+/g) || [];

        return links;

    } catch (e) {
        console.log('Erro TXT:', urlTxt);
        return [];
    }
}

// ==============================
// 🎯 PROCESSA TODOS OS BLOCOS
// ==============================
async function processarBlocos() {

    let playlistFinal = [];

    for (let bloco of BLOCOS) {

        const url = `${BASE_URL}/${bloco}`;

        console.log('🔎 Processando:', url);

        const txtUrl = await pegarTxtDaPagina(url);

        if (!txtUrl) {
            console.log('❌ Sem TXT:', bloco);
            continue;
        }

        console.log('✅ TXT:', txtUrl);

        const links = await lerTxt(txtUrl);

        // 🔥 adiciona nome do bloco junto
        links.forEach(link => {
            playlistFinal.push({
                canal: bloco,
                url: link
            });
        });
    }

    return playlistFinal;
}

// ==============================
// 🎬 GERAR PLAYLIST (M3U)
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
// 🚀 EXECUTAR
// ==============================
async function iniciar() {

    const lista = await processarBlocos();

    const m3u = gerarM3U(lista);

    console.log('\n🎬 PLAYLIST GERADA:\n');
    console.log(m3u);

}

iniciar();
