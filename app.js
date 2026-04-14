const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');

const app = express();
const PORT = process.env.PORT || 10000;

// Função para limpar IDs e torná-los compatíveis com XMLTV e M3U
const limparId = (texto) => {
    return texto.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, '.')      // Substitui símbolos (incluindo &) por ponto
        .replace(/\.+/g, '.')            // Remove pontos duplicados
        .trim();
};

app.get('/', (req, res) => {
    res.send('Servidor EPG Online. Link da EPG: /epg');
});

app.get('/epg', async (req, res) => {
    try {
        const url = 'https://tvinside.com.br/programacao_tv';
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);

        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('tv', { 
                'generator-info-name': 'Scraper Pro',
                'generator-info-url': 'https://render.com'
            });

        $('.registro.row').each((index, element) => {
            const nomeBruto = $(element).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            const canalId = limparId(nomeBruto);
            const canalLogo = $(element).find('.logo img').attr('src');

            // Adiciona Canal
            root.ele('channel', { id: canalId })
                .ele('display-name').txt(nomeBruto).up()
                .ele('icon', { src: canalLogo }).up();

            // Adiciona Programas
            $(element).find('.evento').each((i, el) => {
                const titulo = $(el).find('.titulo').text().trim();
                const dataRaw = $(el).find('time').attr('datetime'); // Formato: 2026-04-13 22:44:00
                const desc = $(el).find('.box_tc_exp').first().text().replace('•', ' - ').trim();

                if (titulo && dataRaw) {
                    // Formato XMLTV: YYYYMMDDHHMMSS -0300 (Ajustado para Brasília)
                    const dataFormatada = dataRaw.replace(/[- :]/g, '') + ' -0300';

                    root.ele('programme', { 
                        start: dataFormatada, 
                        channel: canalId 
                    })
                    .ele('title', { lang: 'pt' }).txt(titulo).up()
                    .ele('desc', { lang: 'pt' }).txt(desc).up()
                    .ele('category', { lang: 'pt' }).txt(desc.split(' - ')[0]).up();
                }
            });
        });

        const xml = root.end({ prettyPrint: true });

        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xml);

    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).send('Erro ao gerar EPG');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});
