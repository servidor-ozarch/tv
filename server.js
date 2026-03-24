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

// 📺 Gerar lista com nome específico
app.get('/teste-010203.m3u8', (req, res) => {
    let m3u = "#EXTM3U\n";

    canais.forEach(c => {
        m3u += `#EXTINF:-1,${c.nome}\n${c.url}\n`;
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u);
});

// ➕ adicionar canal
app.post('/add', (req, res) => {
    canais.push(req.body);
    res.json({ status: "ok" });
});

// 🟢 status
app.get('/', (req, res) => {
    res.send("API IPTV online 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
