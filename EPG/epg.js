const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://tvinside.com.br/programacao_tv/";
const dias = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];

// ========================
// CONFIG
// ========================
const EPG_DIAS = 2; // 2 = 48h | 3 = 72h
const CACHE_FILE = "cache_canais.json";
const M3U_URL = process.env.M3U_URL || "";

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
// GERAR CANDIDATOS
// ========================
function gerarCandidatos(){
    const base = [
        "gnt","ea","hgtv","History","multishow","sportv","sportv2","sportv3",
        "espn","espn2","espn3","espn4","espn5","espn6",
        "premiere","premiere2","premiere3","premiere4","premiere5","premiere6",
        "cartoonnetwork","cartoonito","discoverykids",
        "globo","globonews","sbt","record","band","bandnews","cnnbrasil"
    ];
    return [...new Set(base)];
}

// ========================
// VALIDAR CANAL
// ========================
async function canalValido(id, dia){
    try{
        const res = await fetch(`${BASE_URL}${id}/${dia}`);
        const html = await res.text();

        return html.includes("programa_data");
    }catch{
        return false;
    }
}

// ========================
// CACHE
// ========================
function salvarCache(canais){
    fs.writeFileSync(CACHE_FILE, JSON.stringify(canais), "utf-8");
}

function carregarCache(){
    if(fs.existsSync(CACHE_FILE)){
        return JSON.parse(fs.readFileSync(CACHE_FILE));
    }
    return null;
}

// ========================
// DESCOBRIR CANAIS
// ========================
async function descobrirCanais(){

    const cache = carregarCache();
    if(cache){
        console.log("⚡ usando cache");
        return cache;
    }

    console.log("🔍 descobrindo canais...");

    const dia = dias[new Date().getDay()];
    const candidatos = gerarCandidatos();

    const encontrados = [];

    await Promise.all(candidatos.map(async id=>{
        if(await canalValido(id, dia)){
            encontrados.push({ id, nome: id.toUpperCase() });
            console.log("✅", id);
        }
    }));

    salvarCache(encontrados);
    return encontrados;
}

// ========================
// PARSE
// ========================
function parseGrade(html, canalId){

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    let programas = [];

    // FORMATO COMPLETO
    doc.querySelectorAll('.registro.programa_data').forEach(el => {

        const titulo = el.querySelector('.titulo')?.textContent?.trim();
        const desc = el.querySelector('.descricao_programa')?.textContent?.trim() || titulo;

        const dti = el.getAttribute('dti');
        const dtf = el.getAttribute('dtf');

        if(!titulo || !dti || !dtf) return;

        programas.push({
            start: formatXMLTV(dti),
            stop: formatXMLTV(dtf),
            title: titulo,
            desc
        });
    });

    // FORMATO NOVO
    const eventos = [...doc.querySelectorAll('.evento_box.programa_data')];

    eventos.forEach((el,i)=>{
        const titulo = el.querySelector('.titulo')?.textContent?.trim();
        const time = el.querySelector('time')?.getAttribute("datetime");

        if(!titulo || !time) return;

        const inicio = new Date(time.replace(" ","T"));

        let fim;
        if(eventos[i+1]){
            const prox = eventos[i+1].querySelector('time')?.getAttribute("datetime");
            if(prox) fim = new Date(prox.replace(" ","T"));
        }

        if(!fim) fim = new Date(inicio.getTime()+3600000);

        programas.push({
            start: formatXMLTV(inicio.toISOString().slice(0,19).replace("T"," ")),
            stop: formatXMLTV(fim.toISOString().slice(0,19).replace("T"," ")),
            title: titulo,
            desc: titulo
        });
    });

    return programas.map(p=>`
<programme start="${p.start}" stop="${p.stop}" channel="${canalId}">
  <title lang="pt">${escapeXML(p.title)}</title>
  <desc lang="pt">${escapeXML(p.desc)}</desc>
</programme>`).join("");
}

// ========================
// CAPTURAR MULTI-DIA
// ========================
async function capturar(canal){

    let xml = "";

    for(let i=0;i<EPG_DIAS;i++){

        const dia = dias[(new Date().getDay()+i)%7];

        try{
            const res = await fetch(`${BASE_URL}${canal.id}/${dia}`);
            const html = await res.text();

            xml += parseGrade(html, canal.id);

        }catch{}
    }

    return xml;
}

// ========================
// M3U → TVG-ID
// ========================
async function mapearM3U(){

    if(!M3U_URL) return {};

    try{
        const res = await fetch(M3U_URL);
        const txt = await res.text();

        const map = {};

        txt.split("\n").forEach(l=>{
            if(l.includes("#EXTINF")){
                const id = l.match(/tvg-id="([^"]+)"/)?.[1];
                const name = l.split(",")[1];

                if(id && name){
                    map[name.toLowerCase()] = id;
                }
            }
        });

        return map;

    }catch{
        return {};
    }
}

// ========================
// GERAR XML
// ========================
async function gerarXML(){

    console.log("🚀 gerando EPG");

    const canais = await descobrirCanais();
    const mapaM3U = await mapearM3U();

    const canaisXML = canais.map(c=>{
        const tvg = mapaM3U[c.nome.toLowerCase()] || c.id;

        return `<channel id="${tvg}">
  <display-name lang="pt">${escapeXML(c.nome)}</display-name>
</channel>`;
    }).join("\n");

    const programas = await Promise.all(
        canais.map(c=>capturar(c))
    );

    const agora = new Date().toISOString().replace("T"," ").split(".")[0];

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG PRO ${agora}" generator-info-url="https://guia-6zue.onrender.com">

${canaisXML}

${programas.join("\n")}

</tv>`;

    fs.writeFileSync("programacao.xml", xml);
    console.log("✅ EPG PRONTO");
}

// ========================
// AGENDAR
// ========================
function agendar(){

    const agora = new Date();
    const proxima = new Date();

    proxima.setHours(3,0,0,0);
    if(agora >= proxima) proxima.setDate(proxima.getDate()+1);

    const delay = proxima - agora;

    setTimeout(async ()=>{
        await gerarXML();
        agendar();
    }, delay);
}

// ========================
// ROTAS
// ========================
app.get("/", (req,res)=>{
    res.send("EPG ONLINE 🚀");
});

app.get("/programacao.xml",(req,res)=>{
    res.set("Content-Type","application/xml");
    res.sendFile(__dirname + "/programacao.xml");
});

// ========================
// START
// ========================
app.listen(PORT, async ()=>{

    console.log("🔥 rodando");

    await gerarXML();
    agendar();
});