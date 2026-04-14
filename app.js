const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 10000;

// Função de limpeza total para os IDs (essencial para bater com o tvg-id da M3U)
const limparId = (t) => {
    return t.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, 'e')
        .replace(/[^a-z0-9]/g, '')
        .trim();
};

app.get('/epg', async (req, res) => {
    try {
        const { data: html } = await axios.get('https://tvinside.com.br/programacao_tv', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(html);

        // Standalone=yes ajuda na leitura de apps mais antigos
        const root = create({ version: '1.0', encoding: 'UTF-8', standalone: 'yes' })
            .ele('tv', { 'generator-info-name': 'EPG-Server-V3' });

        const listaCanais = [];

        // 1ª PASSAGEM: Apenas os Canais (Obrigatório vir primeiro no XMLTV)
        $('.registro.row').each((i, el) => {
            const nomeBruto = $(el).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            const id = limparId(nomeBruto);
            const logo = $(el).find('.logo img').attr('src');

            listaCanais.push({ id, nomeBruto, element: el });

            const chan = root.ele('channel', { id: id });
            chan.ele('display-name').txt(nomeBruto).up();
            if (logo) chan.ele('icon', { src: logo }).up();
        });

        // 2ª PASSAGEM: Apenas os Programas
        listaCanais.forEach(item => {
            $(item.element).find('.evento').each((j, ev) => {
                const titulo = $(ev).find('.titulo').text().trim();
                const dataRaw = $(ev).find('time').attr('datetime'); // 2026-04-13 22:44:00

                if (titulo && dataRaw) {
                    // Formato: YYYYMMDDHHMMSS +0000
                    const start = dataRaw.replace(/[- :]/g, '') + ' +0000';
                    
                    // Cálculo de Stop: Próximo horário ou +1h se for o último
                    const proxDataRaw = $(item.element).find('.evento').eq(j + 1).find('time').attr('datetime');
                    let stop = proxDataRaw ? proxDataRaw.replace(/[- :]/g, '') + ' +0000' : start.replace(/(\d{2})(\d{2}) \+0000$/, (m, h, min) => {
                        let nh = (parseInt(h) + 1).toString().padStart(2, '0');
                        return `${nh}${min} +0000`;
                    });

                    const prog = root.ele('programme', { start: start, stop: stop, channel: item.id });
                    prog.ele('title', { lang: 'pt' }).txt(titulo).up();
                    prog.ele('desc', { lang: 'pt' }).txt('Guia de Programação').up();
                }
            });
        });

        const xml = root.end({ prettyPrint: true });

        // Alguns apps ignoram se o cabeçalho não for este exatamente
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xml);

    } catch (e) {
        res.status(500).send('Erro no servidor');
    }
});

app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
