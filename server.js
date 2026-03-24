const express = require('express');
const app = express();

// 🔢 contador global
let contador = 0;

// ⏱️ começa a contar automaticamente
setInterval(() => {
    if (contador < 1000000000) {
        contador++;
    }
}, 1); // 1ms (ajustamos depois)

// 🟢 status
app.get('/', (req, res) => {
    res.send("API online 🚀");
});

// 📊 ver contador
app.get('/api/contador', (req, res) => {
    res.json({
        contador: contador
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Contador iniciado 🚀");
});
