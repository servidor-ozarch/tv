const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');

const app = express();
const port = process.env.PORT || 3000;

// Rota Principal: https://tv-1-viha.onrender.com/
app.get('/', (req, res) => {
    res.send('Servidor EPG Ativo! Use a rota /epg para obter o XML.');
});

// Rota da EPG: https://tv-1-viha.onrender.com/epg
app.get('/epg', async (req, res) => {
    try {
        const url = 'https://tvinside.com.br/programacao_tv';
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('tv', { 'generator-info-name': 'Scraper Dinâmico' });

        // ... (Lógica de raspagem que fizemos anteriormente) ...
        // Simplificado para exemplo:
        $('.registro.row').each((i, el) => {
            const nome = $(el).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            root.ele('channel', { id: nome.toLowerCase().replace(/\s/g, '.') })
                .ele('display-name').txt(nome);
        });

        const xml = root.end({ prettyPrint: true });

        // Configura o cabeçalho para o navegador entender que é um XML
        res.header('Content-Type', 'application/xml');
        res.status(200).send(xml);

    } catch (error) {
        res.status(500).send({ error: 'Erro ao gerar EPG' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
