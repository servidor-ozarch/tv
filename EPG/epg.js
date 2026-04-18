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
// FORMATAR DATA XMLTV
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
// GERAR CANDIDATOS (BRUTE FORCE)
// ========================
function gerarCandidatos(){

    const letras = "abcdefghijklmnopqrstuvwxyz";

    let candidatos = [];

    // letras simples
    for(let l of letras){
        candidatos.push(l);
    }

    // palavras comuns IPTV
    candidatos.push(
        "gnt","hbo","hbo2","hbo3",
        "telecine","telecinepremium",
        "sportv","sportv2","sportv3",
        "espn","espn2","espn3","espn4",
        "premiere","premiere2","premiere3","premiere4",
        "cartoonnetwork","discoverykids",
        "globo","sbt","record","band",
        "cnnbrasil","globonews","bandnews",
        "nick","nickjr","discovery","tlc","history"
    );

    // remove duplicados
    return [...new Set(candidatos)];
}

// ========================
// DESCOBRIR CANAIS (VALIDAÇÃO REAL)
// ========================
async function descobrirCanais(){

    console.log("🔍 Descobrindo canais...");

    const candidatos = gerarCandidatos();
    const dia = dias[new Date().getDay()];

    const encontrados = [];

    await Promise.all(candidatos.map(async (id)=>{

        try{
            const url = `${BASE}${id}/${dia}`;

            const res = await fetch(url,{
                headers:{'User-Agent':'Mozilla/5.0'}
            });

            if(!res.ok) return;

            const html = await res.text();

            // valida se existe programação real
            if(html.includes("registro programa_data")){
                console.log("✅", id);

                encontrados.push({
                    id,
                    nome: id.toUpperCase()
                });
            }

        }catch{}
    }));

    console.log(`🎯 ${encontrados.length} canais válidos`);

    return encontrados;
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
        const url = `${BASE}${canal.id}/${dia}`;

        const res = await fetch(url,{
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
// GERAR XML COMPLETO
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
  <display-name lang="pt">${c.nome}</display-name>
</channel>`).join("\n");

    const agora = new Date().toISOString().replace("T"," ").split(".")[0];

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv generator-info-name="EPG AUTO - ${agora}">

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

    await gerarXML(); // gera ao iniciar
    agendar();        // agenda 03:00
});