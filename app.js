const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// URL do próprio serviço
const URL = process.env.RENDER_EXTERNAL_URL || 'https://tv-1-viha.onrender.com';

// Middleware de log (debug profissional)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Rota principal
app.get('/', (req, res) => {
  res.send('🚀 Servidor online!');
});

// 🔥 Função útil (API real)
app.get('/api/time', (req, res) => {
  res.json({
    agora: new Date(),
    timestamp: Date.now()
  });
});

// Função de ping
function ping() {
  axios.get(URL)
    .then(() => console.log('♻️ Ping OK'))
    .catch(() => console.log('⚠️ Falha no ping'));
}

// roda imediatamente
ping();

// depois a cada 5 minutos
setInterval(ping, 300000);

// inicia servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});