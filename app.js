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

// 🔥 API COMPLETA (com horário do Brasil)
app.get('/api/time', (req, res) => {
  const now = new Date();

  // 🔥 força timezone Brasil
  const brTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );

  const dias = [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  const diaSemana = dias[brTime.getDay()];
  const data = brTime.toLocaleDateString('pt-BR');

  const hora = brTime.getHours().toString().padStart(2, '0') + 'h' +
               brTime.getMinutes().toString().padStart(2, '0');

  res.json({

    // 🔥 dados brutos
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

    // 🔥 formatado (como você queria)
    formatado: {
      dia_da_semana: diaSemana,
      data_atual: data,
      horario_atual: hora
    },

    // 🔥 servidor
    server: {
      uptime: process.uptime(),
      status: 'online'
    },

    // 🔥 request
    request: {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }

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
setInterval(ping, 300000);

// inicia servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});