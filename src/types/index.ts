/** Linha de dados do CSV: chave = nome da coluna, valor = string */
export interface CsvRow {
  [columnName: string]: string;
}

/** Resultado do parsing de CSV */
export interface CsvParseResult {
  headers: string[];
  data: CsvRow[];
  /** Linhas com número incorreto de colunas (número da linha + detalhes) */
  errors: CsvRowError[];
}

export interface CsvRowError {
  line: number; // número da linha no arquivo original (1-indexed, cabeçalho = 1)
  expectedColumns: number;
  actualColumns: number;
  rawLine: string;
}

/** Coluna na cascata de seleção */
export interface CascadeColumn {
  name: string; // nome original da coluna no CSV
  originalIndex: number; // posição original no CSV (para a tabela final)
  cascadeIndex: number; // posição definida pelo drag-and-drop do usuário
  locked: boolean;
  selectedValues: string[];
  autoFilled: boolean; // true quando preenchido pelo avanço automático
  multiSelectEnabled: boolean; // toggle para permitir múltiplos valores (default: false)
}

/** Linha salva na tabela final */
export interface SavedRow {
  id: string;
  values: Record<string, string>; // chave = nome original da coluna
  source: 'manual' | 'auto' | 'multi-select';
  createdAt: string;
}

/** Entrada do histórico de tabelas */
export interface TableHistory {
  id: string;
  name: string;
  rows: SavedRow[];
  createdAt: string;
  rowCount: number; // desnormalizado para exibição rápida
}

/** Estado completo da aplicação (persistido em localStorage) */
export interface AppState {
  csvHeaders: string[];
  csvData: CsvRow[];
  cascadeColumns: CascadeColumn[];
  savedRows: SavedRow[];
  tableHistory: TableHistory[];
  currentListName: string;
  /** Colunas atualmente sendo preenchidas (cascata parcial não finalizada) */
  partialSelection: CascadeColumn[] | null;
}

/** Possíveis estágios da aplicação */
export type AppStage =
  | 'import' // Aguardando importação do CSV
  | 'reorder' // Reordenando colunas
  | 'filter' // Preenchendo a cascata de filtros
  | 'review'; // Revisando a tabela final

export type ExportFormat = 'csv' | 'tsv' | 'xlsx';
