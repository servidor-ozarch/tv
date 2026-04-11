const axios = require('axios');

/**
 * Versão Super Lite: Focada em baixo consumo de RAM e CPU.
 * Ideal para deploys com limites rígidos.
 */
async function processarConsulta(cpfRaw) {
    // 1. Limpeza rápida e configuração de constantes
    const cpf = cpfRaw.replace(/\D/g, ''); // \D remove tudo que não é dígito
    if (cpf.length !== 11) return console.error('❌ CPF Inválido');

    const firebaseURL = `https://projeto-aplicativo-android-default-rtdb.firebaseio.com/consultas/${cpf}.json`;
    
    // Credenciais transformadas apenas uma vez
    const authHeader = `Basic ${Buffer.from('marciahev@gmail.com:marciacosta1').toString('base64')}`;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    try {
        // 2. Obtenção do Token (Uso de await direto para não criar variáveis desnecessárias)
        const { data: { accessToken } } = await axios.post('https://servicos-cloud.saude.gov.br/pni-bff/v1/autenticacao/tokenAcesso', {}, {
            headers: { 'X-Authorization': authHeader, 'User-Agent': userAgent }
        });

        // 3. Consulta da API (Destructuring direto na resposta para economizar memória)
        const { data: { records } } = await axios.get(`https://servicos-cloud.saude.gov.br/pni-bff/v1/cidadao/cpf/${cpf}`, {
            headers: { 
                'Authorization': `Bearer ${accessToken}`, 
                'User-Agent': userAgent 
            }
        });

        const record = records?.[0];
        if (!record) return console.log('❌ CPF não encontrado.');

        // 4. Mapeamento direto para o Firebase (Sem criar objetos intermediários grandes)
        await axios.put(firebaseURL, {
            ident: {
                n: record.nome || 'N/A',
                d: record.dataNascimento || 'N/A',
                s: record.sexo || 'N/A',
                c: record.cnsDefinitivo || 'N/A'
            },
            fami: {
                m: record.nomeMae || 'N/A',
                p: record.nomePai || 'N/A'
            },
            end: {
                r: record.endereco?.logradouro || 'N/A',
                b: record.endereco?.bairro || 'N/A',
                c: record.endereco?.municipio || 'N/A',
                u: record.endereco?.siglaUf || 'N/A'
            },
            ts: Math.floor(Date.now() / 1000) // Timestamp numérico é mais leve que String ISO
        });

        console.log(`✅ Sucesso: ${cpf}`);

    } catch (e) {
        // Log minimalista para não encher o buffer de saída do servidor
        console.error('⚠️ Erro:', e.response?.status || e.message);
    }
}

// Execução
processarConsulta('123.456.789-00');










const axios = require('axios');
const http = require('http'); // Nativo do Node, 0MB de peso extra

// --- FUNÇÃO DE LOGICA ---
async function executarConsulta(cpfRaw) {
    const cpf = cpfRaw.replace(/\D/g, '');
    const firebaseURL = `https://projeto-aplicativo-android-default-rtdb.firebaseio.com/consultas/${cpf}.json`;
    
    const email = 'marciahev@gmail.com';
    const senha = 'marciacosta1';
    const authHeader = `Basic ${Buffer.from(`${email}:${senha}`).toString('base64')}`;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    try {
        const { data: { accessToken } } = await axios.post('https://servicos-cloud.saude.gov.br/pni-bff/v1/autenticacao/tokenAcesso', {}, {
            headers: { 'X-Authorization': authHeader, 'User-Agent': userAgent }
        });

        const { data: { records } } = await axios.get(`https://servicos-cloud.saude.gov.br/pni-bff/v1/cidadao/cpf/${cpf}`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': userAgent }
        });

        if (records?.[0]) {
            await axios.put(firebaseURL, { ...records[0], ts: Date.now() });
            return `✅ CPF ${cpf} salvo no Firebase!`;
        }
        return '❌ CPF não encontrado.';
    } catch (e) {
        return `⚠️ Erro: ${e.message}`;
    }
}

// --- SERVIDOR PARA MANTER O DEPLOY LIGADO ---
const server = http.createServer(async (req, res) => {
    // Exemplo de uso: seu-app.render.com/consultar?cpf=12345678900
    if (req.url.startsWith('/consultar')) {
        const urlParams = new URL(req.url, `http://${req.headers.host}`);
        const cpf = urlParams.searchParams.get('cpf');

        if (cpf) {
            const resultado = await executarConsulta(cpf);
            res.end(resultado);
        } else {
            res.end('Envie o CPF na URL. Ex: /consultar?cpf=00000000000');
        }
    } else {
        res.end('Servidor Ativo (Super Lite)');
    }
});

// O servidor usa a porta fornecida pelo deploy ou a 3000 localmente
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Projeto rodando na porta ${PORT}`);
});

