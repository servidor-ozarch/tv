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
// DESCOBRIR CANAIS (REAL)
// ========================
async function descobrirCanais(){

    console.log("🔍 Descobrindo canais...");

    const visitados = new Set();
    const encontrados = new Set();

    async function explorar(url){

        if(visitados.has(url)) return;
        visitados.add(url);

        try{
            const res = await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
            const html = await res.text();

            const dom = new JSDOM(html);
            const doc = dom.window.document;

            const links = [...doc.querySelectorAll("a")];

            for(let a of links){

                const href = a.getAttribute("href");
                if(!href) continue;

                if(href.startsWith("/programacao_tv/")){

                    const partes = href.split("/");
                    const id = partes[2];

                    if(id && id.length > 2 && !id.includes("segunda")){
                        encontrados.add(id);
                    }

                    const full = "https://tvinside.com.br" + href;

                    if(!visitados.has(full)){
                        await explorar(full);
                    }
                }
            }

        }catch(e){
            console.log("erro ao explorar");
        }
    }

    await explorar(BASE);

    const lista = [...encontrados].map(id => ({
        id,
        nome: id.toUpperCase()
    }));

    console.log(`✅ ${lista.length} canais encontrados`);

    return lista;
}

// ========================
// PARSE HTML
// ========================
function parseGrade(html, canalId){

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const regs = [...doc.querySelectorAll('.registro.programa_data')];

    return regs.map(el=>{

        const titulo = el.querySelector('.titulo')?.textContent?.trim();
        const desc = el.querySelector('.descricao_programa')?.textContent?.trim();

        const dti = el.getAttribute('dti');
        const dtf = el.getAttribute('dtf');

        if(!titulo || !dti || !dtf) return "";

        return `<programme start="${formatXMLTV(dti)}" stop="${formatXMLTV(dtf)}" channel="${canalId}">
  <title lang="pt">${escapeXML(titulo)}</title>
  <desc lang="pt">${escapeXML(desc || titulo)}</desc>
</programme>`;

    }).join("\n");
}

// ========================
// CAPTURAR CANAL
// ========================
async function capturar(canal, dia){

    try{
        const url = `${BASE}${canal.id}/${dia}`;

        const res = await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
        if(!res.ok) return "";

        const html = await res.text();

        return parseGrade(html, canal.id);

    }catch{
        return "";
    }
}

// ========================
// GERAR XML
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

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<tv>

${canaisXML}

${resultados.join("\n")}

</tv>`;

    fs.writeFileSync("programacao.xml", xml);

    console.log("✅ EPG COMPLETO GERADO");
}

// ========================
// ROTAS
// ========================
app.get("/", (req,res)=>{
    res.send("EPG ONLINE 🚀");
});

app.get("/programacao.xml", (req,res)=>{
    res.set("Content-Type","application/xml");
    res.sendFile(__dirname+"/programacao.xml");
});

// ========================
// START
// ========================
app.listen(PORT, async ()=>{
    console.log("🔥 Servidor ON");

    await gerarXML();
});
