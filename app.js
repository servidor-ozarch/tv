const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');
const cors = require('cors'); // Adicionado para compatibilidade

const app = express();
const PORT = process.env.PORT || 10000;

// Habilita CORS para que qualquer app consiga ler os dados
app.use(cors());

const limparId = (texto) => {
    return texto.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, '.')      
        .replace(/\.+/g, '.')            
        .trim();
};

app.get('/epg', async (req, res) => {
    try {
        const url = 'https://tvinside.com.br/programacao_tv';
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(html);

        // Criando XML com declaração standalone para maior compatibilidade
        const root = create({ version: '1.0', encoding: 'UTF-8', standalone: 'yes' })
            .ele('tv', { 'generator-info-name': 'EPG Server Pro' });

        $('.registro.row').each((index, element) => {
            const nomeBruto = $(element).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            const canalId = limparId(nomeBruto);
            const canalLogo = $(element).find('.logo img').attr('src');

            const channel = root.ele('channel', { id: canalId });
            channel.ele('display-name').txt(nomeBruto);
            if (canalLogo) channel.ele('icon', { src: canalLogo });
        });

        $('.registro.row').each((index, element) => {
            const nomeBruto = $(element).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            const canalId = limparId(nomeBruto);

            $(element).find('.evento').each((i, el) => {
                const titulo = $(el).find('.titulo').text().trim();
                const dataRaw = $(el).find('time').attr('datetime'); 
                const categoria = $(el).find('.box_tc_exp').first().text().replace('•', '').trim();

                if (titulo && dataRaw) {
                    // Formato: YYYYMMDDHHMMSS +0000 (Padrão mais aceito mundialmente)
                    const startFormat = dataRaw.replace(/[- :]/g, '') + ' +0000';

                    const prog = root.ele('programme', { start: startFormat, channel: canalId });
                    prog.ele('title', { lang: 'pt' }).txt(titulo);
                    if (categoria) prog.ele('category', { lang: 'pt' }).txt(categoria);
                }
            });
        });

        const xml = root.end({ prettyPrint: true });

        // Força o tipo de conteúdo específico que apps IPTV esperam
        res.set('Content-Type', 'text/xml'); 
        res.status(200).send(xml);

    } catch (error) {
        res.status(500).send('Erro ao processar EPG');
    }
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
