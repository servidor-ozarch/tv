const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');

const app = express();
const PORT = process.env.PORT || 3000;

// Rota principal para verificar se o servidor está online
app.get('/', (req, res) => {
    res.send('Servidor EPG ativo. Aceda a /epg para o ficheiro XML.');
});

// Rota que gera a EPG dinamicamente
app.get('/epg', async (req, res) => {
    try {
        const url = 'https://tvinside.com.br/programacao_tv';
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('tv', { 'generator-info-name': 'Scraper Express' });

        $('.registro.row').each((index, element) => {
            const canalNome = $(element).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            // Gera ID limpo (sem acentos ou espaços)
            const canalId = canalNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
            const canalLogo = $(element).find('.logo img').attr('src');

            root.ele('channel', { id: canalId })
                .ele('display-name').txt(canalNome).up()
                .ele('icon', { src: canalLogo }).up();

            $(element).find('.evento').each((i, el) => {
                const titulo = $(el).find('.titulo').text().trim();
                const dataRaw = $(el).find('time').attr('datetime');
                const categoria = $(el).find('.box_tc_exp').first().text().replace('•', '').trim();

                if (titulo && dataRaw) {
                    const startFormat = dataRaw.replace(/[- :]/g, '') + ' +0000';
                    root.ele('programme', { start: startFormat, channel: canalId })
                        .ele('title', { lang: 'pt' }).txt(titulo).up()
                        .ele('category', { lang: 'pt' }).txt(categoria).up();
                }
            });
        });

        const xml = root.end({ prettyPrint: true });

        // Configura o cabeçalho para o player reconhecer como XML de TV
        res.header('Content-Type', 'application/xml');
        res.status(200).send(xml);

    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao gerar a EPG.');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});
