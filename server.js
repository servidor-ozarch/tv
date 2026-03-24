const cheerio = require('cheerio');
const axios = require('axios');

app.get('/api/extrair', async (req, res) => {
    try {
        const { data } = await axios.get('https://www3.embedtv.best/premiere');
        const $ = cheerio.load(data);

        let links = [];

        $('a').each((i, el) => {
            const link = $(el).attr('href');

            if (link) {
                // 🔥 filtra m3u8 OU txt
                if (link.includes('.m3u8') || link.includes('.txt')) {
                    links.push(link);
                }
            }
        });

        res.json({ lista: links });

    } catch (e) {
        res.json({ erro: true, msg: e.toString() });
    }
});
