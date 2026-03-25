const express = require('express');
const app = express();

// --- CONFIGURAÇÃO DO DESTINO (SERRA-ES) ---
const DESTINO = {
    nome: "Pátio de Entrega - Serra",
    lat: -20.1255,
    lon: -40.3077
};

let ultimaPosicao = { lat: 0, lon: 0, status: "Aguardando GPS..." };

// Função para calcular distância (Haversine)
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// 1. PÁGINA PRINCIPAL: Captura o GPS do Navegador e envia pro servidor
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>GPS Tracker Logística</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial; text-align: center; padding: 20px; background: #f0f2f5; }
                .card { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                button { background: #007bff; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; }
                #status { margin-top: 20px; color: #555; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Transmissor de Carga</h2>
                <p>Clique abaixo para iniciar o rastreio da entrega.</p>
                <button onclick="iniciarRastreio()">ATIVAR GPS</button>
                <div id="status">Status: Pronto para iniciar</div>
            </div>

            <script>
                function iniciarRastreio() {
                    if ("geolocation" in navigator) {
                        document.getElementById('status').innerText = "Buscando satélites...";
                        
                        // Monitora a posição em tempo real
                        navigator.geolocation.watchPosition((pos) => {
                            const lat = pos.coords.latitude;
                            const lon = pos.coords.longitude;
                            
                            document.getElementById('status').innerText = "Enviando: " + lat.toFixed(4) + ", " + lon.toFixed(4);

                            // Envia para o seu servidor no Render
                            fetch('/rastreio?lat=' + lat + '&lon=' + lon)
                                .then(response => response.json())
                                .then(data => {
                                    document.getElementById('status').innerHTML = 
                                        "<b>Distância de Serra:</b> " + data.distancia_km + " km<br>" +
                                        "<b>Status:</b> " + data.msg;
                                });
                        }, (err) => {
                            alert("Erro ao acessar GPS: " + err.message);
                        }, { enableHighAccuracy: true });
                    } else {
                        alert("Seu navegador não suporta GPS.");
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// 2. ROTA DE API: Recebe os dados e processa a lógica de entrega
app.get('/rastreio', (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).send("Faltam coordenadas");

    const distancia = calcularDistancia(lat, lon, DESTINO.lat, DESTINO.lon);
    
    // Log no console do Render (O Bot rodando em segundo plano)
    console.log(`[BOT] Veículo a ${distancia.toFixed(2)}km de Serra. Hora: ${new Date().toLocaleTimeString()}`);

    let mensagem = "Em rota normal";
    if (distancia <= 0.5) mensagem = "CHEGANDO! Menos de 500m";
    else if (distancia <= 2.0) mensagem = "Próximo ao pátio (2km)";

    res.json({
        distancia_km: distancia.toFixed(2),
        msg: mensagem
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor de Rastreio Online!"));
