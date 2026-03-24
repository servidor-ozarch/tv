const express = require('express');
const app = express();

console.log("🔥 SERVER CERTO RODANDO");

app.use(express.json());

// 🎬 canal dinâmico
let canal = {
    nome: "Aracati",
    url: "https://www.cxtv.com.br/tv-ao-vivo/tv-aracati-hd" // pode trocar depois
};

// 📺 ROTA PRINCIPAL (SUA LISTA)
app.get('/api/lista-top.m3u8', (req, res) => {
    let m3u = "#EXTM3U\n";

    if (canal.url) {
        m3u += `#EXTINF:-1,${canal.nome}\n${canal.url}\n`;
    } else {
        m3u += `#EXTINF:-1,${canal.nome}\n# sem stream\n`;
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');

    res.send(m3u);
});

// 🔄 atualizar link manualmente
app.post('/api/update', (req, res) => {
    const { url } = req.body;

    if (!url || !url.includes('.m3u8')) {
        return res.json({
            status: "erro",
            msg: "link inválido"
        });
    }

    canal.url = url;

    res.json({
        status: "ok",
        canal
    });
});

// 🧪 TESTE SIMPLES
app.get('/teste', (req, res) => {
    res.send("OK FUNCIONANDO");
});

// 🟢 STATUS
app.get('/', (req, res) => {
    res.send("API IPTV online 🚀");
});

// 🚫 FALLBACK (evita Cannot GET)
app.use((req, res) => {
    res.status(404).send("Rota não encontrada ❌");
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});
