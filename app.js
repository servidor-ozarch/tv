const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const URL = process.env.RENDER_EXTERNAL_URL || 'https://tv-1-viha.onrender.com';

// Middleware de log
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// 🔹 Rota principal
app.get('/', (req, res) => {
  res.send('🚀 Servidor online!');
});

// 🔥 API SEM horario_atual
app.get('/api/time', (req, res) => {
  const now = new Date();

  const brTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );

  const dias = [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  res.json({
    raw: {
      timestamp: Date.now(),
      iso_utc: now.toISOString(),
      iso_br: brTime.toISOString(),
    },
    formatado: {
      dia_da_semana: dias[brTime.getDay()],
      data_atual: brTime.toLocaleDateString('pt-BR')
    },
    server: {
      uptime: process.uptime(),
      status: 'online'
    }
  });
});


// 🔥 STREAM OTIMIZADO (1 EVENTO LIMPO POR VEZ)
app.get('/api/time/stream', (req, res) => {

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let lastTime = "";

  const interval = setInterval(() => {

    const now = new Date();

    const brTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
    );

    const hora = String(brTime.getHours()).padStart(2, '0');
    const minuto = String(brTime.getMinutes()).padStart(2, '0');
    const segundo = String(brTime.getSeconds()).padStart(2, '0');

    const horario = `${hora}:${minuto}:${segundo}`;

    // 🔥 evita envio duplicado (mais limpo)
    if (horario !== lastTime) {
      lastTime = horario;

      // 🔥 envia como evento único
      res.write(`data: ${horario}\r\n\r\n`);
    }

  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});


// 🔥 Função de ping
function ping() {
  axios.get(URL)
    .then(() => console.log('♻️ Ping OK'))
    .catch(() => console.log('⚠️ Falha no ping'));
}

// roda imediatamente
ping();

// 🔥 1 minuto
setInterval(ping, 60000);

// inicia servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});
