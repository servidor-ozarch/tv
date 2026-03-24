const express = require('express');
const app = express();

app.use(express.json());

// ⏱️ momento inicial
let inicio = Date.now();

// 🟢 status
app.get('/', (req, res) => {
    res.send("API online 🚀");
});

// 📊 contador em segundos
app.get('/api/contador', (req, res) => {
    const segundos = Math.floor((Date.now() - inicio) / 1000);

    const s = segundos % 60;
    const m = Math.floor(segundos / 60) % 60;
    const h = Math.floor(segundos / 3600);

    res.json({
        segundos: segundos,
        formatado: `${h}:${m}:${s}`
    });
});

// 🔄 resetar contador
app.get('/api/reset', (req, res) => {
    inicio = Date.now();

    res.json({
        status: "resetado"
    });
});

// 🌐 página ao vivo
app.get('/live', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Contador</title>
            </head>
            <body style="font-family: Arial; text-align:center; margin-top:50px;">
                <h1>Contador em Tempo Real</h1>
                <h2 id="c">0</h2>

                <script>
                    setInterval(() => {
                        fetch('/api/contador')
                        .then(r => r.json())
                        .then(d => {
                            document.getElementById('c').innerText = d.formatado;
                        });
                    }, 1000);
                </script>
            </body>
        </html>
    `);
});

// 🚀 porta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando 🚀");
});
