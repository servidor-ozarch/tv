const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 10000;

app.get('/epg', async (req, res) => {
    try {
        const { data: html } = await axios.get('https://tvinside.com.br/programacao_tv', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);

        // Data atual formatada para o cabeçalho
        const agora = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // 1. Criação do cabeçalho conforme o seu exemplo
        const root = create({ version: '1.0', encoding: 'utf-8' })
            .ele('tv', { 
                'generator-info-name': `@limaalef - Criado em ${agora}`, 
                'generator-info-url': 'http://limaalef.com' 
            });

        const listaCanais = [];

        // 2. Mapeamento de Canais
        $('.registro.row').each((i, el) => {
            const nomeCanal = $(el).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            
            // No seu exemplo, o ID é o próprio nome do canal
            listaCanais.push({ id: nomeCanal, element: el });

            root.ele('channel', { id: nomeCanal })
                .ele('display-name', { lang: 'pt' }).txt(nomeCanal).up()
            .up();
        });

        // 3. Mapeamento de Programas
        listaCanais.forEach(item => {
            const eventos = $(item.element).find('.evento');
            
            eventos.each((j, ev) => {
                const titulo = $(ev).find('.titulo').text().trim();
                const dataRaw = $(ev).find('time').attr('datetime'); // Formato: 2026-04-13 22:44:00

                if (titulo && dataRaw) {
                    // Início: YYYYMMDDHHMMSS +0000
                    const start = dataRaw.replace(/[- :]/g, '') + ' +0000';
                    
                    // Fim: Pega o horário do próximo programa ou soma 1 hora
                    const proxDataRaw = eventos.eq(j + 1).find('time').attr('datetime');
                    let stop = proxDataRaw ? proxDataRaw.replace(/[- :]/g, '') + ' +0000' : start.replace(/(\d{2})(\d{2}) \+0000$/, (m, h, min) => {
                        let nh = (parseInt(h) + 1).toString().padStart(2, '0');
                        return `${nh}${min} +0000`;
                    });

                    root.ele('programme', { start: start, stop: stop, channel: item.id })
                        .ele('title', { lang: 'pt' }).txt(titulo).up()
                    .up();
                }
            });
        });

        const xml = root.end({ prettyPrint: true });

        // Envia como text/xml para máxima compatibilidade com apps IPTV
        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.status(200).send(xml);

    } catch (e) {
        console.error(e);
        res.status(500).send('Erro ao processar EPG');
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
