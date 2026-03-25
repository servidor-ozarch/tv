const express = require('express');
const https = require('https');

const app = express();

// Configurações e Base
const BASE_URL = "https://www.cxtv.com.br/tv-ao-vivo/";
const PORT = process.env.PORT || 3000;

// 🔧 Função de Requisição com Log de Status
function getHTML(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.cxtv.com.br/",
            },
            timeout: 8000
        };

        console.log(`🌐 [HTTP GET] Solicitando: ${url}`);

        https.get(url, options, (res) => {
            const { statusCode } = res;
            console.log(`📡 [HTTP RES] Status: ${statusCode} para ${url}`);

            if (statusCode !== 200) {
                console.error(`⚠️ Falha na requisição. Código: ${statusCode}`);
            }

            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));

        }).on("error", (err) => {
            console.error(`❌ [ERRO DE REDE] ${err.message}`);
            reject(err);
        });
    });
}

// 🔍 Extração com Log de Regex
function extrairM3U8(html) {
    const regex = /https?[:\/\\]+[^"' ]+\.m3u8[^"' ]*/gi;
    const matches = html.match(regex);
    
    if (matches) {
        const linkLimpo = matches[0].replace(/\\/g, '');
        console.log(`✨ [M3U8 ENCONTRADO] Link: ${linkLimpo}`);
        return linkLimpo;
    }
    return null;
}

// 🔍 Extração de Links com Log de Quantidade
function extrairLinks(html) {
    const links = new Set();
    const regex = /(https?:\/\/[^"' ]+)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        const url = match[0];
        if (url.includes("embed") || url.includes("player") || url.includes(".php") || url.includes("clictv")) {
            links.add(url);
        }
    }
    const lista = Array.from(links);
    console.log(`🔗 [LINKS INTERNOS] Encontrados ${lista.length} links para análise.`);
    return lista;
}

// 🔄 Busca Profunda Recursiva
async function buscarStreamProfundo(url, nivel = 0) {
    if (nivel > 3) {
        console.log(`🛑 [LIMITE] Nível máximo atingido para: ${url}`);
        return null;
    }

    try {
        const html = await getHTML(url);
        
        // Tenta achar o m3u8 nesta página
        const m3u8 = extrairM3U8(html);
        if (m3u8) return m3u8;

        // Se não achou, vai para os links internos
        const linksInternos = extrairLinks(html);
        for (let link de linksInternos) {
            const resultado = await buscarStreamProfundo(link, nivel + 1);
            if (resultado) return resultado;
        }

    } catch (e) {
        console.error(`💥 [ERRO NO NÍVEL ${nivel}] ${e.message}`);
    }
    return null;
}

// 🚀 ROTA PRINCIPAL (LOG DE ENTRADA)
app.get('/live/chucks.m3u8', async (req, res) => {
    const canalId = req.query.canal;

    console.log("--- NOVA REQUISIÇÃO ---");
    console.log(`📅 Data/Hora: ${new Date().toISOString()}`);
    console.log(`🎯 Canal solicitado: ${canalId}`);

    if (!canalId) {
        console.warn("⚠️ Requisição sem parâmetro 'canal'");
        return res.status(400).send("Erro: Use ?canal=nome-do-canal");
    }

    const urlInicial = BASE_URL + canalId;
    const linkFinal = await buscarStreamProfundo(urlInicial);

    if (linkFinal) {
        console.log(`✅ [SUCESSO] Redirecionando para stream final.`);
        return res.redirect(302, linkFinal);
    } else {
        console.error(`❌ [FALHA] Não foi possível encontrar stream para: ${canalId}`);
        res.status(404).send("Stream não encontrado nos logs ❌");
    }
});

// 🏠 Rota de Status (Para verificar se o server subiu)
app.get('/', (req, res) => {
    console.log("🏠 Acesso à rota raiz");
    res.send("Servidor Ativo 🚀 - Use a rota /live/chucks.m3u8?canal=...");
});

// 🚫 MiddleWare para capturar 404 (Rota Errada)
app.use((req, res) => {
    console.error(`🚫 [404] O usuário tentou acessar: ${req.url}`);
    res.status(404).send("Rota não encontrada ❌ Verifique a URL digitada.");
});

app.listen(PORT, () => {
    console.log(`
    #########################################
    🔥 SERVER LOGS ATIVOS
    🚀 Porta: ${PORT}
    📡 Rota: /live/chucks.m3u8
    #########################################
    `);
});
