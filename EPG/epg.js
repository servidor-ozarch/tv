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
    { id: 'ae', nome: 'A&E' }
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
// GERAR CANAIS
// ========================
function gerarCanais() {
    return canais.map(c => `<channel id="${c.id}">
  <display-name lang="pt">${escapeXML(c.nome)}</display-name>
</channel>`).join("\n");
}

// ========================
// PARSE HTML → XMLTV (FINAL)
// ========================
function parseGrade(html, canalId){

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    let programas = [];

    // ========================
    // FORMATO COMPLETO (registro)
    // ========================
    const regs = [...doc.querySelectorAll('.registro.programa_data')];

    regs.forEach(el => {

        const titulo = el.querySelector('.titulo')?.textContent?.trim();

        const desc =
            el.querySelector('.descricao_programa')?.textContent?.trim() ||
            el.querySelector('.sinopse')?.textContent?.trim() ||
            titulo;

        const classificacao =
            el.querySelector('.classificacao')?.textContent?.trim();

        const faixa =
            el.querySelector('.faixa_etaria')?.textContent?.trim();

        const dti = el.getAttribute('dti');
        const dtf = el.getAttribute('dtf');

        if(!titulo || !dti || !dtf) return;

        programas.push({
            start: formatXMLTV(dti),
            stop: formatXMLTV(dtf),
            title: titulo,
            desc,
            rating: (faixa || classificacao)
                ? (faixa || "") + (classificacao ? " | " + classificacao : "")
                : null
        });
    });

    // ========================
    // FORMATO NOVO (evento_box)
    // ========================
    const eventos = [...doc.querySelectorAll('.evento_box.programa_data')];

    if(eventos.length){

        eventos.forEach((el, index) => {

            const titulo = el.querySelector('.titulo')?.textContent?.trim();
            const timeEl = el.querySelector('time');

            if(!titulo || !timeEl) return;

            const hora = timeEl.getAttribute("datetime");
            if(!hora) return;

            const inicio = new Date(hora.replace(" ","T"));

            let fim;

            if(eventos[index+1]){
                const proxTime = eventos[index+1].querySelector('time')?.getAttribute("datetime");
                if(proxTime){
                    fim = new Date(proxTime.replace(" ","T"));
                }
            }

            // fallback +1h
            if(!fim){
                fim = new Date(inicio.getTime() + 60*60*1000);
            }

            const categoria =
                el.querySelector('.box_tc_exp')?.textContent?.trim();

            programas.push({
                start: formatXMLTV(inicio.toISOString().replace("T"," ").substring(0,19)),
                stop: formatXMLTV(fim.toISOString().replace("T"," ").substring(0,19)),
                title: titulo,
                desc: categoria || titulo,
                rating: null
            });
        });
    }

    // ========================
    // ORDENAR (IMPORTANTE IPTV)
    // ========================
    programas.sort((a,b)=> a.start.localeCompare(b.start));

    // ========================
    // GERAR XML
    // ========================
    return programas.map(p => {

        let rating = "";
        if(p.rating){
            rating = `<rating system="Brazil">
    <value>${escapeXML(p.rating)}</value>
  </rating>`;
        }

        return `<programme start="${p.start}" stop="${p.stop}" channel="${canalId}">
  <title lang="pt">${escapeXML(p.title)}</title>
  <desc lang="pt">${escapeXML(p.desc)}</desc>
  ${rating}
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
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!res.ok) return "";

        const html = await res.text();

        return parseGrade(html, canal.id);

    } catch {
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

    const agora = new Date().toISOString().replace("T", " ").split(".")[0];

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG Custom - ${agora}" generator-info-url="https://guia-6zue.onrender.com">

${gerarCanais()}

${resultados.join("\n")}

</tv>`;

    fs.writeFileSync("programacao.xml", xml, "utf-8");

    console.log("✅ EPG GERADO");
}

// ========================
// AGENDAR 03:00
// ========================
function agendar() {
    const agora = new Date();
    const proxima = new Date();

    proxima.setHours(3,0,0,0);
    if (agora >= proxima) proxima.setDate(proxima.getDate() + 1);

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
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.sendFile(__dirname + "/programacao.xml");
});

// ========================
// START
// ========================
app.listen(PORT, async () => {

    console.log(`🔥 Servidor rodando porta ${PORT}`);

    await gerarXML(); // inicial
    agendar();        // automático
});