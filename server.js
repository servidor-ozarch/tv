const express = require('express');
const app = express();

// rota principal (corrige seu erro)
app.get('/', (req, res) => {
    res.send("API online 🚀");
});

// sua API
app.get('/api/eventos', (req, res) => {
    res.json({
        status: true,
        data: [
            { nome: "Flamengo x Palmeiras", hora: "16:00" }
        ]
    });
});

// porta dinâmica (Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando");
});
