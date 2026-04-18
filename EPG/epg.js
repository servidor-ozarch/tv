const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE = "https://tvinside.com.br/programacao_tv/";
const dias = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];

// ========================
// ESCAPE XML
// ========================
function escapeXML(str){
    return str
        ?.replace(/&/g,"&amp;")
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
    const pad = n => String(n).padStart(2,"0");

    return d.getFullYear()+
        pad(d.getMonth()+1)+
        pad(d.getDate())+
        pad(d.getHours())+
        pad(d.getMinutes())+
        pad(d.getSeconds())+
        " -0300";
}

// ========================
// SLUG (nome → tvg-id)
// ========================
function slug(str){
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/[^a-z0-9]/g,"");
}

// ========================
// EXTRAIR NOMES DO SITE
// ========================
async function extrairNomes(){

    try{
        const res = await fetch(BASE,{
            headers:{'User-Agent':'Mozilla/5.0'}
        });

        const html = await res.text();

        const dom = new JSDOM(html);
        const doc = dom.window.document;

        const textos = [...doc.querySelectorAll("a, span, div")]
            .map(el => el.textContent.trim())
            .filter(t => t.length > 2 && t.length < 30);

        return [...new Set(textos)];

    }catch{
        return [];
    }
}

// ========================
// GERAR CANDIDATOS (FALLBACK)
// ========================
function gerarFallback(){

    const letras = "abcdefghijklmnopqrstuvwxyz";
    let lista = [];

    for(let l of letras){
        lista.push(l);
    }

    lista.push(
        "gnt","hgtv","multishow",
        "sportv","sportv2","sportv3",
        "espn","espn2","espn3","espn4",
        "premiere","premiere2","premiere3","premiere4",
        "cartoonnetwork","discoverykids",
        "globo","sbt","record","band",
        "cnnbrasil","globonews","bandnews",
        "nick","nickjr","tlc","history"
    );

    return lista;
}

// ========================
// DESCOBRIR CANAIS (COMPLETO)
// ========================
async function descobrirCanais(){

    console.log("🔍 Descobrindo canais...");

    const dia = dias[new Date().getDay()];
    const encontrados = new Map();

    // 1️⃣ nomes reais
    const nomes = await extrairNomes();

    console.log(`📺 ${nomes.length} nomes encontrados`);

    await Promise.all(nomes.map(async nome=>{

        const id = slug(nome);
        if(!id || id.length < 3) return;

        try{
            const res = await fetch(`${BASE}${id}/${dia}`,{
                headers:{'User-Agent':'Mozilla/5.0'}
            });

            if(!res.ok) return;

            const html = await res.text();

            if(html.includes("registro programa_data")){
                console.log("✅", nome, "→", id);
                encontrados.set(id, nome);
            }

        }catch{}
    }));

    // 2️⃣ fallback brute force
    const fallback = gerarFallback();

    await Promise.all(fallback.map(async id=>{

        if(encontrados.has(id)) return;

        try{
            const res = await fetch(`${BASE}${id}/${dia}`,{
                headers:{'User-Agent':'Mozilla/5.0'}
            });

            if(!res.ok) return;

            const html = await res.text();

            if(html.includes("registro programa_data")){
                console.log("⚡ fallback:", id);
                encontrados.set(id, id.toUpperCase());
            }

        }catch{}
    }));

    const lista = [...encontrados.entries()].map(([id,nome])=>({id,nome}));

    console.log(`🎯 ${lista.length} canais válidos`);

    return lista;
}

// ========================
// PARSE HTML → XMLTV
// ========================
function parseGrade(html, canalId){

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const regs = [...doc.querySelectorAll('.registro.programa_data')];

    return regs.map(el=>{

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

        if(!titulo || !dti || !dtf) return "";

        let rating = "";
        if(classificacao || faixa){
            rating = `<rating system="Brazil">
    <value>${escapeXML((faixa||"") + (classificacao ? " | " + classificacao : ""))}</value>
  </rating>`;
        }

        return `<programme start="${formatXMLTV(dti)}" stop="${formatXMLTV(dtf)}" channel="${canalId}">
  <title lang="pt">${escapeXML(titulo)}</title>
  <desc lang="pt">${escapeXML(desc)}</desc>
  ${rating}
</programme>`;

    }).join("\n");
}

// ========================
// CAPTURAR CANAL
// ========================
async function capturar(canal, dia){

    try{
        const res = await fetch(`${BASE}${canal.id}/${dia}`,{
            headers:{'User-Agent':'Mozilla/5.0'}
        });

        if(!res.ok) return "";

        const html = await res.text();

        return parseGrade(html, canal.id);

    }catch{
        return "";
    }
}

// ========================
// GERAR XML FINAL
// ========================
async function gerarXML(){

    console.log("🚀 Gerando EPG...");

    const canais = await descobrirCanais();
    const dia = dias[new Date().getDay()];

    const resultados = await Promise.all(
        canais.map(c=>capturar(c,dia))
    );

    const canaisXML = canais.map(c=>`
<channel id="${c.id}">
  <display-name lang="pt">${escapeXML(c.nome)}</display-name>
</channel>`).join("\n");

    const agora = new Date().toISOString().replace("T"," ").split(".")[0];

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG FINAL - ${agora}">

${canaisXML}

${resultados.join("\n")}

</tv>`;

    fs.writeFileSync("programacao.xml", xml);

    console.log("✅ EPG FINAL GERADO");
}

// ========================
// AGENDAR 03:00
// ========================
function agendar(){

    const agora = new Date();
    const proxima = new Date();

    proxima.setHours(3,0,0,0);
    if(agora >= proxima) proxima.setDate(proxima.getDate()+1);

    const delay = proxima - agora;

    console.log(`⏰ Próxima atualização em ${Math.round(delay/1000)}s`);

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

app.get("/programacao.xml", (req,res)=>{
    res.set("Content-Type","application/xml; charset=utf-8");
    res.sendFile(__dirname + "/programacao.xml");
});

// ========================
// START
// ========================
app.listen(PORT, async ()=>{
    console.log(`🔥 Servidor rodando na porta ${PORT}`);

    await gerarXML();
    agendar();
});