/**
 * BOT DE MONITORAMENTO LOGÍSTICO (GEOFENCING)
 * Versão: 1.0 (Completa para Testes)
 */

const http = require('http'); // Usado apenas para manter o processo ativo se necessário

// CONFIGURAÇÕES DO MONITORAMENTO
const CONFIG = {
    DESTINO: { 
        nome: "Armazém Central - Serra (ES)",
        lat: -20.1255, 
        lon: -40.3077 
    },
    RAIO_ALERTA_KM: 0.8, // Alerta quando estiver a 800 metros
    INTERVALO_CHECK: 3000, // Checa a cada 3 segundos (para teste rápido)
    SIMULAR_MOVIMENTO: true
};

// SIMULAÇÃO DE GPS (Substitua por uma chamada de API no futuro)
let veiculoAtual = {
    placa: "ABC-1234",
    lat: -20.1400, // Começa um pouco afastado
    lon: -40.3077,
    emTransito: true
};

/**
 * Função Matemática: Fórmula de Haversine
 * Calcula a distância entre dois pontos em KM
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Função Principal do Bot
 */
function rodarMonitoramento() {
    console.clear();
    console.log("=========================================");
    console.log(`📡 BOT LOGÍSTICO ATIVO - ${new Date().toLocaleTimeString()}`);
    console.log(`📍 Monitorando: ${CONFIG.DESTINO.nome}`);
    console.log("=========================================\n");

    const loop = setInterval(() => {
        const distancia = calcularDistancia(
            veiculoAtual.lat, veiculoAtual.lon, 
            CONFIG.DESTINO.lat, CONFIG.DESTINO.lon
        );

        const statusFormatado = distancia > CONFIG.RAIO_ALERTA_KM 
            ? `🚚 Veículo [${veiculoAtual.placa}] a ${distancia.toFixed(3)} km de distância...`
            : `🚨 ALERTA: Veículo [${veiculoAtual.placa}] chegando! (Distância: ${(distancia * 1000).toFixed(0)}m)`;

        process.stdout.write(`\r${statusFormatado}`);

        if (distancia <= CONFIG.RAIO_ALERTA_KM) {
            console.log("\n\n[NOTIFICAÇÃO]: O veículo entrou na zona de descarga!");
            console.log("Ação Sugerida: Liberar doca e posicionar empilhadeira.");
            
            if (CONFIG.SIMULAR_MOVIMENTO) {
                console.log("\nMonitoramento concluído com sucesso.");
                clearInterval(loop);
            }
        }

        // Simulador de movimento constante para o teste
        if (CONFIG.SIMULAR_MOVIMENTO && distancia > CONFIG.RAIO_ALERTA_KM) {
            veiculoAtual.lat += 0.0005; // Move o veículo em direção ao destino
        }

    }, CONFIG.INTERVALO_CHECK);
}

// Inicia o processo
rodarMonitoramento();
