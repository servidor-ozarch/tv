const express = require('express');
const app = express();

app.use(express.json());

let usuarios = [];

// middleware
app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

// rotas
app.get('/', (req, res) => {
    res.send("API online");
});

app.get('/api/usuarios', (req, res) => {
    res.json(usuarios);
});

app.post('/api/usuarios', (req, res) => {
    usuarios.push(req.body);
    res.json({ status: "criado" });
});

app.delete('/api/usuarios/:id', (req, res) => {
    usuarios.splice(req.params.id, 1);
    res.json({ status: "removido" });
});

app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;

    if (user === "admin" && pass === "123") {
        res.json({ status: "ok" });
    } else {
        res.status(401).json({ erro: true });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
