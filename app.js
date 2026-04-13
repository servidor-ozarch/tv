const express = require('express');

const app = express();

// 🔥 PORTA (Render usa process.env.PORT)
const PORT = process.env.PORT || 3000;


// 🔹 ROTA HOME
app.get('/', (req, res) => {
  res.send('🚀 Servidor online!');
});


// 🔥 ROTA LOGIN (HTML SIMPLES)
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
  background: #ffffff;
  font-family: Arial, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

.box {
  width: 300px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
}

input {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  background: black;
  color: white;
  border: none;
}
</style>

</head>

<body>

<div class="box">
  <h2>Login</h2>

  <input id="user" placeholder="Usuário">
  <input id="pass" type="password" placeholder="Senha">

  <button onclick="login()">Entrar</button>
</div>

<script>
function login(){
  alert("Login funcionando!");
}
</script>

</body>
</html>
  `);
});


// 🔥 START SERVIDOR
app.listen(PORT, () => {
  console.log('🔥 Servidor rodando na porta ' + PORT);
});
