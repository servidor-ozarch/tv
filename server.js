const express = require('express');
const app = express();

app.use(express.json());

let canal = {
    nome: "Aracati",
    url: "https://video04.logicahost.com.br/tvaracati/tvaracati/chunklist_w1451000580.m3u8",
    status: "AO_VIVO"
};

// 🟢 Status
app.get('/', (req, res) => {
    res.send("API online 🚀");
});

// 📺 Dados do canal
app.get('/api/canal', (req, res) => {
    res.json(canal);
});

// ▶️ ABRIR DIRETO O LINK
app.get('/api/play', (req, res) => {
    if (canal.status !== "AO_VIVO") {
        return res.send("Canal não disponível: " + canal.status);
    }

    res.redirect(canal.url);
});

// 🔄 Alterar status
app.get('/api/status/:status', (req, res) => {
    canal.status = req.params.status;

    res.json(canal);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
