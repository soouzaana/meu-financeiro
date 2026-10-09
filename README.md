# Meu Financeiro (PWA local-first)

    npm install
    npm run dev        # desenvolvimento
    npm test           # testes (lógica + renderização)
    npm run build      # build + service worker em dist/
    npm run preview    # servir o build

Instalar no iPhone: hospede `dist/` em qualquer servidor estático com HTTPS (GitHub Pages, Netlify, Vercel…),
abra no Safari › Compartilhar › Adicionar à Tela de Início. Dados ficam só no aparelho (IndexedDB): faça backups em Mais › Configurações.
