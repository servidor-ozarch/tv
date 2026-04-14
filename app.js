const axios = require('axios');

async function pegarTxt(url) {
    try {
        const { data } = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        // 🔎 pega URLs absolutas .txt
        const regexAbsoluto = /https?:\/\/[^\s"'<>]+\.txt/gi;

        // 🔎 pega URLs relativas .txt
        const regexRelativo = /\/[^\s"'<>]+\.txt/gi;

        let encontrados = [];

        const abs = data.match(regexAbsoluto);
        const rel = data.match(regexRelativo);

        if (abs) encontrados.push(...abs);

        // 🔧 converte relativo → absoluto
        if (rel) {
            const base = new URL(url).origin;
            const convertidos = rel.map(r => base + r);
            encontrados.push(...convertidos);
        }

        // 🚫 remove duplicados
        encontrados = [...new Set(encontrados)];

        // 🚫 filtra lixo (caso raro mas importante)
        encontrados = encontrados.filter(u => 
            !u.endsWith('.js') &&
            !u.endsWith('.css') &&
            !u.includes('jquery') &&
            !u.includes('bootstrap')
        );

        if (encontrados.length > 0) {
            console.log('✅ Encontrados:', encontrados);
            return encontrados[0]; // retorna o primeiro válido
        }

        console.log('❌ Nenhum .txt encontrado via axios');
        return null;

    } catch (e) {
        console.log('Erro AXIOS:', e.message);
        return null;
    }
}
