const express = require('express');

const app = express();

// 🔥 PORTA (Render usa process.env.PORT)
const PORT = process.env.PORT || 3000;


// 🔹 ROTA HOME
app.get('/login', (req, res) => {
  res.setHeader('Content-Type', 'text/html');

  res.end(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Login</title>

<style>
body {
  margin: 0;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

/* Canvas fundo */
canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
}

/* Box login */
.container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,0.9);
  padding: 25px;
  border-radius: 12px;
  width: 280px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

input {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 15px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background: #333;
}
</style>

</head>

<body>

<canvas id="bg"></canvas>

<div class="container">
  <h2>Login</h2>

  <input placeholder="Usuário">
  <input type="password" placeholder="Senha">

  <button onclick="login()">Entrar</button>
</div>

<script>
// 🔥 CANVAS ANIMADO
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];

for (let i = 0; i < 60; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: Math.random() * 1,
    vy: Math.random() * 1,
    size: Math.random() * 2
  });
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x > canvas.width) p.x = 0;
    if (p.y > canvas.height) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
  });

  requestAnimationFrame(animate);
}

animate();

// 🔥 BOTÃO LOGIN
function login() {
  alert("Layout moderno funcionando 🚀");
}

// 🔄 RESPONSIVO
window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
</script>

</body>
</html>
  `);
});


// 🔥 START SERVIDOR
app.listen(PORT, () => {
  console.log('🔥 Servidor rodando na porta ' + PORT);
});
