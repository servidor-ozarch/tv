const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://mi.tv/br/canais/";

// ========================
// CONTROLE
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

// 🔥 rápido (pode expandir depois)
const dias = ["", "/amanha"];

// ========================
// XML BASE
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
// ESCAPE XML
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
// FORMAT XMLTV
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
// PARSER FINAL (SEU MODELO)
// ========================
function parseGrade(html, canalId, diaOffset) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    let programas = [];

    let items = [...doc.querySelectorAll('ul.broadcasts > li')];

    if (items.length === 0) {
        items = [...doc.querySelectorAll('.broadcasts li')];
    }

    if (items.length === 0) {
        console.log(`❌ sem itens para ${canalId}`);
        return "";
    }

    for (let i = 0; i < items.length; i++) {

        const el = items[i];

        const hora = el.querySelector('.time')?.textContent?.trim();

        let titulo = el.querySelector('h2, h3')?.textContent?.trim();
        if (titulo) {
            titulo = titulo.replace(/\s+/g, " ");
        }

        let desc =
            el.querySelector('.synopsis')?.textContent?.trim() ||
            el.querySelector('.sub-title')?.textContent?.trim() ||
            titulo;

        if (!hora || !titulo || !hora.includes(":")) continue;

        const proxHora = items[i + 1]?.querySelector('.time')?.textContent?.trim();

        const [h, m] = hora.split(":");

        const inicio = new Date();
        inicio.setHours(parseInt(h), parseInt(m), 0);
        inicio.setDate(inicio.getDate() + diaOffset);

        let fim = new Date(inicio);

        if (proxHora && proxHora.includes(":")) {
            const [ph, pm] = proxHora.split(":");
            fim.setHours(parseInt(ph), parseInt(pm), 0);

            if (fim <= inicio) fim.setDate(fim.getDate() + 1);
        } else {
            fim.setHours(inicio.getHours() + 2);
        }

        programas.push(`<programme start="${formatXMLTV(inicio)}" stop="${formatXMLTV(fim)}" channel="${canalId}">
  <title lang="pt">${escapeXML(titulo)}</title>
  <desc lang="pt">${escapeXML(desc)}</desc>
</programme>`);
    }

    if (programas.length > 0) {
        console.log(`✅ ${canalId} -> ${programas.length}`);
        return programas.join("\n");
    }

    // 🔥 fallback
    const titulo = doc.querySelector('h1.impact-medium')?.textContent?.trim();
    const desc = doc.querySelector('p')?.textContent?.trim();
    const hora = doc.querySelector('.time')?.textContent?.trim();

    if (!titulo || !hora) return "";

    const [h, m] = hora.split(":");

    const inicio = new Date();
    inicio.setHours(parseInt(h), parseInt(m), 0);
    inicio.setDate(inicio.getDate() + diaOffset);

    const fim = new Date(inicio);
    fim.setHours(inicio.getHours() + 2);

    console.log(`⚠️ fallback ${canalId}`);

    return `<programme start="${formatXMLTV(inicio)}" stop="${formatXMLTV(fim)}" channel="${canalId}">
  <title lang="pt">${escapeXML(titulo)}</title>
  <desc lang="pt">${escapeXML(desc || titulo)}</desc>
</programme>`;
}

// ========================
// FETCH
// ========================
async function fetchPage(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
                "Accept": "text/html",
                "Accept-Language": "pt-BR",
                "Referer": "https://mi.tv/"
            }
        });

        if (!res.ok) return null;

        const html = await res.text();

        if (!html.includes("time")) return null;

        return html;

    } catch {
        return null;
    }
}

// ========================
// CAPTURAR
// ========================
async function capturar(canal) {

    let resultado = "";

    for (let i = 0; i < dias.length; i++) {

        const url = `${BASE_URL}${canal.id}${dias[i]}`;

        let html = await fetchPage(url);

        if (!html) {
            const retry = await fetchPage(url);
            if (!retry) continue;
            html = retry;
        }

        resultado += parseGrade(html, canal.id, i);
    }

    return resultado;
}

// ========================
// GERAR XML (PARALELO)
// ========================
async function gerarXML() {

    if (gerando) return;
    gerando = true;

    try {

        console.log("🚀 Atualizando EPG...");

        const resultados = await Promise.all(
            canais.map(c => capturar(c))
        );

        const programas = resultados.join("\n");

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

        console.log("✅ EPG GERADO");

    } catch (e) {
        console.log("❌ erro", e);
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

    if (xmlCache) return res.send(xmlCache);

    return res.send(gerarXMLBase());
});

// ========================
// START
// ========================
app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);

    xmlCache = gerarXMLBase();

    gerarXML();

    setInterval(gerarXML, 1000 * 60 * 60 * 24);
});