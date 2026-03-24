const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// O Render define a porta automaticamente, se não houver, usa 10000
const PORT = process.env.PORT || 10000;
const NOME_ARQUIVO = 'teste_010101.m3u8';

// Função que cria o arquivo na raiz do projeto no Render
function ativarGerador() {
  const conteudo = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXTINF:10.0,\nstream.ts\n#EXT-X-ENDLIST`;
  
  try {
    // Usamos path.join com process.cwd() para garantir que salve na pasta do projeto no Render
    const caminho = path.join(process.cwd(), NOME_ARQUIVO);
    fs.writeFileSync(caminho, conteudo, 'utf8');
    console.log(`✅ Arquivo ${NOME_ARQUIVO} gerado no servidor Render!`);
  } catch (err) {
    console.error('❌ Erro ao criar arquivo no Render:', err);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === `/${NOME_ARQUIVO}`) {
    // Rota para ler o arquivo gerado
    const caminho = path.join(process.cwd(), NOME_ARQUIVO);
    if (fs.existsSync(caminho)) {
      res.writeHead(200, { 'Content-Type': 'application/x-mpegURL' });
      return fs.createReadStream(caminho).pipe(res);
    }
  }
  res.end('Servidor HLS Ativo no Render');
});

server.listen(PORT, () => {
  console.log(`🚀 Server on port ${PORT}`);
  ativarGerador(); // Ativa a criação do arquivo assim que sobe
});
        
