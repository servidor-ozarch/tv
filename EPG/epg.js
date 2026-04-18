const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://mi.tv/br/canais/";

let xmlCache = null;
let gerando = false;

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

const dias = ["", "/amanha"];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ========================
// XML BASE (instantâneo)
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
// PARSER FINAL
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
        if (titulo) titulo = titulo.replace(/\s+/g, " ");

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

    return "";
}

// ========================
// FETCH COM ANTI-BLOQUEIO
// ========================
async function fetchPage(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Referer": "https://mi.tv/",
                "Upgrade-Insecure-Requests": "1"
            }
        });

        if (!res.ok) return null;

        const html = await res.text();

        if (!html.includes("broadcasts")) {
            console.log("🚫 BLOQUEADO");
            return null;
        }

        return html;

    } catch {
        console.log("❌ fetch erro");
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
            console.log(`🔁 retry ${canal.id}`);
            await sleep(2000);
            html = await fetchPage(url);
        }

        if (!html) continue;

        resultado += parseGrade(html, canal.id, i);

        // 🔥 ANTI-BAN
        await sleep(2000);
    }

    return resultado;
}

// ========================
// GERAR XML
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
        console.log("❌ erro geral", e);
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