const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://tvinside.com.br/programacao_tv/";
const dias = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];

const canais = [
    { id: 'gnt', nome: 'GNT' },
    { id: 'hgtv', nome: 'HGTV' },
    { id: 'multishow', nome: 'Multishow' },
    { id: 'cartoon-network', nome: 'Cartoon Network' },
    { id: 'discovery-kids', nome: 'Discovery Kids' },
    { id: 'sportv', nome: 'SPORTV' },
    { id: 'espn', nome: 'ESPN' },
    // continua sua lista...
];

// ========================
// FORMATAR DATA XMLTV
// ========================
function formatXMLTV(dateStr) {
    const d = new Date(dateStr.replace(" ", "T"));

    const pad = n => String(n).padStart(2, "0");

    return d.getFullYear() +
        pad(d.getMonth()+1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds()) +
        " -0300";
}

// ========================
// PARSE HTML (SEU MODELO)
// ========================
function parseGrade(html, canalId) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const regs = [...doc.querySelectorAll('.registro.programa_data')];

    return regs.map(el => {
        const titulo = el.querySelector('.titulo')?.textContent?.trim();
        const dti = el.getAttribute('dti');
        const dtf = el.getAttribute('dtf');

        if (!titulo || !dti) return "";

        return `
<programme channel="${canalId}" start="${formatXMLTV(dti)}" stop="${formatXMLTV(dtf)}">
    <title>${titulo}</title>
</programme>`;
    }).join("\n");
}

// ========================
// CAPTURA POR CANAL
// ========================
async function capturar(canal, dia) {
    try {
        console.log(`📡 ${canal.nome}`);

        const url = `${BASE_URL}${canal.id}/${dia}`;

        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const html = await res.text();

        return parseGrade(html, canal.id);

    } catch (e) {
        console.log(`❌ ${canal.nome}`);
        return "";
    }
}

// ========================
// PARALELISMO CONTROLADO
// ========================
async function processar(canais, dia) {
    const promises = canais.map(c => capturar(c, dia));
    return await Promise.all(promises);
}

// ========================
// GERAR XML
// ========================
async function gerarXML() {
    console.log("🚀 Gerando EPG...");

    const dia = dias[new Date().getDay()];

    const resultados = await processar(canais, dia);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
${resultados.join("\n")}
</tv>`;

    fs.writeFileSync("programacao.xml", xml);

    console.log("✅ EPG atualizado!");
}

// ========================
// AGENDAR 03:00
// ========================
function agendar() {
    const agora = new Date();
    const proxima = new Date();

    proxima.setHours(3,0,0,0);
    if (agora >= proxima) proxima.setDate(proxima.getDate()+1);

    const delay = proxima - agora;

    setTimeout(async () => {
        await gerarXML();
        agendar();
    }, delay);
}

// ========================
// ROTAS
// ========================
app.get("/", (req, res) => {
    res.send("EPG ONLINE 🚀");
});

app.get("/programacao.xml", (req, res) => {
    res.sendFile(__dirname + "/programacao.xml");
});

// ========================
// START
// ========================
app.listen(PORT, async () => {
    console.log(`🔥 Porta ${PORT}`);

    await gerarXML();
    agendar();
});