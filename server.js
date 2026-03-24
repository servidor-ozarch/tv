const cheerio = require('cheerio');
const axios = require('axios');

app.get('/api/extrair', async (req, res) => {
    try {
        const { data } = await axios.get('https://www3.embedtv.best/premiere');
        const $ = cheerio.load(data);

        let m3u8 = [];
        let txt = [];

        $('a').each((i, el) => {
            const link = $(el).attr('href');

            if (link) {
                if (link.includes('.m3u8')) {
                    m3u8.push(link);
                }

                if (link.includes('.txt')) {
                    txt.push(link);
                }
            }
        });

        res.json({
            m3u8: m3u8,
            txt: txt
        });

    } catch (e) {
        res.json({ erro: true });
    }
});
