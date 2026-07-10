import type { CsvRow, CascadeColumn } from '@/types';

/**
 * Retorna os valores únicos de uma coluna dentro do subconjunto de dados,
 * ordenados alfabeticamente.
 */
export function getUniqueValues(
  data: CsvRow[],
  columnName: string,
): string[] {
  const values = new Set<string>();
  for (const row of data) {
    const v = row[columnName];
    if (v !== undefined) {
      values.add(v);
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Filtra o conjunto de dados aplicando as seleções das colunas
 * na ordem da cascata.
 *
 * - Lógica "OU" dentro da mesma coluna (se multi-select ativo com vários valores).
 * - Lógica "E" entre colunas diferentes.
 * - Colunas sem seleção são ignoradas (não filtram).
 *
 * @param data - Conjunto completo de dados CSV
 * @param columns - Colunas da cascata com suas seleções atuais
 * @param upToIndex - Filtrar usando colunas até este cascadeIndex (inclusive)
 * @returns Linhas REAIS do CSV que passam em todos os filtros
 */
export function filterDataBySelections(
  data: CsvRow[],
  columns: CascadeColumn[],
  upToIndex: number,
): CsvRow[] {
  const sorted = [...columns].sort((a, b) => a.cascadeIndex - b.cascadeIndex);

  return data.filter((row) => {
    for (const col of sorted) {
      if (col.cascadeIndex > upToIndex) break;
      if (col.selectedValues.length === 0) continue;
      // OU dentro da coluna: o valor da linha deve estar entre os selecionados
      if (!col.selectedValues.includes(row[col.name])) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Retorna as linhas REAIS do CSV que correspondem a todas as seleções atuais.
 * Esta é a função usada para gerar linhas da tabela final — NUNCA gera
 * combinações artificiais.
 */
export function getMatchingRows(
  data: CsvRow[],
  columns: CascadeColumn[],
): CsvRow[] {
  const sorted = [...columns].sort((a, b) => a.cascadeIndex - b.cascadeIndex);
  const maxIndex = sorted.length > 0 ? sorted[sorted.length - 1].cascadeIndex : 0;
  return filterDataBySelections(data, columns, maxIndex);
}

/**
 * Determina quais colunas devem ser preenchidas automaticamente (avanço automático).
 * Dado um subconjunto de dados e a posição atual na cascata, retorna os nomes
 * e valores das colunas seguintes que têm exatamente 1 opção possível.
 *
 * Retorna um array de {columnName, value} para preenchimento automático em sequência.
 */
export function computeAutoAdvance(
  data: CsvRow[],
  columns: CascadeColumn[],
  startFromIndex: number,
): Array<{ columnName: string; value: string }> {
  const result: Array<{ columnName: string; value: string }> = [];
  const sorted = [...columns].sort((a, b) => a.cascadeIndex - b.cascadeIndex);

  let filtered = data;
  // Aplica filtros de todas as colunas já preenchidas
  for (const col of sorted) {
    if (col.cascadeIndex < startFromIndex) {
      if (col.selectedValues.length > 0) {
        filtered = filtered.filter((r) => col.selectedValues.includes(r[col.name]));
      }
    }
  }

  // Avança sequencialmente, verificando se cada próxima coluna tem 1 única opção
  let currentData = filtered;
  for (const col of sorted) {
    if (col.cascadeIndex < startFromIndex) continue;

    const unique = getUniqueValues(currentData, col.name);
    if (unique.length === 1) {
      result.push({ columnName: col.name, value: unique[0] });
      // Filtra com esse valor para a próxima iteração
      currentData = currentData.filter((r) => r[col.name] === unique[0]);
    } else {
      break; // para ao encontrar coluna com mais de 1 opção
    }
  }

  return result;
}

/**
 * Verifica se todas as colunas estão preenchidas (pelo menos 1 valor selecionado).
 */
export function allColumnsFilled(columns: CascadeColumn[]): boolean {
  return columns.every((col) => col.selectedValues.length > 0);
}

/**
 * Verifica se a seleção atual resultou em 0 linhas reais.
 */
export function hasNoCombinations(
  data: CsvRow[],
  columns: CascadeColumn[],
  upToIndex: number,
): boolean {
  const filtered = filterDataBySelections(data, columns, upToIndex);
  return filtered.length === 0;
}
