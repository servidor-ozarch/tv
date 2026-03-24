const fs = require('node:fs');
const path = require('node:path');

// 1. Definimos o nome do arquivo solicitado
const nomeArquivo = 'teste_010101.m3u8';

// 2. Criamos o conteúdo padrão de um índice HLS
// Se você tiver os links dos vídeos (.ts), pode colocá-los aqui
const conteudoHLS = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:10.0,
video_segmento_001.ts
#EXTINF:10.0,
video_segmento_002.ts
#EXT-X-ENDLIST`;

// 3. Resolvemos o caminho para garantir que salve na mesma pasta do script
// __dirname garante que ele use a pasta onde o arquivo .js está localizado
const caminhoCompleto = path.join(__dirname, nomeArquivo);

try {
  // 4. Gravamos o arquivo de forma síncrona para simplificar
  fs.writeFileSync(caminhoCompleto, conteudoHLS, 'utf8');
  
  console.log('---');
  console.log(`✅ Sucesso! Arquivo criado em: ${caminhoCompleto}`);
  console.log(`📂 Verifique sua pasta, o arquivo "${nomeArquivo}" já deve estar lá.`);
  console.log('---');
} catch (erro) {
  console.error('❌ Erro ao gerar o arquivo:', erro.message);
}
