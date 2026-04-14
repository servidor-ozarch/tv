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

        // Data atual para o cabeçalho
        const agora = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // 1. Configuração do Cabeçalho exatamente como no seu exemplo
        const root = create({ version: '1.0', encoding: 'utf-8' })
            .ele('tv', { 
                'generator-info-name': `@limaalef - Criado em ${agora}`, 
                'generator-info-url': 'http://limaalef.com' 
            });

        const listaCanais = [];

        // 2. Extração dos Canais
        $('.registro.row').each((i, el) => {
            const nomeBruto = $(el).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            
            // Usando o nome bruto como ID para bater com o seu exemplo (ex: "BAND HD")
            const id = nomeBruto; 
            listaCanais.push({ id, nomeBruto, element: el });

            // Adicionando a tag display-name com lang="pt"
            root.ele('channel', { id: id })
                .ele('display-name', { lang: 'pt' }).txt(nomeBruto).up()
            .up();
        });

        // 3. Extração dos Programas (Programmes)
        listaCanais.forEach(item => {
            $(item.element).find('.evento').each((j, ev) => {
                const titulo = $(ev).find('.titulo').text().trim();
                const dataRaw = $(ev).find('time').attr('datetime');

                if (titulo && dataRaw) {
                    const start = dataRaw.replace(/[- :]/g, '') + ' +0000';
                    
                    // Cálculo do Stop (Próximo ou +1h)
                    const proxDataRaw = $(item.element).find('.evento').eq(j + 1).find('time').attr('datetime');
                    let stop = proxDataRaw ? proxDataRaw.replace(/[- :]/g, '') + ' +0000' : start.replace(/(\d{2})(\d{2}) \+0000$/, (m, h, min) => {
                        let nh = (parseInt(h) + 1).toString().padStart(2, '0');
                        return `${nh}${min} +0000`;
                    });

                    // Adicionando programa com título lang="pt"
                    root.ele('programme', { start: start, stop: stop, channel: item.id })
                        .ele('title', { lang: 'pt' }).txt(titulo).up()
                    .up();
                }
            });
        });

        const xml = root.end({ prettyPrint: true });

        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.status(200).send(xml);

    } catch (e) {
        res.status(500).send('Erro ao gerar EPG');
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
