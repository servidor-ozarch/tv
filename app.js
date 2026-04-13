const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const URL = process.env.RENDER_EXTERNAL_URL || 'https://tv-1-viha.onrender.com';

// 🔹 Middleware de log
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// 🔹 Rota principal
app.get('/', (req, res) => {
  res.send('🚀 Servidor online!');
});


// 🔥 API TIME (SEM horario_atual)
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

      timezone: 'America/Sao_Paulo'
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


// 🔥 SSE - TEMPO REAL
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

    // evita envio duplicado
    if (horario !== lastTime) {
      lastTime = horario;
      res.write(`data: ${horario}\n\n`);
    }

  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});


// 🔥 HTML - RELÓGIO EM TEMPO REAL
app.get('/clock', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relógio</title>

      <style>
        body {
          background: #0f172a;
          color: #00ffcc;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          font-family: Arial, sans-serif;
        }

        #clock {
          font-size: 70px;
          font-weight: bold;
        }

        #status {
          margin-top: 10px;
          font-size: 14px;
          color: #aaa;
        }
      </style>
    </head>

    <body>

      <div id="clock">--:--:--</div>
      <div id="status">Conectando...</div>

      <script>
        const clock = document.getElementById('clock');
        const status = document.getElementById('status');

        let evtSource;

        function connect() {

          evtSource = new EventSource('/api/time/stream');

          evtSource.onopen = () => {
            status.innerText = "🟢 Conectado";
          };

          evtSource.onmessage = (event) => {
            // 🔥 ATUALIZA SEM CRIAR NOVA LINHA
            clock.innerText = event.data;
          };

          evtSource.onerror = () => {
            status.innerText = "🔴 Reconectando...";

            evtSource.close();

            setTimeout(() => {
              connect();
            }, 3000);
          };
        }

        connect();
      </script>

    </body>
    </html>
  `);
});


// 🔥 FUNÇÃO DE PING
function ping() {
  axios.get(URL)
    .then(() => console.log('♻️ Ping OK'))
    .catch(() => console.log('⚠️ Falha no ping'));
}

// roda imediatamente
ping();

// 🔥 a cada 1 minuto
setInterval(ping, 60000);


// 🔥 INICIA SERVIDOR
app.listen(PORT, () => {
  console.log(\`🔥 Servidor rodando na porta \${PORT}\`);
});
