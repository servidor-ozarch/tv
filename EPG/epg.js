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
    { id: 'AEBrasil.us', nome: 'A&E' },
    { id: 'AMCBrasil.us', nome: 'AMC' },
    { id: 'AXNBrazil.us', nome: 'AXN' },
    { id: 'CinemaxBrasil.us', nome: 'Cinemax' },
    { id: 'HBOBrasil.us', nome: 'HBO' },
    { id: 'HBO2Brasil.us', nome: 'HBO 2' },
    { id: 'HBOFamilyBrasil.us', nome: 'HBO Family' },
    { id: 'HBOMundiBrasil.us', nome: 'HBO Mundi' },
    { id: 'HBOPopBrasil.us', nome: 'HBO Pop' },
    { id: 'HBOBrasil.us', nome: 'HBO Plus' },
    { id: 'HBOXtremeBrasil.us', nome: 'HBO Xtreme' },
    { id: 'Megapix.br', nome: 'Megapix' },
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
    { id: 'cultura', nome: 'TV Cultura' }
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