const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Rota principal
app.get('/', (req, res) => {
  res.send('🚀 Servidor rodando com sucesso!');
});

// Rota de status (opcional, útil pra monitoramento)
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});

// Auto-ping a cada 14 minutos (840.000 ms)
setInterval(() => {
  axios.get('https://tv-5p23.onrender.com/')
    .then(() => console.log('♻️ Self-ping: Mantendo instância ativa'))
    .catch((err) => console.error('⚠️ Erro no self-ping:', err.message));
}, 840000);