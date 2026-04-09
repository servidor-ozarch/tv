app.get('/stream', async (req, res) => {
    const canal = req.query.canal;

    if (!canal) {
        return res.status(400).send("Informe o canal");
    }

    try {
        // ================= 1. PÁGINA PRINCIPAL =================
        const mainResponse = await axios.get(`${URL_BASE}/${canal}`, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "text/html",
                "Referer": URL_BASE
            },
            timeout: 10000
        });

        const html = mainResponse.data;

        // ================= 2. TENTA PEGAR data-id =================
        let videoId = null;
        const idMatch = html.match(/data-id="([^"]+)"/);

        if (idMatch) {
            videoId = idMatch[1];
        }

        // ================= 3. FALLBACK: PEGAR IFRAME =================
        if (!videoId) {
            const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/);

            if (iframeMatch) {
                const iframeUrl = iframeMatch[1];

                const iframeResponse = await axios.get(iframeUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Referer": `${URL_BASE}/${canal}`
                    },
                    timeout: 10000
                });

                const iframeHtml = iframeResponse.data;

                const iframeIdMatch = iframeHtml.match(/data-id="([^"]+)"/);

                if (iframeIdMatch) {
                    videoId = iframeIdMatch[1];
                }
            }
        }

        // ================= 4. SE NÃO ACHOU ID =================
        if (!videoId) {
            return res.status(404).send("ID não encontrado");
        }

        // ================= 5. CHAMA API REAL =================
        const apiUrl = `https://www4.embedtv.best/api/source/${videoId}`;

        const apiResponse = await axios.post(apiUrl, {}, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": `${URL_BASE}/${canal}`,
                "Origin": "https://www4.embedtv.best",
                "Content-Type": "application/json"
            },
            timeout: 10000
        });

        const data = apiResponse.data;

        // ================= 6. EXTRAI STREAM =================
        if (data && data.data && data.data.length > 0) {
            const stream = data.data[0].file;

            if (stream && stream.includes(".m3u8")) {
                console.log("🎯 STREAM CAPTURADO:", canal);
                return res.send(stream);
            }
        }

        // ================= 7. FALLBACK FINAL =================
        return res.status(404).send("Stream não encontrado");

    } catch (err) {
        console.error("❌ ERRO COMPLETO:", err.message);
        return res.status(500).send("Erro interno");
    }
});
