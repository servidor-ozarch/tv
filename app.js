const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// URL do próprio serviço
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

  const diaSemana = dias[brTime.getDay()];
  const data = brTime.toLocaleDateString('pt-BR');

  res.json({
    raw: {
      timestamp: Date.now(),
      iso_utc: now.toISOString(),
      iso_br: brTime.toISOString(),

      date: {
        year: brTime.getFullYear(),
        month: brTime.getMonth() + 1,
        day: brTime.getDate()
      },

      time: {
        hours: brTime.getHours(),
        minutes: brTime.getMinutes(),
        seconds: brTime.getSeconds()
      },

      timezone: 'America/Sao_Paulo',
      offset: brTime.getTimezoneOffset()
    },

    formatado: {
      dia_da_semana: diaSemana,
      data_atual: data
      // ❌ removido horario_atual
    },

    server: {
      uptime: process.uptime(),
      status: 'online'
    },

    request: {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  });
});


// 🔥 SSE - TEMPO EM TEMPO REAL
app.get('/api/time/stream', (req, res) => {

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {

    const now = new Date();

    const brTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
    );

    const data = {
      hours: brTime.getHours(),
      minutes: brTime.getMinutes(),
      seconds: brTime.getSeconds()
    };

    res.write(`data: ${JSON.stringify(data)}\n\n`);

  }, 1000); // 🔥 atualiza a cada 1 segundo

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

// 🔥 a cada 5 minutos
setInterval(ping, 5000);

// inicia servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});
