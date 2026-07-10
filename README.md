# Filtro CSV em Cascata

Aplicação React auto-contida para filtro sequencial de dados CSV. Roda direto no navegador — **sem servidor, sem backend, sem instalação**.

## Download

Baixe o `bundle.html` mais recente na [página de Releases](https://github.com/Sarpa-m/csv-cascade-filter/releases).
Abra o arquivo em qualquer navegador — pronto.

## Como usar

### Opção 1: Bundle auto-contido (recomendado para uso)

```bash
pnpm bundle
```

Abra o arquivo `bundle.html` gerado em qualquer navegador. Pronto.

### Opção 2: Dev server (para desenvolvimento)

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

## Funcionalidades

1. **Importar CSV** — parser real (RFC 4180) com detecção automática de separador (`;`, `,`, `\t`), suporte a campos com aspas, escapes e quebras de linha
2. **Reordenar colunas** — drag-and-drop para definir a ordem em que os filtros são aplicados (ordem original do CSV é preservada na tabela final)
3. **Cascata de seleções** — dropdowns encadeados sequencialmente:
   - Modo single-select (padrão): clique direto, sem botão de confirmar
   - Modo multi-select (toggle): checkboxes com busca, selecionar visíveis, limpar
   - Avanço automático quando sobra 1 única opção (ícone ⚡)
   - Travamento de colunas entre linhas consecutivas (ícone 🔒)
4. **Envio automático** — ao completar todas as colunas, as linhas reais do CSV que passaram nos filtros vão para a tabela final automaticamente
5. **Tabela final** — colunas na ordem original do CSV, com indicador de fonte (manual/auto/multi), exportação CSV/TSV/Excel, cópia TSV para clipboard
6. **Persistência total** — tudo salvo em `localStorage` incrementalmente (CSV, ordem, travamentos, lista, seleção parcial). Recarregue a página e continue de onde parou.
7. **Proteção contra duplicatas** — a mesma linha do CSV nunca entra duas vezes na tabela final

## 🚨 Regra de ouro

**Nunca é criada uma linha que não exista no CSV original.** Os filtros apenas encontram linhas reais do arquivo — nunca geram combinações artificiais. Se o CSV tem 100 linhas, a tabela final só contém linhas que estão entre essas 100.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript |
| Estilos | Tailwind CSS 3 + shadcn/ui (Radix) |
| Build (dev) | Vite |
| Build (bundle) | Parcel + html-inline |
| Testes | Vitest + Testing Library |
| Pacotes | pnpm |

## Comandos

```bash
pnpm install      # instalar dependências
pnpm dev          # dev server com HMR
pnpm build        # build produção (Vite)
pnpm preview      # preview do build
pnpm bundle       # gerar bundle.html auto-contido
pnpm test         # rodar testes (36 testes)
pnpm test:watch   # testes em modo watch
pnpm lint         # lint (oxlint)
npx tsc --noEmit  # checar tipos TypeScript
```

## Estrutura

```
src/
  types/index.ts              # Tipos TypeScript
  lib/
    csvParser.ts              # Parser CSV real (RFC 4180)
    cascadeLogic.ts           # Lógica de filtro cascata, avanço automático
    exporters.ts              # Exportação CSV/TSV/XLSX
  hooks/
    useLocalStorage.ts        # Persistência incremental
    useCsvParser.ts           # Hook de parsing
    useCascadeFilters.ts      # Hook central da cascata
    useDragAndDrop.ts         # Hook de drag-and-drop HTML5
  components/
    CsvImporter.tsx           # Upload com drag-and-drop + resumo
    ColumnReorder.tsx         # Reordenação visual das colunas
    MultiSelectDropdown.tsx   # Dropdown multi-seleção com busca e toggle
    CascadeFilter.tsx         # Tela principal de filtros
    FinalTable.tsx            # Tabela final com exportação
    ExportMenu.tsx            # Menu dropdown de exportação
  App.tsx                     # Orquestrador: 4 estágios
```

