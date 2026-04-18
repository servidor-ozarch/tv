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
    { id: 'espn', nome: 'ESPN' }
];

// ========================
// FORMATAR DATA XMLTV
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
// GERAR <channel>
// ========================
function gerarCanais() {
    return canais.map(c => `<channel id="${c.id}">
  <display-name lang="pt">${c.nome}</display-name>
</channel>`).join("\n");
}

// ========================
// PARSE HTML
// ========================
function parseGrade(html, canalId) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const regs = [...doc.querySelectorAll('.registro.programa_data')];

    return regs.map(el => {
        const titulo = el.querySelector('.titulo')?.textContent?.trim();
        const dti = el.getAttribute('dti');
        const dtf = el.getAttribute('dtf');

        if (!titulo || !dti || !dtf) return "";

        return `<programme start="${formatXMLTV(dti)}" stop="${formatXMLTV(dtf)}" channel="${canalId}">
  <title lang="pt">${titulo}</title>
</programme>`;
    }).join("\n");
}

// ========================
// CAPTURA CANAL
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

        if (!res.ok) {
            console.log(`❌ ${canal.nome} HTTP ${res.status}`);
            return "";
        }

        const html = await res.text();

        return parseGrade(html, canal.id);

    } catch (e) {
        console.log(`❌ ${canal.nome}`);
        return "";
    }
}

// ========================
// PROCESSAMENTO PARALELO
// ========================
async function processar(canais, dia) {
    return await Promise.all(canais.map(c => capturar(c, dia)));
}

// ========================
// GERAR XML FINAL
// ========================
async function gerarXML() {
    console.log("🚀 Gerando EPG...");

    const dia = dias[new Date().getDay()];
    const resultados = await processar(canais, dia);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="EPG Custom" generator-info-url="https://seu-app.onrender.com">

${gerarCanais()}

${resultados.join("\n")}

</tv>`;

    fs.writeFileSync("programacao.xml", xml, "utf-8");

    console.log("✅ EPG gerado com padrão IPTV!");
}

// ========================
// AGENDAR 03:00
// ========================
function agendar() {
    const agora = new Date();
    const proxima = new Date();

    proxima.setHours(3, 0, 0, 0);
    if (agora >= proxima) proxima.setDate(proxima.getDate() + 1);

    const delay = proxima - agora;

    console.log(`⏰ Próxima atualização em ${Math.round(delay/1000)}s`);

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
    console.log(`🔥 Servidor rodando na porta ${PORT}`);

    await gerarXML(); // gera ao iniciar
    agendar();        // agenda 03:00
});