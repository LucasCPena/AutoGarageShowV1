Projeto: Ajustes Classificados — vídeo, ordenação e alt/zoom
=========================================================

Visão rápida
------------
- Objetivo: adicionar suporte para vídeo em anúncios (upload ou YouTube), permitir que administradores definam ordenação personalizada e garantir que alt das imagens apareçam e possam ser ampliadas.

O que foi implementado (resumo)
- Formulário de cadastro (`ListingSubmissionForm`) já suportava vídeo — mantive e validei fluxo: YouTube ou upload, grava em `specifications.mediaVideo*`.
- Visualização do anúncio: adicionado componente `ListingGallery` (client) que mostra imagens, insere vídeo na posição configurada e fornece lightbox/modal para ampliar imagens.
- Painel admin (`AdminListingsPanel`): adicionado campo para definir `order` (override) por anúncio; usa `useListingOverrides` para persistir em `localStorage`.
- `listingOverrides` agora aceita `order` numeric; `useListingOverrides` normaliza `order`.

Decisões técnicas (assunções)
- Se o usuário fornecer tanto upload quanto link do YouTube, o upload é priorizado.
- `specifications.mediaVideoPosition` é 0-based e indica posição entre imagens (0 = antes da primeira imagem). Admin override `order` é separado e aplica apenas na ordenação de listagens em listas.
- Usei `localStorage` para overrides (persistência leve, não há backend específico para ordenação manual).

Como rodar
-----------
1. Instale dependências:

```bash
npm install
```

2. Rodar dev:

```bash
npm run dev
```

3. Testes (unit):

```bash
npm run test
npm run test:coverage
```

Notas finais
-----------
- Arquivos principais alterados/novos:
  - `src/components/ListingGallery.tsx` (novo)
  - `src/app/classificados/[slug]/page.tsx` (usa a galeria)
  - `src/lib/listingOverrides.ts` (adiciona `order`)
  - `src/lib/useListingOverrides.ts` (normaliza `order`)
  - `src/components/AdminListingsPanel.tsx` (UI de order)
  - testes em `src/lib/__tests__`

Se quiser, eu posso:
- Adicionar persistência de ordenação no backend (DB + endpoint) para sincronizar entre administradores.
- Adicionar upload progress e validação de tipos/tamanhos para vídeos e imagens.
