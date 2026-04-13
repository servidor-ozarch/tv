app.get('/login', (req, res) => {
  res.send(`
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

.container {
  width: 300px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0,0,0,0.05);
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  width: 100%;
  padding: 10px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background: #333;
}

#msg {
  text-align: center;
  margin-top: 10px;
  color: red;
}
</style>

</head>

<body>

<div class="container">
  <h2>Login</h2>

  <input type="text" id="user" placeholder="Usuário">
  <input type="password" id="pass" placeholder="Senha">

  <button onclick="login()">Entrar</button>

  <div id="msg"></div>
</div>

<script>
function login() {
  const user = document.getElementById('user').value;
  const pass = document.getElementById('pass').value;

  if(user === 'admin' && pass === '1234') {
    document.getElementById('msg').style.color = 'green';
    document.getElementById('msg').innerText = 'Login realizado!';
  } else {
    document.getElementById('msg').innerText = 'Usuário ou senha inválidos';
  }
}
</script>

</body>
</html>
  `);
});
