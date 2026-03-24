let acessos = 0;

app.get('/api/acessos', (req, res) => {
    acessos++;
    res.json({ total: acessos });
});
