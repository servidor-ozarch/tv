app.get('/stream', async (req, res) => {
    const canal = req.query.canal;

    if (!canal) {
        return res.status(400).send("Informe o canal");
    }

    try {
        // ================= 1. CARREGA PÁGINA =================
        const pageResponse = await axios.get(`${URL_BASE}/${canal}`, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "text/html",
                "Referer": URL_BASE
            },
            timeout: 15000
        });

        const html = pageResponse.data;

        // ================= 2. TENTA EXTRAIR ID =================
        let videoId = null;

        // método 1 (principal)
        let match = html.match(/data-id="([^"]+)"/);
        if (match) videoId = match[1];

        // método 2 (fallback)
        if (!videoId) {
            match = html.match(/source['"]?\s*:\s*['"]([^'"]+)['"]/);
            if (match) videoId = match[1];
        }

        // método 3 (fallback mais agressivo)
        if (!videoId) {
            match = html.match(/embed\/([a-zA-Z0-9]+)/);
            if (match) videoId = match[1];
        }

        if (!videoId) {
            console.log("❌ HTML não contém ID:", html.substring(0, 300));
            return res.status(404).send("ID não encontrado");
        }

        // ================= 3. CHAMA API INTERNA =================
        const apiUrl = `${URL_BASE}/api/source/${videoId}`;

        const apiResponse = await axios.post(apiUrl, {}, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": `${URL_BASE}/${canal}`,
                "Origin": URL_BASE,
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            timeout: 15000
        });

        const data = apiResponse.data;

        // ================= 4. PROCESSA RESPOSTA =================
        if (data && data.data && data.data.length > 0) {

            // tenta pegar melhor qualidade
            let stream = data.data.find(s => s.label === "auto") 
                      || data.data[0];

            if (stream && stream.file) {
                console.log("🎯 STREAM CAPTURADO:", canal);
                return res.send(stream.file);
            }
        }

        console.log("❌ API retornou vazio:", data);
        res.status(404).send("Stream não encontrado");

    } catch (err) {
        console.error("❌ ERRO COMPLETO:", err.response?.data || err.message);
        res.status(500).send("Erro interno");
    }
});
