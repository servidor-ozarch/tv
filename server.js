const http = require('http');
const axios = require('axios');

// Configurações
const APP_URL = 'https://tv-5p23.onrender.com';
const FIREBASE_URL = 'https://projeto-aplicativo-android-default-rtdb.firebaseio.com/consultas';

// --- LÓGICA DO SERVIDOR ---
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // Rota: /consultar?cpf=00000000000
    if (req.url.startsWith('/consultar')) {
        const urlParams = new URL(req.url, `${APP_URL}`);
        const cpf = urlParams.searchParams.get('cpf');

        if (!cpf) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ erro: "CPF não informado." }));
        }

        const cpfLimpo = cpf.replace(/\D/g, '');

        try {
            // Dados minimalistas para não estourar a RAM
            const dados = {
                cpf: cpfLimpo,
                processado: true,
                timestamp: Date.now()
            };

            // Envio para o Firebase
            await axios.put(`${FIREBASE_URL}/${cpfLimpo}.json`, dados);

            res.statusCode = 200;
            return res.end(JSON.stringify({ status: "sucesso", cpf: cpfLimpo }));
        } catch (error) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ erro: "Erro no Firebase", msg: error.message }));
        }
    }

    // Rota Raiz (Monitoramento)
    res.statusCode = 200;
    res.end(JSON.stringify({ status: "Online", ram_limite: "512MB" }));
});

// --- SISTEMA DE SELF-PING (Evita Sleep do Render) ---
// Executa a cada 14 minutos (840.000 ms)
setInterval(() => {
    axios.get(APP_URL)
        .then(() => console.log('♻️ Self-ping: Mantendo instância ativa'))
        .catch((err) => console.error('⚠️ Erro no self-ping:', err.message));
}, 840000);

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🔗 Link de consulta: ${APP_URL}/consultar?cpf=...`);
});
