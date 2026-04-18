const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

// =============================
// CONFIG
// =============================
const CONCURRENCY = 5; // quantidade de requisições simultâneas
const PING_INTERVAL = 5000;

// =============================
// CANAIS
// =============================
const canais = [
    { id: 'gnt', nome: 'GNT' },
    { id: 'hgtv', nome: 'HGTV' },
    { id: 'off', nome: 'Canal OFF' },
    { id: 'mtv', nome: 'MTV' },
    { id: 'multishow', nome: 'Multishow' },
    { id: 'cartoon', nome: 'Cartoon Network' },
    { id: 'discoverykids', nome: 'Discovery Kids' },
    { id: 'sportv', nome: 'SPORTV' },
    { id: 'espn', nome: 'ESPN' },
    // continua sua lista...
];

// =============================
// FETCH COM HEADER (ANTI BLOQUEIO)
// =============================
async function fetchHTML() {
    const res = await fetch("https://tvinside.com.br/programacao_tv/", {
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/html"
        }
    });

    return await res.text();
}

// =============================
// CAPTURA INDIVIDUAL
// =============================
async function capturar(canal, html) {
    try {
        console.log(`📡 ${canal.nome}`);

        const dom = new JSDOM(html);

        // SUA LÓGICA REAL AQUI
        return `<programme channel="${canal.id}" start="20260418000000 -0300">
                    <title>${canal.nome}</title>
                </programme>`;

    } catch (e) {
        console.log(`❌ ${canal.nome}`);
        return "";
    }
}

// =============================
// POOL DE CONCORRÊNCIA (ESSENCIAL)
// =============================
async function processarEmLotes(lista, limite, handler, html) {
    const resultados = [];
    let index = 0;

    async function worker() {
        while (index < lista.length) {
            const atual = index++;
            resultados[atual] = await handler(lista[atual], html);
        }
    }

    const workers = [];
    for (let i = 0; i < limite; i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
    return resultados;
}

// =============================
// GERAR XML (PARALELO CONTROLADO)
// =============================
async function gerarXML() {
    console.log("🚀 Gerando EPG...");

    const html = await fetchHTML(); // UMA REQUISIÇÃO só

    const programas = await processarEmLotes(
        canais,
        CONCURRENCY,
        capturar,
        html
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
${programas.join("\n")}
</tv>`;

    fs.writeFileSync("programacao.xml", xml);

    console.log("✅ EPG atualizado!");
}

// =============================
// AGENDAR 03:00 EXATO
// =============================
function agendarEPG() {
    const agora = new Date();

    const proxima = new Date();
    proxima.setHours(3, 0, 0, 0);

    if (agora >= proxima) {
        proxima.setDate(proxima.getDate() + 1);
    }

    const delay = proxima - agora;

    console.log(`⏰ Próxima atualização em ${Math.round(delay / 1000)}s`);

    setTimeout(async () => {
        await gerarXML();
        agendarEPG(); // loop diário perfeito
    }, delay);
}

// =============================
// PING INTERNO (LEVE)
// =============================
setInterval(() => {
    console.log("🏓 ping...");
}, PING_INTERVAL);

// =============================
// ROTAS
// =============================
app.get("/", (req, res) => {
    res.send("EPG ONLINE 🚀");
});

app.get("/epg.xml", (req, res) => {
    res.sendFile(__dirname + "/programacao.xml");
});

// =============================
// START
// =============================
app.listen(PORT, async () => {
    console.log(`🔥 Rodando na porta ${PORT}`);

    await gerarXML(); // primeira execução
    agendarEPG();    // agenda automático
});
