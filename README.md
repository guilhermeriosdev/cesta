# Cesta — seu mercado, mês a mês

App web (PWA) para celular: você escaneia o QR Code da nota fiscal do mercado (NFC-e),
o app busca os itens no portal da SEFAZ e mostra quanto você gastou, o que subiu de preço
e o que você sempre compra.

## Telas

| Tela | O que mostra |
| --- | --- |
| **Resumo** | Total do mês vs. mês anterior (no mês corrente, compara o mesmo período), barras dos últimos 6 meses, notas, "sua inflação", categorias, mais comprados, novidades |
| **Produtos** | Todos os produtos com busca; abas *Top* (frequência/quantidade/gasto), *Novos* (comprados este mês e não no anterior) e *Sumiram* |
| **Produto** | Gráfico do preço por compra, menor/média/maior, mês a mês, onde comprou mais barato; renomear, mudar categoria e **juntar** nomes diferentes do mesmo produto |
| **Comparar** | Escolha dois meses: diferença total, inflação pessoal, por categoria e produto a produto (subiram, baixaram, novos, saíram) |
| **Lista** | Lista de compras com check; aba *Sempre compro* gerada sozinha (produtos que aparecem em pelo menos metade dos meses) com quantidade sugerida |
| **Escanear** | Câmera com leitura contínua, foto da galeria ou link colado; prévia da nota antes de salvar; bloqueia nota duplicada |
| **Notas / Ajustes** | Histórico por mês, detalhe da nota, tema claro/escuro/automático, backup (exportar/importar), dados de exemplo |

## Como funciona

- **Leitura da nota**: o QR Code da NFC-e é um link para o portal da SEFAZ do estado. O navegador não
  consegue ler esse site direto (CORS), então a rota `POST /api/nfce` busca a página no servidor e extrai
  mercado, itens, totais, data e chave de acesso (`src/lib/nfce`). Lê o layout padrão usado pela maioria
  dos estados (SP, PR, RJ, BA, GO, DF, RS/SVRS…) e tem um plano B por texto (ex.: MG).
  Por segurança, a rota só acessa endereços `.gov.br`.
- **Mesmo produto em mercados diferentes**: se o código do item é um EAN válido, ele casa sozinho entre
  mercados. Se não, dá para juntar manualmente na tela do produto.
- **Dados**: ficam só no aparelho (IndexedDB). Não precisa de banco nem login. Use *Ajustes → Exportar backup*.
- **Categorias**: classificação automática por palavras-chave (`src/lib/categories.ts`), editável por produto.

## Rodar local

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes do leitor de nota e das comparações
```

A câmera só funciona em `https` ou `localhost`. Para testar no celular, faça o deploy (abaixo)
ou use um túnel https.

## Subir na Vercel

1. Crie um repositório no GitHub com esta pasta.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório (detecta Next.js sozinho, sem variáveis de ambiente).
3. O `vercel.json` já fixa as funções na região **São Paulo (gru1)** — vários portais da SEFAZ
   bloqueiam acessos de fora do Brasil.

Ou pela linha de comando: `npx vercel` e depois `npx vercel --prod`.

No iPhone: abra o link no Safari → Compartilhar → **Adicionar à Tela de Início**.

## Limitações conhecidas e próximos passos

- **Portais da SEFAZ variam por estado.** O leitor foi testado com páginas de exemplo do layout padrão e do
  layout de MG; estados com captcha ou formato diferente vão mostrar um erro amigável. Ao encontrar um
  estado que falha, salve o HTML da página em `src/lib/nfce/fixtures/` e adicione um teste.
- **Widgets na tela de início** (iOS/Android) exigem app nativo. O app web já tem a tela inicial em formato
  de widgets e atalhos ao segurar o ícone (Android). Próximo passo: empacotar com Capacitor e criar um
  widget WidgetKit/Glance lendo os mesmos dados.
- **Sincronizar entre aparelhos**: hoje é tudo local. Para sincronizar, adicionar login + banco
  (ex.: Supabase ou Vercel Postgres) e enviar as notas salvas.
