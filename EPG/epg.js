const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://mi.tv/br/canais/";

// ========================
// CACHE EM MEMÓRIA
// ========================
let xmlCache = null;
let gerando = false;

// ========================
// CANAIS
// ========================
const canais = [
    { id: 'cinemax', nome: 'Cinemax' },
    { id: 'hbo', nome: 'HBO' },
    { id: 'hbo-2', nome: 'HBO 2' },
    { id: 'hbo-family', nome: 'HBO Family' },
    { id: 'hbo-mundi', nome: 'HBO Mundi' },
    { id: 'hbo-pop', nome: 'HBO Pop' },
    { id: 'hbo-plus', nome: 'HBO Plus' },
    { id: 'hbo-xtreme', nome: 'HBO Xtreme' },
    { id: 'tnt', nome: 'TNT' },
    { id: 'tnt-series', nome: 'TNT Series' },
    { id: 'space', nome: 'SPACE' },
    { id: 'warner-channel', nome: 'Warner Channel' },
    { id: 'sony', nome: 'Sony Channel' },
    { id: 'axn', nome: 'AXN' },
    { id: 'amc', nome: 'AMC' },
    { id: 'megapix', nome: 'Megapix' }
];

const dias = ["", "/amanha", "/segunda", "/terca", "/quarta", "/quinta", "/sexta"];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ========================
// XML BASE INSTANTÂNEO
// ========================
function gerarXMLBase() {
    return `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG carregando...">

${canais.map(c => `
<channel id="${c.id}">
  <display-name lang="pt">${c.nome}</display-name>
</channel>`).join("\n")}

</tv>`;
}

// ========================
// ESCAPE
// ========================
function escapeXML(str) {
    return str
        ?.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;") || "";
}

// ========================
// FORMAT
// ========================
function formatXMLTV(date) {
    const d = new Date(date);
    const pad = n => String(n).padStart(2, "0");

    return d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds()) +
        " -0300";
}

// ========================
// PARSER
// ========================
function parseGrade(html, canalId, diaOffset) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const items = [...doc.querySelectorAll('ul.broadcasts > li')];

    let programas = [];

    for (let i = 0; i < items.length; i++) {

        const el = items[i];

        const hora = el.querySelector('.time')?.textContent?.trim();
        const titulo = el.querySelector('h2')?.textContent?.trim();
        const desc = el.querySelector('.synopsis')?.textContent?.trim();

        if (!hora || !titulo) continue;

        const proxHora = items[i + 1]?.querySelector('.time')?.textContent?.trim();

        const [h, m] = hora.split(":");

        const inicio = new Date();
        inicio.setHours(parseInt(h), parseInt(m), 0);
        inicio.setDate(inicio.getDate() + diaOffset);

        let fim = new Date(inicio);

        if (proxHora) {
            const [ph, pm] = proxHora.split(":");
            fim.setHours(parseInt(ph), parseInt(pm), 0);

            if (fim <= inicio) fim.setDate(fim.getDate() + 1);
        } else {
            fim.setHours(inicio.getHours() + 2);
        }

        programas.push(`<programme start="${formatXMLTV(inicio)}" stop="${formatXMLTV(fim)}" channel="${canalId}">
  <title lang="pt">${escapeXML(titulo)}</title>
  <desc lang="pt">${escapeXML(desc || titulo)}</desc>
</programme>`);
    }

    return programas.join("\n");
}

// ========================
// FETCH
// ========================
async function fetchPage(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept-Language": "pt-BR"
            }
        });

        if (!res.ok) return null;

        return await res.text();

    } catch {
        return null;
    }
}

// ========================
// CAPTURAR
// ========================
async function capturar(canal) {
    let resultadoFinal = "";

    for (let i = 0; i < dias.length; i++) {

        const html = await fetchPage(`${BASE_URL}${canal.id}${dias[i]}`);

        if (!html) continue;

        resultadoFinal += parseGrade(html, canal.id, i) + "\n";

        await sleep(800);
    }

    return resultadoFinal;
}

// ========================
// GERAR XML COMPLETO
// ========================
async function gerarXML() {

    if (gerando) return;

    gerando = true;

    try {

        console.log("🚀 Atualizando EPG...");

        let programas = "";

        for (const canal of canais) {
            programas += await capturar(canal);
            await sleep(1000);
        }

        const agora = new Date().toISOString();

        xmlCache = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG atualizado - ${agora}">

${canais.map(c => `
<channel id="${c.id}">
  <display-name lang="pt">${c.nome}</display-name>
</channel>`).join("\n")}

${programas}

</tv>`;

        fs.writeFileSync("programacao.xml", xmlCache);

        console.log("✅ EPG ATUALIZADO");

    } catch {
        console.log("❌ erro ao atualizar");
    }

    gerando = false;
}

// ========================
// ROTAS
// ========================
app.get("/", (req, res) => {
    res.send("EPG ONLINE 🚀");
});

app.get("/programacao.xml", (req, res) => {

    res.set("Content-Type", "application/xml; charset=utf-8");

    // 🔥 resposta instantânea
    if (xmlCache) {
        return res.send(xmlCache);
    }

    // fallback inicial
    return res.send(gerarXMLBase());
});

// ========================
// START
// ========================
app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);

    // 🔥 já cria XML base instantâneo
    xmlCache = gerarXMLBase();

    // 🔥 atualiza em background
    gerarXML();

    setInterval(gerarXML, 1000 * 60 * 60 * 24);
});