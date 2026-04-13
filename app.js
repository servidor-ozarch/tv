app.get('/login', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Login</title>

<style>
body {
  background: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: Arial;
}

.box {
  width: 280px;
}

input, button {
  width: 100%;
  padding: 10px;
  margin: 5px 0;
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
  alert("Teste funcionando");
}
</script>

</body>
</html>
  `);
});
