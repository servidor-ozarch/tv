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
