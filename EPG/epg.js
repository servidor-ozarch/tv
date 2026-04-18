const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// CONFIG
// ========================
const BASE_URL = "https://tvinside.com.br/programacao_tv/";
const FALLBACK_SITES = [
    "https://tvinside.com.br/programacao_tv/",
    "https://meuguia.tv/programacao/"
];

const dias = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];

const EPG_DIAS = 2;
const CACHE_FILE = "cache_epg.json";
const CACHE_CANAIS = "cache_canais.json";
const M3U_URL = process.env.M3U_URL || "";

// ========================
// UTILS
// ========================
function escapeXML(str){
    return str?.replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&apos;") || "";
}

function formatXMLTV(dateStr){
    const d = new Date(dateStr.replace(" ","T"));
    const pad=n=>String(n).padStart(2,"0");
    return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+
        pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds())+" -0300";
}

// ========================
// CACHE
// ========================
function loadJSON(file){
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : null;
}
function saveJSON(file,data){
    fs.writeFileSync(file,JSON.stringify(data,null,2));
}

// ========================
// SCRAPING PROFUNDO (SEM BRUTE)
// ========================
async function extrairCanais(){

    const cache = loadJSON(CACHE_CANAIS);
    if(cache){
        console.log("⚡ canais via cache");
        return cache;
    }

    console.log("🔍 scraping profundo...");

    let encontrados = [];

    try{
        const res = await fetch(BASE_URL);
        const html = await res.text();

        const dom = new JSDOM(html);
        const links = [...dom.window.document.querySelectorAll("a")];

        links.forEach(a=>{
            const href = a.getAttribute("href");

            if(href && href.includes("/programacao_tv/")){
                const match = href.match(/programacao_tv\/([^/]+)/);
                if(match){
                    const id = match[1];
                    encontrados.push({
                        id,
                        nome: id.toUpperCase()
                    });
                }
            }
        });

    }catch{}

    encontrados = [...new Map(encontrados.map(c=>[c.id,c])).values()];

    console.log(`🎯 ${encontrados.length} canais descobertos`);

    saveJSON(CACHE_CANAIS,encontrados);

    return encontrados;
}

// ========================
// PARSER UNIVERSAL
// ========================
function parseGrade(html, canalId){

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    let programas = [];

    // formato completo
    doc.querySelectorAll('.registro.programa_data').forEach(el=>{
        const titulo = el.querySelector('.titulo')?.textContent?.trim();
        const desc = el.querySelector('.descricao_programa')?.textContent?.trim() || titulo;
        const dti = el.getAttribute('dti');
        const dtf = el.getAttribute('dtf');

        if(!titulo||!dti||!dtf) return;

        programas.push({
            start: formatXMLTV(dti),
            stop: formatXMLTV(dtf),
            title: titulo,
            desc
        });
    });

    // fallback evento_box
    const eventos = [...doc.querySelectorAll('.evento_box.programa_data')];

    eventos.forEach((el,i)=>{
        const titulo = el.querySelector('.titulo')?.textContent?.trim();
        const time = el.querySelector('time')?.getAttribute("datetime");

        if(!titulo||!time) return;

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

    return programas;
}

// ========================
// MATCH INTELIGENTE M3U
// ========================
async function mapearM3U(){

    if(!M3U_URL) return {};

    try{
        const txt = await (await fetch(M3U_URL)).text();
        const map = {};

        txt.split("\n").forEach(l=>{
            if(l.includes("#EXTINF")){
                const name = l.split(",")[1]?.toLowerCase();
                const id = l.match(/tvg-id="([^"]+)"/)?.[1];
                if(name && id) map[name]=id;
            }
        });

        return map;

    }catch{
        return {};
    }
}

// ========================
// MATCH FUZZY
// ========================
function similar(a,b){
    a=a.toLowerCase(); b=b.toLowerCase();
    return a.includes(b)||b.includes(a);
}

// ========================
// CAPTURA COM FALLBACK
// ========================
async function capturar(canal){

    let programas=[];

    for(let i=0;i<EPG_DIAS;i++){

        const dia = dias[(new Date().getDay()+i)%7];

        for(let base of FALLBACK_SITES){

            try{
                const res = await fetch(`${base}${canal.id}/${dia}`);
                const html = await res.text();

                const parsed = parseGrade(html, canal.id);

                if(parsed.length){
                    programas.push(...parsed);
                    break;
                }

            }catch{}
        }
    }

    return programas;
}

// ========================
// INCREMENTAL
// ========================
async function gerarXML(){

    console.log("🚀 EPG incremental");

    const cache = loadJSON(CACHE_FILE) || {};
    const canais = await extrairCanais();
    const m3uMap = await mapearM3U();

    let canaisXML="";
    let programasXML="";

    for(let canal of canais){

        const tvg =
            Object.keys(m3uMap).find(n=>similar(n,canal.nome.toLowerCase()))
            ? m3uMap[Object.keys(m3uMap).find(n=>similar(n,canal.nome.toLowerCase()))]
            : canal.id;

        canaisXML += `<channel id="${tvg}">
  <display-name lang="pt">${escapeXML(canal.nome)}</display-name>
</channel>\n`;

        // incremental
        if(cache[canal.id]){
            console.log("⚡ cache", canal.id);
            programasXML += cache[canal.id];
            continue;
        }

        const programas = await capturar(canal);

        const xml = programas.map(p=>`
<programme start="${p.start}" stop="${p.stop}" channel="${tvg}">
  <title lang="pt">${escapeXML(p.title)}</title>
  <desc lang="pt">${escapeXML(p.desc)}</desc>
</programme>`).join("");

        cache[canal.id]=xml;
        programasXML += xml;
    }

    saveJSON(CACHE_FILE,cache);

    const agora = new Date().toISOString();

    const xmlFinal = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG PRO MAX ${agora}">
${canaisXML}
${programasXML}
</tv>`;

    fs.writeFileSync("programacao.xml",xmlFinal);

    console.log("✅ EPG FULL GERADO");
}

// ========================
// AGENDAR
// ========================
function agendar(){
    const agora = new Date();
    const proxima = new Date();

    proxima.setHours(3,0,0,0);
    if(agora>=proxima) proxima.setDate(proxima.getDate()+1);

    setTimeout(async()=>{
        await gerarXML();
        agendar();
    },proxima-agora);
}

// ========================
// ROTAS
// ========================
app.get("/",(req,res)=>res.send("EPG PRO MAX 🚀"));

app.get("/programacao.xml",(req,res)=>{
    res.set("Content-Type","application/xml");
    res.sendFile(__dirname+"/programacao.xml");
});

// ========================
// START
// ========================
app.listen(PORT,async()=>{
    console.log("🔥 servidor online");

    await gerarXML();
    agendar();
});