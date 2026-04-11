const axios = require('axios');

async function processarConsulta(cpfRaw) {
    const cpf = cpfRaw.replace(/[./-\s]/g, '');
    const firebaseURL = `https://projeto-aplicativo-android-default-rtdb.firebaseio.com/consultas/${cpf}.json`;

    // 1. Transformação Base64 (Necessário para o login)
    const email = 'marciahev@gmail.com';
    const password = 'marciacosta1';
    const loginBase64 = Buffer.from(`${email}:${password}`).toString('base64');

    const headersBase = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    try {
        console.log(`[INFO] Iniciando busca para: ${cpf}`);

        // 2. Obtenção do Token
        const auth = await axios.post('https://servicos-cloud.saude.gov.br/pni-bff/v1/autenticacao/tokenAcesso', {}, {
            headers: { ...headersBase, 'X-Authorization': `Basic ${loginBase64}` }
        });

        const token = auth.data.accessToken;

        // 3. Consulta da API
        const response = await axios.get(`https://servicos-cloud.saude.gov.br/pni-bff/v1/cidadao/cpf/${cpf}`, {
            headers: { ...headersBase, 'Authorization': `Bearer ${token}` }
        });

        const data = response.data.records ? response.data.records[0] : null;

        if (!data) {
            return console.log('❌ CPF não encontrado na base de dados.');
        }

        // 4. Organização dos dados para o Firebase
        const dadosParaSalvar = {
            identificacao: {
                nome: data.nome || 'N/A',
                nascimento: data.dataNascimento || 'N/A',
                sexo: data.sexo || 'N/A',
                cns: data.cnsDefinitivo || 'N/A'
            },
            filiacao: {
                mae: data.nomeMae || 'N/A',
                pai: data.nomePai || 'N/A'
            },
            endereco: {
                rua: data.endereco?.logradouro || 'N/A',
                bairro: data.endereco?.bairro || 'N/A',
                cidade: data.endereco?.municipio || 'N/A',
                uf: data.endereco?.siglaUf || 'N/A'
            },
            timestamp: new Date().toISOString() // Salva quando a consulta foi feita
        };

        // 5. Envio para o Firebase Realtime Database
        // Usamos .put() para que cada CPF seja uma "chave" única dentro de /consultas
        await axios.put(firebaseURL, dadosParaSalvar);

        console.log('✅ Dados salvos no Firebase com sucesso!');
        console.log(`Caminho: consultas/${cpf}`);

    } catch (error) {
        console.error('⚠️ Erro no processo:', error.message);
    }
}

// Teste de execução
processarConsulta('912.215.522-87');
