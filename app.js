const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { create } = require('xmlbuilder2');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 10000;

const limparId = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').trim();

app.get('/epg', async (req, res) => {
    try {
        const { data: html } = await axios.get('https://tvinside.com.br/programacao_tv', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(html);

        // Criando o XML com cabeçalho completo
        const root = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('tv', { 
                'generator-info-name': 'EPG Server',
                'source-info-name': 'TV Inside'
            });

        const canais = [];

        // 1. Primeiro mapeamos todos os canais (Obrigatório vir antes dos programmes)
        $('.registro.row').each((i, el) => {
            const nome = $(el).find('a').attr('title')?.replace('Programação do Canal ', '') || 'Canal';
            const id = limparId(nome);
            const logo = $(el).find('.logo img').attr('src');

            canais.push({ id, nome, logo, element: el });

            root.ele('channel', { id: id })
                .ele('display-name').txt(nome).up()
                .ele('icon', { src: logo }).up()
            .up();
        });

        // 2. Depois mapeamos os programas
        canais.forEach(canal => {
            const eventos = $(canal.element).find('.evento');
            
            eventos.each((j, ev) => {
                const titulo = $(ev).find('.titulo').text().trim();
                const dataRaw = $(ev).find('time').attr('datetime'); // 2026-04-13 22:44:00
                
                if (titulo && dataRaw) {
                    const start = dataRaw.replace(/[- :]/g, '') + ' +0000';
                    
                    // Calculando um "stop" aproximado (próximo programa ou +1h)
                    // Muitos apps falham sem a tag stop
                    let stop;
                    const proximo = $(eventos[j + 1]).find('time').attr('datetime');
                    if (proximo) {
                        stop = proximo.replace(/[- :]/g, '') + ' +0000';
                    } else {
                        // Se não tem próximo, soma 1 hora (gambiarra técnica para compatibilidade)
                        stop = start.replace(/(\d{2})(\d{2}) \+0000$/, (m, h, min) => {
                            let nh = (parseInt(h) + 1).toString().padStart(2, '0');
                            return `${nh}${min} +0000`;
                        });
                    }

                    const prog = root.ele('programme', { start: start, stop: stop, channel: canal.id });
                    prog.ele('title', { lang: 'pt' }).txt(titulo).up();
                    prog.ele('desc', { lang: 'pt' }).txt('Programação extraída de TV Inside').up();
                }
            });
        });

        const xml = root.end({ prettyPrint: true });

        // IMPORTANTE: Alguns apps ignoram se não for text/xml
        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.status(200).send(xml);

    } catch (e) {
        console.error(e);
        res.status(500).send('Erro interno');
    }
});

app.listen(PORT, () => console.log(`Online na porta ${PORT}`));
