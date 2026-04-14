const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 10000;

// Função de limpeza para IDs - Crucial para bater com a M3U
const limparId = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').trim();

app.get('/epg', async (req, res) => {
    try {
        const { data: html } = await axios.get('https://tvinside.com.br/programacao_tv', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);

        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('tv', { 'generator-info-name': 'EPG-Server' });

        $('.registro.row').each((i, el) => {
            const nome = $(el).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            const id = limparId(nome);
            const logo = $(el).find('.logo img').attr('src');

            const chan = root.ele('channel', { id: id });
            chan.ele('display-name').txt(nome).up();
            if (logo) chan.ele('icon', { src: logo }).up();
        });

        $('.registro.row').each((i, el) => {
            const id = limparId($(el).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal');
            
            $(el).find('.evento').each((j, ev) => {
                const titulo = $(ev).find('.titulo').text().trim();
                const dataRaw = $(ev).find('time').attr('datetime');
                
                if (titulo && dataRaw) {
                    // Formato universal YYYYMMDDHHMMSS +0000
                    const start = dataRaw.replace(/[- :]/g, '') + ' +0000';
                    const prog = root.ele('programme', { start: start, channel: id });
                    prog.ele('title', { lang: 'pt' }).txt(titulo);
                }
            });
        });

        // IMPORTANTE: Alguns apps só leem se o Content-Type for EXATAMENTE este:
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.send(root.end({ prettyPrint: true }));

    } catch (e) {
        res.status(500).send('Erro');
    }
});

app.listen(PORT, () => console.log(`Online na porta ${PORT}`));
