# Documentação Técnica — Filtro CSV em Cascata

> Última atualização: 2026-07-10 · Versão: 1.1.0

---

## 1. Visão geral

Aplicação React 19 + TypeScript + Tailwind CSS 3 que implementa um sistema de
filtro sequencial (cascata) para arquivos CSV. Roda 100% no navegador — sem
backend, sem servidor. O bundle final é um único arquivo HTML auto-contido
gerado via Parcel.

### Estágios da aplicação

```
IMPORT  →  REORDER  →  FILTER  →  REVIEW
  1           2           3          4
```

| Estágio | Componente principal | O que faz |
|---|---|---|
| `import` | `CsvImporter` | Upload do CSV, parsing, validação |
| `reorder` | `ColumnReorder` | Drag-and-drop para definir ordem da cascata |
| `filter` | `CascadeFilter` | Seleção sequencial com dropdowns encadeados |
| `review` | `FinalTable` | Tabela consolidada + exportação |

---

## 2. Estrutura de diretórios

```
src/
  types/index.ts               # Tipos e interfaces TypeScript
  lib/
    csvParser.ts               # Parser CSV real (RFC 4180)
    cascadeLogic.ts             # Lógica pura de filtro cascata
    exporters.ts               # Exportação CSV/TSV/XLSX
  hooks/
    useLocalStorage.ts          # Persistência incremental
    useCsvParser.ts             # Hook de parsing CSV
    useCascadeFilters.ts        # Hook central da cascata
    useDragAndDrop.ts           # Drag-and-drop HTML5
  components/
    CsvImporter.tsx             # Upload + resumo pós-import
    ColumnReorder.tsx           # Reordenação visual
    MultiSelectDropdown.tsx     # Dropdown com busca e toggle multi
    CascadeFilter.tsx           # Tela principal de filtros
    FinalTable.tsx              # Tabela final com ações
    ExportMenu.tsx              # Menu dropdown de exportação
    ThemeToggle.tsx             # Alternador de temas
  App.tsx                       # Orquestrador de estágios
  main.tsx                      # Entry point
  index.css                     # Temas e estilos base
```

---

## 3. Tipos e interfaces (`src/types/index.ts`)

### `CsvRow`

```typescript
interface CsvRow {
  [columnName: string]: string;
}
```

Representa uma linha do CSV. As chaves são os nomes das colunas.

### `CsvParseResult`

```typescript
interface CsvParseResult {
  headers: string[];       // Nomes das colunas (após dedup)
  data: CsvRow[];          // Linhas de dados válidas
  errors: CsvRowError[];   // Linhas com problema (nº colunas incorreto)
}
```

### `CsvRowError`

```typescript
interface CsvRowError {
  line: number;            // Nº da linha no arquivo (1-indexed)
  expectedColumns: number;
  actualColumns: number;
  rawLine: string;         // Conteúdo truncado da linha
}
```

### `CascadeColumn`

```typescript
interface CascadeColumn {
  name: string;                // Nome original da coluna no CSV
  originalIndex: number;       // Posição no CSV (usado na tabela final)
  cascadeIndex: number;        // Posição definida pelo drag-and-drop
  locked: boolean;             // Travada entre linhas consecutivas
  selectedValues: string[];    // Valores marcados no dropdown
  autoFilled: boolean;         // Preenchida pelo avanço automático
  multiSelectEnabled: boolean; // Toggle multi-seleção ativo
}
```

### `SavedRow`

```typescript
interface SavedRow {
  id: string;                        // UUID
  values: Record<string, string>;    // Dados da linha (chave = nome coluna)
  source: 'manual' | 'auto' | 'multi-select';
  createdAt: string;                 // ISO 8601
}
```

### `AppState`

```typescript
interface AppState {
  csvHeaders: string[];
  csvData: CsvRow[];
  cascadeColumns: CascadeColumn[];
  savedRows: SavedRow[];
  partialSelection: CascadeColumn[] | null;
}
```

### `AppStage`

```typescript
type AppStage = 'import' | 'reorder' | 'filter' | 'review';
```

### `ExportFormat`

```typescript
type ExportFormat = 'csv' | 'tsv' | 'xlsx';
```

---

## 4. Biblioteca de lógica (`src/lib/`)

### 4.1 `csvParser.ts` — Parser CSV

#### `detectSeparator(firstLine: string): string`

Analisa a primeira linha e retorna o separador mais provável (`;`, `,` ou `\t`).
Empate resolve para `;` (padrão brasileiro).

#### `parseCsv(raw: string, separator?: string): CsvParseResult`

Parser completo conforme RFC 4180. Suporta:
- Campos entre aspas contendo separador, quebras de linha ou aspas escapadas (`""`)
- Detecção automática de separador
- Linhas em branco ignoradas
- Cabeçalhos vazios → `Coluna_N`
- Cabeçalhos duplicados → `Nome_2`, `Nome_3`
- Linhas com nº de colunas incorreto → reportadas em `errors`, não interrompem

**Funções internas:**
- `splitCsvLines(text)` — divide em linhas respeitando aspas
- `parseCsvLine(line, sep)` — parse de uma linha em campos
- `escapeRegex(s)` — escape para RegExp

---

### 4.2 `cascadeLogic.ts` — Lógica da cascata

#### `getUniqueValues(data: CsvRow[], columnName: string): string[]`

Retorna valores únicos de uma coluna, ordenados alfabeticamente (locale `pt-BR`).

#### `filterDataBySelections(data, columns, upToIndex): CsvRow[]`

Filtra `data` aplicando as seleções das colunas até `upToIndex`.
- **OU** dentro da mesma coluna (`selectedValues.includes(...)`)
- **E** entre colunas diferentes
- Retorna apenas linhas **reais** do array original — nunca cria combinações

#### `getMatchingRows(data, columns): CsvRow[]`

Retorna todas as linhas reais do CSV que correspondem a **todas** as seleções
atuais. Esta é a função usada para popular a tabela final.

**🚨 Regra de ouro:** nunca gera combinações artificiais. O resultado é sempre
um subconjunto das linhas do CSV original.

#### `computeAutoAdvance(data, columns, startFromIndex): Array<{columnName, value}>`

Calcula o avanço automático a partir de `startFromIndex`. Para cada coluna
seguinte que tiver exatamente 1 valor possível, retorna o par `{columnName, value}`.
Para ao encontrar uma coluna com >1 opção.

#### `allColumnsFilled(columns): boolean`

Retorna `true` se todas as colunas têm pelo menos 1 valor selecionado.

#### `hasNoCombinations(data, columns, upToIndex): boolean`

Retorna `true` se a seleção atual resultou em 0 linhas (dead end).

---

### 4.3 `exporters.ts` — Exportação

#### `toCsv(headers, rows): string`

Converte as linhas salvas para CSV com separador `;`.

#### `toTsv(headers, rows): string`

Converte para TSV (tab-separated).

#### `downloadFile(content, filename, mimeType): void`

Dispara download de arquivo no navegador via Blob + URL.createObjectURL.

#### `exportAsCsv(headers, rows): void`

Download como `.csv`.

#### `exportAsTsv(headers, rows): void`

Download como `.tsv`.

#### `exportAsXlsx(headers, rows): void`

Download como `.xls` (HTML que o Excel interpreta como planilha). Sem dependência externa.

#### `copyTsvToClipboard(headers, rows): Promise<boolean>`

Copia TSV para clipboard. Retorna `true` se sucesso.

---

## 5. Hooks (`src/hooks/`)

### 5.1 `useLocalStorage<T>(defaultValue): [T, setter, reset]`

Hook genérico de persistência. Salva no `localStorage` a cada mudança de estado.

```typescript
const [state, setState, reset] = useLocalStorage<AppState>(DEFAULT_STATE);
```

- **Key:** `csv-cascade-filter-state`
- **Reset:** limpa localStorage e volta ao default
- **Corrupção:** falha silenciosamente (retorna default)

---

### 5.2 `useCsvParser()`

```typescript
interface UseCsvParserReturn {
  result: CsvParseResult | null;
  isParsing: boolean;
  error: string | null;
  parseFile: (file: File) => Promise<void>;
  parseText: (text: string, separator?: string) => void;
  reset: () => void;
}
```

Encapsula o parsing aceitando `File` (com FileReader) ou string pura.

---

### 5.3 `useCascadeFilters()`

Hook central da aplicação. Gerencia todo o estado da cascata.

```typescript
interface UseCascadeFiltersReturn {
  columns: CascadeColumn[];
  filteredData: CsvRow[];              // Dados após último filtro
  matchingRows: CsvRow[];              // Linhas reais que batem com TODOS os filtros
  availableValues: Map<string, string[]>; // Opções disponíveis por coluna
  autoFilledColumns: Set<string>;      // Colunas preenchidas automaticamente
  deadEnd: boolean;                    // Seleção sem resultado
  initColumns: (headers, data) => void;
  reorderColumns: (newOrder) => void;
  confirmSelection: (columnName, values) => void;
  toggleLock: (columnName) => void;
  setAllLocks: (locked) => void;
  toggleMultiSelect: (columnName) => void;
  resetForNewRow: () => void;          // Limpa não-travadas, aplica avanço auto
  firstUnfilledIndex: number;
}
```

**Fluxo interno do `confirmSelection`:**
1. Atualiza `selectedValues` da coluna confirmada
2. Filtra dados até a coluna confirmada
3. Roda `computeAutoAdvance` a partir da próxima coluna
4. Marca colunas com 1 opção como `autoFilled: true`

**Fluxo interno do `resetForNewRow`:**
1. Mantém `selectedValues` das colunas travadas
2. Limpa `selectedValues` das não-travadas
3. Roda `computeAutoAdvance` a partir da primeira coluna não-travada

---

### 5.4 `useDragAndDrop(initialItems, onReorder)`

Hook genérico de drag-and-drop HTML5.

```typescript
interface UseDragAndDropReturn {
  items: string[];
  draggedIndex: number | null;
  dragOverIndex: number | null;
  handleDragStart: (index) => void;
  handleDragOver: (e, index) => void;
  handleDragLeave: () => void;
  handleDrop: (index) => void;
  handleDragEnd: () => void;
  moveItem: (from, to) => void;  // Fallback programático
}
```

---

## 6. Componentes (`src/components/`)

### 6.1 `CsvImporter`

**Props:**
```typescript
interface CsvImporterProps {
  onImport: (result: CsvParseResult) => void;
  isParsing: boolean;
  error: string | null;
}
```

Área de drop + input file. Aceita `.csv` e `.txt`. Também exporta `ImportSummary`
para exibição pós-import com resumo de colunas/linhas.

---

### 6.2 `ColumnReorder`

**Props:**
```typescript
interface ColumnReorderProps {
  columns: string[];                    // Ordem atual (vem de dragDrop.items)
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index) => void;
  onDragOver: (e, index) => void;
  onDragLeave: () => void;
  onDrop: (index) => void;
  onDragEnd: () => void;
  onContinue: () => void;
  onMoveItem: (from, to) => void;
}
```

Lista arrastável com indicadores visuais de posição (nº ordinal) e destaque no
item sobre o qual se está pairando.

---

### 6.3 `MultiSelectDropdown`

**Props:**
```typescript
interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onConfirm: (values: string[]) => void;
  disabled?: boolean;
  autoFilled?: boolean;
  locked?: boolean;
  multiSelectEnabled?: boolean;
  onToggleMultiSelect?: () => void;
  label: string;
}
```

**Comportamento:**

| Modo | Clique no valor | Botão "Confirmar" |
|---|---|---|
| Single (padrão) | Confirma imediatamente, fecha dropdown | Não aparece |
| Multi (toggle ativo) | Marca/desmarca checkbox | Aparece com contador |

**Funcionalidades:**
- Campo de busca com filtro em tempo real
- Badge visual: cadeado 🔒 (travada), raio ⚡ (auto), "Multi" roxo
- Fundo azul claro em campos auto-preenchidos
- "Selecionar visíveis" e "Limpar" no modo multi

---

### 6.4 `CascadeFilter`

**Props:**
```typescript
interface CascadeFilterProps {
  columns: CascadeColumn[];
  availableValues: Map<string, string[]>;
  autoFilledColumns: Set<string>;
  deadEnd: boolean;
  onConfirmSelection: (columnName, values) => void;
  onToggleLock: (columnName) => void;
  onSetAllLocks: (locked) => void;
  onToggleMultiSelect: (columnName) => void;
  onResetCascade: () => void;
  onGoToReview: () => void;
  totalSavedRows: number;
}
```

Tela principal de filtros. Renderiza cada coluna como um `MultiSelectDropdown`
com:
- Indicador de ordem numerado com linha vertical conectando
- Botão de trava/destrava individual
- Alerta visual quando dead end (0 resultados)
- Diálogo de confirmação para reset
- Link para tabela final com contador de linhas

---

### 6.5 `FinalTable`

**Props:**
```typescript
interface FinalTableProps {
  headers: string[];
  rows: SavedRow[];
  onBack: () => void;
  onDelete: (id) => void;
  onClearAll: () => void;
  onExport: (format: ExportFormat) => void;
  onCopy: () => void;
}
```

Tabela com colunas na ordem original do CSV. Cada linha mostra:
- Ícone de fonte: 🖱️ manual, ⚡ automático, 👥 multi-seleção
- Botão de excluir (com diálogo de confirmação)
- Botão "Limpar tabela" (remove todas as linhas, preserva CSV e configs)

Estado vazio mostra mensagem com link para voltar aos filtros.

---

### 6.6 `ExportMenu`

**Props:**
```typescript
interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  onCopy: () => void;
}
```

Dropdown com opções CSV, TSV, Excel + botão de copiar TSV.

---

### 6.7 `ThemeToggle`

Componente autônomo. Alterna entre 3 temas em ciclo: claro → escuro → pastel.

- Armazena preferência em `localStorage` (`csv-cascade-theme`)
- Detecta `prefers-color-scheme: dark` na primeira visita
- Seta `data-theme` no `<html>` + classe `.dark` para compatibilidade Tailwind
- Ícone muda conforme tema ativo: ☀️ 🌙 🎨

---

## 7. Sistema de temas (`src/index.css`)

Três temas definidos via custom properties HSL consumidas pelo `tailwind.config.js`:

```
hsl(var(--background)) ─── bg-background
hsl(var(--foreground)) ─── text-foreground
hsl(var(--card))       ─── bg-card
hsl(var(--primary))    ─── bg-primary
...
```

### Tema Claro (`:root` / `[data-theme="light"]`)

Fundo cinza-azulado claro, azul profissional (#2456c4), bordas sutis.

### Tema Escuro (`.dark` / `[data-theme="dark"]`)

Fundo azul-escuro (#0d1017), azul elétrico (#6c93ee), contraste otimizado.

### Tema Pastel (`[data-theme="pastel"]`)

Fundo creme quente, rosa primário, verde-água secundário, bordas arredondadas (0.75rem).

### Mecanismo de troca

```
ThemeToggle → applyTheme('pastel')
  → html.setAttribute('data-theme', 'pastel')
  → html.classList.remove('dark')
  → CSS: [data-theme="pastel"] redefine --background, --foreground, ...
  → Todos os componentes re-renderizam com novas cores
```

---

## 8. Fluxo de dados completo

### 8.1 Importação

```
Usuário dropa arquivo .csv
  → CsvImporter.handleDrop(file)
  → parseCsv(await file.text())
  → App.handleImport(result)
  → cascade.initColumns(result.headers, result.data)
  → setAppState({ csvHeaders, csvData })
  → setStage('reorder')
```

### 8.2 Reordenação

```
Usuário arrasta colunas
  → dragDrop.handleDrop(idx)
  → dragDrop.items atualizado
  → ColumnReorder re-renderiza com nova ordem
Usuário clica "Iniciar Filtros"
  → cascade.reorderColumns(dragDrop.items)
  → cascade.resetForNewRow()
  → setStage('filter')
```

### 8.3 Filtragem

```
Usuário abre dropdown da coluna N
  → availableValues.get(col.name) → opções já filtradas
Usuário seleciona valor (single) ou confirma (multi)
  → cascade.confirmSelection(colName, values)
  → Recalcula filteredData
  → computeAutoAdvance → preenche colunas com 1 opção
  → Se allColumnsFilled → efeito em App.tsx dispara
```

### 8.4 Envio automático

```
Efeito em App.tsx detecta allColumnsFilled(columns)
  → matchingRows = cascade.matchingRows (getMatchingRows)
  → Para cada matchingRow: verifica duplicata (shallowEqual)
  → Novas linhas → adiciona em savedRows
  → Duplicatas → ignora com toast
  → setAppState({ savedRows: [...prev, ...newRows] })
  → cascade.resetForNewRow() → começa próxima linha
```

### 8.5 Revisão e exportação

```
Usuário navega para review (ou acumula linhas e vai)
  → FinalTable renderiza savedRows com colunas na ordem original
  → Exportar: exportAsCsv/Tsv/Xlsx ou copyTsvToClipboard
  → Limpar tabela: handleClearAllRows → zera savedRows
  → Excluir linha: handleDeleteRow → filtra por id
```

---

## 9. Persistência

Toda mudança de estado relevante dispara `setAppState`, que persiste
automaticamente no `localStorage` via hook `useLocalStorage`.

**O que é salvo:**
- Cabeçalhos e dados do CSV
- Ordem da cascata (cascadeColumns)
- Linhas na tabela final (savedRows)
- Seleção parcial em andamento (partialSelection)

**Recuperação:** ao carregar a página, `useLocalStorage` lê o `localStorage`.
Se houver dados, a aplicação restaura o estado e volta ao estágio correto.

**Reset:** botão "Resetar" na tela de filtros ou "Limpar sessão" remove tudo.

---

## 10. Proteção contra duplicatas

Ao enviar linhas para a tabela final, cada candidata é comparada com as linhas
já salvas usando `shallowEqual` (compara todas as chaves/valores dos objetos
`values`). Linhas idênticas são ignoradas com toast informativo.

---

## 11. CI/CD (`.github/workflows/`)

### `ci.yml`

| Job | Gatilho | Ações |
|---|---|---|
| `test` | push/PR na main | pnpm install → tsc --noEmit → pnpm test |
| `bundle` | após test passar | pnpm bundle → upload artifact (30 dias) |
| `release` | tag push (`v*`) | download artifact → anexa na GitHub Release |

### `pr-check.yml`

| Job | Gatilho | Ações |
|---|---|---|
| `title` | PR aberto/editado | Valida título contra Conventional Commits |

### Proteção da branch `main`

- Push direto bloqueado
- Status checks obrigatórios: `test`, `bundle`, `title`
- Force push e deleção bloqueados
- Admins inclusos nas regras

---

## 12. Comandos

```bash
pnpm install      # Instalar dependências
pnpm dev          # Dev server (Vite HMR)
pnpm build        # Build produção (tsc + Vite)
pnpm bundle       # Bundle auto-contido (Parcel → bundle.html)
pnpm test         # Testes unitários (Vitest, 36 testes)
pnpm test:watch   # Testes em modo watch
pnpm lint         # Lint (oxlint)
npx tsc --noEmit  # Checar tipos
```

---

## 13. Stack tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | React | 19.x |
| Linguagem | TypeScript | 6.x |
| Estilos | Tailwind CSS | 3.4.x |
| Componentes | shadcn/ui (Radix) | — |
| Build (dev) | Vite | 8.x |
| Build (bundle) | Parcel + html-inline | 2.x |
| Testes | Vitest + Testing Library | 4.x / 16.x |
| Lint | oxlint | 1.x |
| Pacotes | pnpm | 11.x |
| CI/CD | GitHub Actions | — |
