const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://tvinside.com.br/programacao_tv/";
const dias = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];

// ========================
// LISTA DE CANAIS
// ========================
const canais = [
    { id: 'gnt', nome: 'GNT' },
    { id: 'hgtv', nome: 'HGTV' },
    { id: 'multishow', nome: 'Multishow' },
    { id: 'cartoonnetwork', nome: 'Cartoon Network' },
    { id: 'discoverykids', nome: 'Discovery Kids' },
    { id: 'sportv', nome: 'SPORTV' },
    { id: 'espn1', nome: 'ESPN' }
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
function formatXMLTV(dateStr) {
    const d = new Date(dateStr.replace(" ", "T"));
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
// CANAIS XML
// ========================
function gerarCanais() {
    return canais.map(c => `
<channel id="${c.id}">
  <display-name lang="pt">${escapeXML(c.nome)}</display-name>
</channel>`).join("\n");
}

// ========================
// PARSE GRADE
// ========================
function parseGrade(html, canalId) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const regs = [...doc.querySelectorAll('.registro.programa_data')];

    return regs.map(el => {

        const titulo = el.querySelector('.titulo')?.textContent?.trim();

        const descRaw =
            el.querySelector('.descricao_programa')?.textContent?.trim() ||
            el.querySelector('.sinopse')?.textContent?.trim() ||
            el.querySelector('.evento_box')?.textContent?.trim();

        const dti = el.getAttribute('dti');
        const dtf = el.getAttribute('dtf');

        if (!titulo || !dti || !dtf) return "";

        return `<programme start="${formatXMLTV(dti)}" stop="${formatXMLTV(dtf)}" channel="${canalId}">
  <title lang="pt">${escapeXML(titulo)}</title>
  <desc lang="pt">${escapeXML(descRaw || titulo)}</desc>
</programme>`;

    }).join("\n");
}

// ========================
// CAPTURAR (SUA VERSÃO FINAL)
// ========================
async function capturar(canal) {
    try {

        for (let i = 0; i < dias.length; i++) {

            const dia = dias[i];
            const url = `${BASE_URL}${canal.id}/${dia}`;

            const res = await fetch(url, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            if (!res.ok) continue;

            const html = await res.text();

            const programas = parseGrade(html, canal.id);

            if (programas && programas.length > 0) {
                console.log(`✔ ${canal.nome} ok (${dia})`);
                return programas;
            }
        }

        console.log(`⚠️ ${canal.nome} sem programação`);
        return "";

    } catch {
        console.log(`❌ erro ${canal.nome}`);
        return "";
    }
}

// ========================
// PROCESSAR (SUA VERSÃO FINAL)
// ========================
async function processar(canais) {
    return await Promise.all(
        canais.map(c => capturar(c))
    );
}

// ========================
// GERAR XML (SUA VERSÃO FINAL)
// ========================
async function gerarXML() {
    console.log("🚀 Gerando EPG...");

    const resultados = await processar(canais);

    const xmlProg = resultados
        .filter(Boolean)
        .join("\n");

    const agora = new Date().toISOString().replace("T", " ").split(".")[0];

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG Custom - ${agora}">

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

    setInterval(gerarXML, 1000 * 60 * 60 * 24);
});