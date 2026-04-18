const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://mi.tv/br/canais/";

// ========================
// CANAIS (CONFIRMADOS)
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

// ========================
// DIAS (7 DIAS)
// ========================
const dias = ["", "/amanha", "/segunda", "/terca", "/quarta", "/quinta", "/sexta"];

// ========================
// UTIL DELAY (ANTI-BAN)
// ========================
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
// GERAR CANAIS XML
// ========================
function gerarCanais() {
    return canais.map(c => `
<channel id="${c.id}">
  <display-name lang="pt">${escapeXML(c.nome)}</display-name>
</channel>`).join("\n");
}

// ========================
// PARSER MI.TV (ROBUSTO)
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

            // 🔥 VIRADA PERFEITA
            if (fim <= inicio) {
                fim.setDate(fim.getDate() + 1);
            }

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
// FETCH COM ANTI-BLOQUEIO
// ========================
async function fetchPage(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept-Language": "pt-BR,pt;q=0.9"
            }
        });

        if (!res.ok) return null;

        return await res.text();

    } catch {
        return null;
    }
}

// ========================
// CAPTURAR 7 DIAS
// ========================
async function capturar(canal) {
    let resultadoFinal = "";

    for (let i = 0; i < dias.length; i++) {

        const url = `${BASE_URL}${canal.id}${dias[i]}`;

        console.log(`🔎 ${canal.nome} (${dias[i] || "hoje"})`);

        const html = await fetchPage(url);

        if (!html) {
            console.log(`❌ erro ${canal.nome}`);
            continue;
        }

        const programas = parseGrade(html, canal.id, i);

        if (programas.length > 0) {
            console.log(`✔ ${canal.nome} OK (${dias[i] || "hoje"})`);
            resultadoFinal += programas + "\n";
        } else {
            console.log(`⚠️ ${canal.nome} vazio (${dias[i] || "hoje"})`);
        }

        // 🔥 ANTI-BAN
        await sleep(1200);
    }

    return resultadoFinal;
}

// ========================
// PROCESSAR
// ========================
async function processar() {
    let resultados = [];

    for (const canal of canais) {
        const res = await capturar(canal);
        resultados.push(res);

        // 🔥 ANTI-BAN ENTRE CANAIS
        await sleep(1500);
    }

    return resultados;
}

// ========================
// GERAR XML
// ========================
async function gerarXML() {
    console.log("🚀 Gerando EPG...");

    const resultados = await processar();

    const xmlProg = resultados
        .filter(Boolean)
        .join("\n");

    const agora = new Date().toISOString().replace("T", " ").split(".")[0];

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG mi.tv PRO - ${agora}">

${gerarCanais()}

${xmlProg}

</tv>`;

    fs.writeFileSync("programacao.xml", xml, "utf-8");

    console.log("✅ EPG GERADO");
}

// ========================
// ROTAS
// ========================
app.get("/", (req, res) => {
    res.send("EPG ONLINE 🚀");
});

app.get("/programacao.xml", (req, res) => {
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.sendFile(__dirname + "/programacao.xml");
});

// ========================
// START
// ========================
app.listen(PORT, async () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);

    await gerarXML();

    // Atualiza a cada 24h
    setInterval(gerarXML, 1000 * 60 * 60 * 24);
});