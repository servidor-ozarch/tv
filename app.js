const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 10000;

// Função para gerar IDs 100% seguros (remove tudo que não é letra ou número)
const limparId = (t) => {
    return t.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/&/g, 'e')               // Troca & por 'e'
        .replace(/[^a-z0-9]/g, '')       // Remove QUALQUER símbolo
        .trim();
};

app.get('/epg', async (req, res) => {
    try {
        const { data: html } = await axios.get('https://tvinside.com.br/programacao_tv', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);

        // O segredo está em deixar a biblioteca xmlbuilder tratar o escape de caracteres especiais
        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('tv', { 'generator-info-name': 'EPG-Server-Fixed' });

        $('.registro.row').each((i, el) => {
            const nomeBruto = $(el).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            const id = limparId(nomeBruto);
            const logo = $(el).find('.logo img').attr('src');

            // .txt() faz o escape automático de caracteres como &
            root.ele('channel', { id: id })
                .ele('display-name').txt(nomeBruto).up()
                .ele('icon', { src: logo }).up();

            $(el).find('.evento').each((j, ev) => {
                const titulo = $(ev).find('.titulo').text().trim();
                const dataRaw = $(ev).find('time').attr('datetime');
                
                if (titulo && dataRaw) {
                    const start = dataRaw.replace(/[- :]/g, '') + ' +0000';
                    // Criamos um stop de 1 hora para evitar erros em players rígidos
                    const stop = start.replace(/(\d{2})(\d{2}) \+0000$/, (m, h, min) => {
                        let nh = (parseInt(h) + 1).toString().padStart(2, '0');
                        return `${nh}${min} +0000`;
                    });

                    root.ele('programme', { start: start, stop: stop, channel: id })
                        .ele('title', { lang: 'pt' }).txt(titulo).up()
                        .ele('desc', { lang: 'pt' }).txt('Programação via TV Inside').up();
                }
            });
        });

        const xml = root.end({ prettyPrint: true });

        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.status(200).send(xml);

    } catch (e) {
        res.status(500).send('Erro no processamento');
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
