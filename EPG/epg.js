const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://meuguia.tv/programacao/canal/";

// ========================
// CONTROLE
// ========================
let gerando = false;

// ========================
// CANAIS (AJUSTE AQUI)
// ========================
const canais = [
    { id: 'MDO', nome: 'A&E' },
    { id: 'MGM', nome: 'AMC' },
    { id: 'AXN', nome: 'AXN' },
    { id: 'MNX', nome: 'Cinemax' },
    { id: 'HBO', nome: 'HBO' },
    { id: 'HB2', nome: 'HBO 2' },
    { id: 'HFA', nome: 'HBO Family' }

];

// ========================
// UTILS
// ========================
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function escapeXML(str) {
    return str
        ?.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;") || "";
}

function formatXMLTV(date) {
    const pad = n => String(n).padStart(2, "0");

    return date.getFullYear() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds()) +
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
// PARSER NOVO (MEUGUIA)
// ========================
function parseGrade(html, canalId) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const items = [...doc.querySelectorAll(".mw li")];

    let programas = [];
    let dataAtual = new Date();

    for (let i = 0; i < items.length; i++) {

        const el = items[i];

        // =========================
        // 🔥 DETECTA TROCA DE DIA
        // =========================
        if (el.classList.contains("subheader")) {

            const texto = el.textContent.trim();

            const match = texto.match(/(\d{1,2})\/(\d{1,2})/);

            if (match) {
                const dia = parseInt(match[1]);
                const mes = parseInt(match[2]) - 1;

                dataAtual = new Date();
                dataAtual.setDate(dia);
                dataAtual.setMonth(mes);
            }

            continue;
        }

        const hora = el.querySelector(".time")?.textContent?.trim();
        const titulo = el.querySelector("h2")?.textContent?.trim();
        const desc = el.querySelector("h3")?.textContent?.trim();

        if (!hora || !titulo) continue;

        const [h, m] = hora.split(":");

        const inicio = new Date(dataAtual);
        inicio.setHours(parseInt(h), parseInt(m), 0);

        // =========================
        // 🔥 calcula fim pelo próximo
        // =========================
        let fim = new Date(inicio);

        for (let j = i + 1; j < items.length; j++) {

            const prox = items[j];

            const proxHora = prox.querySelector(".time")?.textContent?.trim();

            if (proxHora && proxHora.includes(":")) {

                const [ph, pm] = proxHora.split(":");

                fim.setHours(parseInt(ph), parseInt(pm), 0);

                if (fim <= inicio) {
                    fim.setDate(fim.getDate() + 1);
                }

                break;
            }
        }

        // fallback duração
        if (fim.getTime() === inicio.getTime()) {
            fim.setHours(inicio.getHours() + 2);
        }

        programas.push(`<programme start="${formatXMLTV(inicio)}" stop="${formatXMLTV(fim)}" channel="${canalId}">
  <title lang="pt">${escapeXML(titulo)}</title>
  <desc lang="pt">${escapeXML(desc || titulo)}</desc>
</programme>`);
    }

    console.log(`✅ ${canalId} -> ${programas.length} programas`);

    return programas.join("\n");
}

// ========================
// FETCH (SIMPLES E FUNCIONA)
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

    const url = `${BASE_URL}${canal.id}`;

    console.log(`🔎 ${url}`);

    const html = await fetchPage(url);

    if (!html) {
        console.log(`❌ erro ${canal.nome}`);
        return "";
    }

    return parseGrade(html, canal.id);
}

// ========================
// GERAR XML
// ========================
async function gerarXML() {

    if (gerando) return;

    gerando = true;

    try {

        console.log("🚀 Gerando EPG...");

        let resultados = [];

        for (const canal of canais) {
            const res = await capturar(canal);
            resultados.push(res);
            await sleep(500);
        }

        const xmlProg = resultados.filter(Boolean).join("\n");

        const agora = new Date().toISOString();

        const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG MeuGuia - ${agora}">

${gerarCanais()}

${xmlProg}

</tv>`;

        fs.writeFileSync("programacao.xml", xml, "utf-8");

        console.log("✅ EPG GERADO");

    } catch (e) {
        console.log("❌ erro geral");
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

    const path = __dirname + "/programacao.xml";

    if (fs.existsSync(path)) {
        res.set("Content-Type", "application/xml; charset=utf-8");
        return res.sendFile(path);
    }

    res.set("Content-Type", "application/xml; charset=utf-8");

    return res.send(`<?xml version="1.0" encoding="utf-8"?>
<tv>
${gerarCanais()}
</tv>`);
});

// ========================
// START
// ========================
app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);

    gerarXML();

    setInterval(gerarXML, 1000 * 60 * 60 * 12);
});