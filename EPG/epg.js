const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// NOVA BASE (MI.TV)
// ========================
const BASE_URL = "https://mi.tv/br/canais/";

// ========================
// LISTA DE CANAIS (AJUSTADA)
// ========================
const canais = [
    { id: 'cinemax', nome: 'Cinemax' },
    { id: 'hbo', nome: 'HBO' },
    { id: 'hbo2', nome: 'HBO 2' },
    { id: 'hbofamily', nome: 'HBO Family' },
    { id: 'hbomundi', nome: 'HBO Mundi' },
    { id: 'hbopop', nome: 'HBO Pop' },
    { id: 'hboplus', nome: 'HBO Plus' },
    { id: 'hboxtreme', nome: 'HBO Xtreme' },
    { id: 'tnt', nome: 'TNT' },
    { id: 'tntseries', nome: 'TNT Series' },
    { id: 'space', nome: 'SPACE' },
    { id: 'warner', nome: 'Warner Channel' },
    { id: 'sony', nome: 'Sony Channel' },
    { id: 'axn', nome: 'AXN' },
    { id: 'amc', nome: 'AMC' },
    { id: 'megapix', nome: 'Megapix' }
];

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
// FORMATO XMLTV
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
// PARSE MI.TV
// ========================
function parseGrade(html, canalId) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const items = [...doc.querySelectorAll('#listings ul.broadcasts li')];

    let programas = [];

    for (let i = 0; i < items.length; i++) {

        const el = items[i];

        const hora = el.querySelector('.time')?.textContent?.trim();
        const titulo = el.querySelector('h2')?.textContent?.trim();
        const desc = el.querySelector('.synopsis')?.textContent?.trim();

        if (!hora || !titulo) continue;

        // PRÓXIMO HORÁRIO
        const proxHora = items[i + 1]?.querySelector('.time')?.textContent?.trim();

        const [h, m] = hora.split(":");

        const inicio = new Date();
        inicio.setHours(parseInt(h), parseInt(m), 0);

        let fim = new Date(inicio);

        if (proxHora) {
            const [ph, pm] = proxHora.split(":");
            fim.setHours(parseInt(ph), parseInt(pm), 0);

            // VIRADA DE DIA
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
// CAPTURAR
// ========================
async function capturar(canal) {
    try {

        const url = `${BASE_URL}${canal.id}`;

        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!res.ok) {
            console.log(`❌ erro HTTP ${canal.nome}`);
            return "";
        }

        const html = await res.text();

        const programas = parseGrade(html, canal.id);

        if (programas.length > 0) {
            console.log(`✔ ${canal.nome} OK`);
            return programas;
        }

        console.log(`⚠️ ${canal.nome} vazio`);
        return "";

    } catch (e) {
        console.log(`❌ erro ${canal.nome}`);
        return "";
    }
}

// ========================
// PROCESSAR
// ========================
async function processar() {
    return await Promise.all(
        canais.map(c => capturar(c))
    );
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
<tv generator-info-name="EPG mi.tv - ${agora}">

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