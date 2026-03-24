const express = require('express');
const app = express();

app.use(express.json());

// 🎬 Lista de canais
let canais = [
    {
        nome: "Canal 1",
        url: "https://exemplo.com/stream1.m3u8"
    },
    {
        nome: "Canal 2",
        url: "https://exemplo.com/stream2.m3u8"
    }
];

// 📺 Gerar lista IPTV
app.get('/api/teste-010203.m3u8', (req, res) => {
    let m3u = "#EXTM3U\n";

    canais.forEach(c => {
        m3u += `#EXTINF:-1,${c.nome}\n${c.url}\n`;
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');

    res.send(m3u);
});

// ➕ adicionar canal
app.post('/add', (req, res) => {
    const { nome, url } = req.body;

    if (!nome || !url) {
        return res.json({
            status: "erro",
            msg: "nome e url são obrigatórios"
        });
    }

    canais.push({ nome, url });

    res.json({
        status: "ok",
        total: canais.length
    });
});

// 📺 listar canais (debug)
app.get('/canais', (req, res) => {
    res.json(canais);
});

// 🟢 status
app.get('/', (req, res) => {
    res.send("API IPTV online 🚀");
});

// 🚀 porta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando 🚀");
});
