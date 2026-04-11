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

// 🔥 API COMPLETA (tudo em um)
app.get('/api/time', (req, res) => {
  const now = new Date();

  const dias = [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  const diaSemana = dias[now.getDay()];
  const data = now.toLocaleDateString('pt-BR');
  const hora = now.getHours().toString().padStart(2, '0') + 'h' +
               now.getMinutes().toString().padStart(2, '0');

  res.json({

    // 🔥 dados brutos
    raw: {
      timestamp: Date.now(),
      iso: now.toISOString(),

      date: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate()
      },

      time: {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds()
      },

      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: now.getTimezoneOffset()
    },

    // 🔥 formatado
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

// 🔥 Função de ping (mantém servidor ativo)
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