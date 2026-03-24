const cheerio = require('cheerio');
const axios = require('axios');

app.get('/api/iptv', async (req, res) => {
    try {
        const { data } = await axios.get('https://www.cxtv.com.br/tv-ao-vivo/tv-aracati-hd');
        const $ = cheerio.load(data);

        let m3u8 = [];
        let ts = [];

        $('a').each((i, el) => {
            const link = $(el).attr('href');

            if (link) {
                if (link.includes('.m3u8')) {
                    m3u8.push(link);
                }

                if (link.includes('.ts')) {
                    ts.push(link);
                }
            }
        });

        res.json({
            m3u8: m3u8,
            ts: ts
        });

    } catch (e) {
        res.json({ erro: true });
    }
});
