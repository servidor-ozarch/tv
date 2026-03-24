const express = require('express');
const app = express();

app.get('/api/eventos', (req, res) => {
    res.json({
        status: true,
        data: [
            { nome: "Flamengo x Palmeiras", hora: "16:00" }
        ]
    });
});

// OBRIGATÓRIO no Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando");
});