const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const fs = require('fs');

// Configuração de Canais (Mapeamento Nome -> ID da URL)
const CANAIS = {
    "A&E": "ae", "AMC": "amc", "AXN": "axn", "Cinemax": "cinemax",
    "HBO": "hbo", "HBO 2": "hbo2", "HBO Family": "hbo_family", "HBO Mundi": "hbo_mundi",
    "HBO Pop": "hbo_pop", "HBO Plus": "hbo_plus", "HBO Xtreme": "hbo_xtreme",
    "Megapix": "megapix", "Sony Channel": "sony", "SPACE": "space",
    "Studio Universal": "studio_universal", "Telecine Action": "telecine_action",
    "Telecine Cult": "telecine_cult", "Telecine Fun": "telecine_fun",
    "Telecine Pipoca": "telecine_pipoca", "Telecine Premium": "telecine_premium",
    "Telecine Touch": "telecine_touch", "Universal TV": "universal",
    "Warner Channel": "warner", "Animal Planet": "animal_planet",
    "Discovery Channel": "discovery", "Discovery H&H": "discovery_home_health",
    "Discovery ID": "investigacao_discovery", "Discovery Science": "discovery_science",
    "Discovery Theater": "discovery_theater", "Discovery Turbo": "discovery_turbo",
    "Discovery World": "discovery_world", "History": "history", "History 2": "history2",
    "TCM": "tcm", "TNT": "tnt", "TNT Novelas": "tnt_novelas", "TNT Series": "tnt_series",
    "TLC": "tlc", "Comedy Central": "comedy_central", "GNT": "gnt", "HGTV": "hgtv",
    "Canal OFF": "off", "Food Network": "food_network", "MTV": "mtv",
    "Multishow": "multishow", "Cartoon Network": "cartoon_network",
    "Cartoonito": "cartoonito", "Discovery Kids": "discovery_kids", "Gloob": "gloob",
    "Adult Swim": "adult_swim", "Band Sports": "bandsports", "Combate": "combate",
    "UFC Fight Pass": "ufc_fight_pass", "Premiere": "premiere_clubes",
    "Premiere 2": "premiere_2", "Premiere 3": "premiere_3", "Premiere 4": "premiere_4",
    "Premiere 5": "premiere_5", "Premiere 6": "premiere_6", "Premiere 7": "premiere_7",
    "Premiere 8": "premiere_8", "ESPN": "espn", "ESPN 2": "espn2", "ESPN 3": "espn3",
    "ESPN 4": "espn4", "ESPN 5": "espn5", "ESPN 6": "espn6", "SPORTV": "sportv",
    "SPORTV 2": "sportv2", "SPORTV 3": "sportv3", "SPORTV 4": "sportv4",
    "Globo RJ": "globo_rj", "Globo News": "globonews", "SBT RJ": "sbt_rj",
    "Record RJ": "record_rj", "Band RJ": "band_rj", "Band News": "band_news",
    "CNN Brasil": "cnn_brasil", "TV Cultura": "tv_cultura"
};

const BASE_URL = "https://tvinside.com.br/programacao_tv/";
const diaAtual = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'][new Date().getDay()];

function formatXMLTVDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}00 -0300`;
}

async function fetchCanal(nomeAmigavel, idURL) {
    try {
        const resp = await fetch(`${BASE_URL}${idURL}/${diaAtual}`);
        const html = await resp.text();
        const dom = new JSDOM(html);
        const regs = Array.from(dom.window.document.querySelectorAll('.registro.programa_data'));

        return regs.map(el => ({
            start: formatXMLTVDate(el.getAttribute('dti')),
            stop: formatXMLTVDate(el.getAttribute('dtf')),
            titulo: el.querySelector('.titulo')?.textContent.trim() || 'Sem Título',
            desc: el.querySelector('.descricao_programa')?.textContent.trim() || '',
            cat: el.querySelector('.evento_box small')?.textContent.trim() || 'Variados'
        })).filter(x => x.start && x.titulo);
    } catch (e) {
        console.error(`Erro ao buscar ${nomeAmigavel}:`, e.message);
        return [];
    }
}

async function run() {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv generator-info-name="CustomEPG">\n`;

    // 1. Gerar cabeçalho de canais
    for (const nome in CANAIS) {
        xml += `  <channel id="${CANAIS[nome]}">\n    <display-name>${nome}</display-name>\n  </channel>\n`;
    }

    // 2. Buscar e gerar programas
    console.log("⏳ Iniciando extração de todos os canais...");
    for (const [nome, id] of Object.entries(CANAIS)) {
        console.log(`📡 Capturando: ${nome}...`);
        const programas = await fetchCanal(nome, id);
        
        programas.forEach(p => {
            xml += `  <programme start="${p.start}" stop="${p.stop}" channel="${id}">\n`;
            xml += `    <title lang="pt">${p.titulo}</title>\n`;
            xml += `    <desc lang="pt">${p.desc}</desc>\n`;
            xml += `    <category lang="pt">${p.cat}</category>\n`;
            xml += `  </programme>\n`;
        });
    }

    xml += `</tv>`;
    fs.writeFileSync('programacao.xml', xml);
    console.log("✅ Sucesso! Arquivo 'programacao.xml' gerado.");
}

run();
  
