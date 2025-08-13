const iframe = document.getElementById("playerFrame");

const adHosts = [
    "doubleclick.net", "googlesyndication.com", "adsystem.com",
    "adservice.google.com", "pagead2.googlesyndication.com",
    "facebook.net", "criteo.com", "taboola.com", "outbrain.com",
    "adnxs.com", "adform.net", "adsafeprotected.com"
];

// --- Desativa zoom da página via meta viewport ---
function desativarZoom() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = "viewport";
        document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
}
desativarZoom();

// --- Ajusta proporção 16:9 do iframe ---
function ajustarProporcaoIframe() {
    const largura = window.innerWidth;
    const altura = largura * 9 / 16;
    iframe.style.width = largura + 'px';
    iframe.style.height = altura + 'px';
    iframe.style.display = 'block';
    iframe.style.margin = '0 auto';
}
window.addEventListener('resize', ajustarProporcaoIframe);
ajustarProporcaoIframe();

iframe.addEventListener("load", () => {
    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        appendScript(iframeDoc, `
            (function() {
                const adHosts = ${JSON.stringify(adHosts)};
                
                // Bloqueia anúncios e oculta botão "Travou?" via MutationObserver
                const observer = new MutationObserver(() => {
                    document.querySelectorAll('iframe, script, img, div, video').forEach(el => {
                        // Bloqueia anúncios por domínio
                        if (el.src) {
                            for (let host of adHosts) {
                                if (el.src.includes(host)) {
                                    console.log('Bloqueando anúncio:', el.src);
                                    el.remove();
                                    return;
                                }
                            }
                        }
                        // Oculta botão "Travou? Clique Aqui"
                        if (
                            el.tagName === 'DIV' &&
                            el.innerText &&
                            el.innerText.includes('Travou?') &&
                            el.style.position === 'fixed'
                        ) {
                            el.style.display = "none";
                            console.log('Botão "Travou?" ocultado.');
                            return;
                        }
                        // Pula vídeos de anúncio adicionados dinamicamente
                        if (
                            el.tagName === 'VIDEO' &&
                            el.duration &&
                            el.duration <= 20 &&
                            el.currentTime < el.duration
                        ) {
                            el.currentTime = el.duration;
                            el.muted = true;
                            el.play().catch(() => {});
                            console.log('Anúncio dinâmico pulado via MutationObserver');
                        }
                    });
                });
                observer.observe(document, { childList: true, subtree: true });

                // Loop rápido para pular anúncios já existentes ou em andamento
                setInterval(() => {
                    const video = document.querySelector('video');
                    if (
                        video &&
                        video.duration &&
                        video.duration <= 20 &&
                        video.currentTime < video.duration
                    ) {
                        video.currentTime = video.duration;
                        video.muted = true;
                        video.play().catch(() => {});
                        console.log('Anúncio já existente pulado via setInterval');
                    }
                }, 50);
            })();
        `);

    } catch (e) {
        console.warn("Não foi possível injetar JS no iframe (possível bloqueio por CORS).");
    }
});

function appendScript(doc, code) {
    const script = doc.createElement("script");
    script.textContent = code;
    doc.body.appendChild(script);
}