const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const URL_BASE = "https://www4.embedtv.best";

// ================= CACHE =================
const cache = {};
const CACHE_TTL = 1000 * 60 * 10;

// ================= LISTA =================
const canais = [
    { nome: "Cinemax", canal: "cinemax", categoria: "Filmes" },
    { nome: "HBO", canal: "hbo", categoria: "Filmes" },
    { nome: "SBT", canal: "sbt", categoria: "TV Aberta" }
];

// ================= API =================
app.get('/canais', (req, res) => {
    res.json({
        status: "online",
        canais: canais.map((c, i) => ({
            id: i + 1,
            nome: c.nome,
            categoria: c.categoria,
            stream: `/stream?canal=${c.canal}`
        }))
    });
});

// ================= STREAM (SEM PUPPETEER) =================
app.get('/stream', async (req, res) => {
    const canal = req.query.canal;

    if (!canal) {
        return res.status(400).send("Informe o canal");
    }

    // CACHE
    if (cache[canal] && Date.now() - cache[canal].time < CACHE_TTL) {
        console.log("CACHE:", canal);
        return res.send(cache[canal].url);
    }

    try {
        const response = await axios.get(`${URL_BASE}/${canal}`, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": URL_BASE
            },
            timeout: 15000
        });

        const html = response.data;

        // 🔍 Extrair .m3u8 direto do HTML
        const match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);

        if (match) {
            const streamUrl = match[0];

            cache[canal] = {
                url: streamUrl,
                time: Date.now()
            };

            console.log("CAPTURADO:", canal);
            return res.send(streamUrl);
        }

        res.status(404).send("Stream não encontrado");

    } catch (err) {
        console.error("ERRO:", err.message);
        res.status(500).send("Erro interno");
    }
});

// ================= STATUS =================
app.get('/', (req, res) => {
    res.send("Servidor ONLINE 🚀");
});

app.listen(PORT, () => {
    console.log(`Rodando na porta ${PORT}`);
});
