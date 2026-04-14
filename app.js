const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');
const fs = require('fs');

async function scriptEPG() {
    try {
        console.log('A iniciar a raspagem...');
        // URL da página enviada
        const url = 'https://tvinside.com.br/programacao_tv';
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        // Criação da estrutura base do XMLTV
        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('tv', { 'generator-info-name': 'Scraper TV Inside' });

        // Seleciona cada linha de canal na grelha
        $('.registro.row').each((index, element) => {
            const linkCanal = $(element).find('a');
            const canalNome = linkCanal.attr('title').replace('Programação do Canal ', '');
            const canalId = canalNome.toLowerCase().replace(/\s+/g, '.').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const canalLogo = $(element).find('.logo img').attr('src');

            // Adiciona o canal ao XML
            root.ele('channel', { id: canalId })
                .ele('display-name').txt(canalNome).up()
                .ele('icon', { src: canalLogo }).up();

            // Seleciona os programas (eventos) dentro deste canal
            $(element).find('.evento').each((i, el) => {
                const titulo = $(el).find('.titulo').text().trim();
                const tempoOriginal = $(el).find('time').attr('datetime'); // Ex: 2026-04-13 22:44:00
                const categoria = $(el).find('.box_tc_exp').first().text().replace('•', '').trim();

                if (titulo && tempoOriginal) {
                    // Formatação da data: YYYYMMDDHHMMSS +offset
                    const dataFormatada = tempoOriginal.replace(/[- :]/g, '') + ' +0000';

                    root.ele('programme', {
                        start: dataFormatada,
                        channel: canalId
                    })
                    .ele('title', { lang: 'pt' }).txt(titulo).up()
                    .ele('category', { lang: 'pt' }).txt(categoria).up();
                }
            });
        });

        const xml = root.end({ prettyPrint: true });
        fs.writeFileSync('epg_dinamica.xml', xml);
        console.log('Sucesso: O ficheiro epg_dinamica.xml foi gerado.');

    } catch (error) {
        console.error('Erro ao processar a página:', error.message);
    }
}

scriptEPG();

