const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE = "https://tvinside.com.br/programacao_tv/";
const dias = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"];

let CACHE = {
    canais: [],
    programas: {}
};

// ========================
// XML SAFE
// ========================
function escapeXML(str){
    return str?.replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&apos;") || "";
}

// ========================
// DATA XMLTV
// ========================
function formatXMLTV(dateStr){
    const d = new Date(dateStr.replace(" ","T"));
    const pad = n=>String(n).padStart(2,"0");

    return d.getFullYear()+
        pad(d.getMonth()+1)+
        pad(d.getDate())+
        pad(d.getHours())+
        pad(d.getMinutes())+
        pad(d.getSeconds())+
        " -0300";
}

// ========================
// DESCOBRIR CANAIS REAL
// ========================
async function descobrirCanais(){

    console.log("🔍 descoberta real...");

    const seeds = ["gnt","hgtv","multishow"]; // apenas ponto de entrada

    let canaisMap = {};

    await Promise.all(seeds.map(async seed => {

        try{
            const url = `${BASE}${seed}/segunda`;

            const res = await fetch(url,{
                headers:{'User-Agent':'Mozilla/5.0'}
            });

            const html = await res.text();

            const dom = new JSDOM(html);
            const doc = dom.window.document;

            const eventos = [...doc.querySelectorAll(".evento_box.programa_data")];

            eventos.forEach(el => {

                const hash = el.getAttribute("data-canal");
                const nome = seed;

                if(hash && !canaisMap[hash]){
                    canaisMap[hash] = {
                        id: hash,
                        nome: nome.toUpperCase()
                    };
                }
            });

        }catch{}
    }));

    const canais = Object.values(canaisMap);

    console.log(`🎯 ${canais.length} canais descobertos`);

    CACHE.canais = canais;

    return canais;
}

// ========================
// PARSE PROGRAMAÇÃO
// ========================
function parseGrade(html, canalId){

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const eventos = [...doc.querySelectorAll('.evento_box.programa_data')];

    let programas = [];

    eventos.forEach((el, i)=>{

        const titulo = el.querySelector('.titulo')?.textContent?.trim();
        const timeEl = el.querySelector('time');

        if(!titulo || !timeEl) return;

        const inicio = new Date(timeEl.getAttribute("datetime").replace(" ","T"));

        let fim;

        if(eventos[i+1]){
            const prox = eventos[i+1].querySelector('time')?.getAttribute("datetime");
            if(prox){
                fim = new Date(prox.replace(" ","T"));
            }
        }

        if(!fim){
            fim = new Date(inicio.getTime()+3600000);
        }

        programas.push({
            start: formatXMLTV(inicio.toISOString().replace("T"," ").substring(0,19)),
            stop: formatXMLTV(fim.toISOString().replace("T"," ").substring(0,19)),
            title: titulo,
            desc: titulo
        });

    });

    return programas;
}

// ========================
// CAPTURAR MULTI DIA
// ========================
async function capturarMultiDia(canal){

    let todos = [];

    for(let i=0;i<2;i++){ // 48h
        const dia = dias[(new Date().getDay()+i)%7];

        try{
            const url = `${BASE}${canal.nome.toLowerCase()}/${dia}`;

            const res = await fetch(url,{
                headers:{'User-Agent':'Mozilla/5.0'}
            });

            const html = await res.text();

            const lista = parseGrade(html, canal.id);

            todos.push(...lista);

        }catch{}
    }

    CACHE.programas[canal.id] = todos;

    return todos;
}

// ========================
// GERAR XML
// ========================
async function gerarXML(){

    console.log("🚀 gerando epg...");

    if(!CACHE.canais.length){
        await descobrirCanais();
    }

    let xmlCanais = CACHE.canais.map(c=>`
<channel id="${c.id}">
  <display-name lang="pt">${escapeXML(c.nome)}</display-name>
</channel>`).join("");

    let xmlProg = "";

    for(let c of CACHE.canais){

        const lista = await capturarMultiDia(c);

        lista.forEach(p=>{
            xmlProg += `
<programme start="${p.start}" stop="${p.stop}" channel="${c.id}">
  <title lang="pt">${escapeXML(p.title)}</title>
  <desc lang="pt">${escapeXML(p.desc)}</desc>
</programme>`;
        });
    }

    const agora = new Date().toISOString().replace("T"," ").split(".")[0];

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG AUTO ${agora}">

${xmlCanais}

${xmlProg}

</tv>`;

    fs.writeFileSync("programacao.xml", xml);

    console.log("✅ EPG GERADO");
}

// ========================
// ROTAS
// ========================
app.get("/programacao.xml",(req,res)=>{
    res.set("Content-Type","application/xml");
    res.sendFile(__dirname+"/programacao.xml");
});

// ========================
// START
// ========================
app.listen(PORT, async ()=>{

    console.log("🔥 servidor online");

    await gerarXML();

    setInterval(gerarXML, 1000*60*60*24); // 24h
});