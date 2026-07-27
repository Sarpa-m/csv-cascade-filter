import { describe, it, expect } from 'vitest';
import {
  getUniqueValues,
  filterDataBySelections,
  computeAutoAdvance,
  getMatchingRows,
  allColumnsFilled,
  hasNoCombinations,
} from '../cascadeLogic';
import type { CsvRow, CascadeColumn } from '@/types';

function makeCol(
  name: string,
  cascadeIndex: number,
  originalIndex: number,
  selected: string[] = [],
  locked = false,
  autoFilled = false,
  multiSelectEnabled = false,
): CascadeColumn {
  return {
    name,
    cascadeIndex,
    originalIndex,
    selectedValues: selected,
    locked,
    autoFilled,
    multiSelectEnabled,
    visible: true,
  };
}

const sampleData: CsvRow[] = [
  { Nome: 'Alice', Cidade: 'SP', Setor: 'TI' },
  { Nome: 'Bob', Cidade: 'SP', Setor: 'RH' },
  { Nome: 'Charlie', Cidade: 'RJ', Setor: 'TI' },
  { Nome: 'Diana', Cidade: 'RJ', Setor: 'RH' },
  { Nome: 'Eve', Cidade: 'BH', Setor: 'TI' },
];

describe('getUniqueValues', () => {
  it('returns sorted unique values for a column', () => {
    const values = getUniqueValues(sampleData, 'Cidade');
    expect(values).toEqual(['BH', 'RJ', 'SP']);
  });

  it('returns empty array for missing column', () => {
    const values = getUniqueValues(sampleData, 'Inexistente');
    expect(values).toEqual([]);
  });
});

describe('filterDataBySelections', () => {
  it('filters by one column selection', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      makeCol('Setor', 1, 1),
    ];
    const result = filterDataBySelections(sampleData, cols, 0);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.Nome)).toEqual(['Alice', 'Bob']);
  });

  it('filters by two columns (AND logic between columns)', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      makeCol('Setor', 1, 1, ['TI']),
    ];
    const result = filterDataBySelections(sampleData, cols, 1);
    expect(result).toHaveLength(1);
    expect(result[0].Nome).toBe('Alice');
  });

  it('filters with OR logic within same column (multi-select)', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP', 'RJ']),
    ];
    const result = filterDataBySelections(sampleData, cols, 0);
    expect(result).toHaveLength(4);
  });

  it('returns all data when no selections', () => {
    const cols = [
      makeCol('Cidade', 0, 0),
    ];
    const result = filterDataBySelections(sampleData, cols, 0);
    expect(result).toHaveLength(5);
  });

  it('only applies filters up to upToIndex', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      makeCol('Setor', 1, 1, ['TI']),
    ];
    // Only apply first column's filter
    const result = filterDataBySelections(sampleData, cols, 0);
    expect(result).toHaveLength(2); // SP only
  });
});

describe('getMatchingRows', () => {
  it('returns only REAL CSV rows that match all filters', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      makeCol('Setor', 1, 1, ['TI']),
    ];
    const result = getMatchingRows(sampleData, cols);
    expect(result).toHaveLength(1);
    // Alice is the only real row with SP + TI
    expect(result[0]).toEqual({ Nome: 'Alice', Cidade: 'SP', Setor: 'TI' });
  });

  it('never creates rows that do not exist in original CSV', () => {
    // User selects Nome=[Alice, Bob] and Cidade=[SP]
    // The only REAL rows matching are: Alice/SP (Bob is SP but... wait, Bob IS SP)
    // Wait: Alice/SP/TI and Bob/SP/RH both match SP
    const cols = [
      makeCol('Nome', 0, 0, ['Alice', 'Bob']),
      makeCol('Cidade', 1, 1, ['SP']),
    ];
    const result = getMatchingRows(sampleData, cols);
    // BOTH Alice and Bob are in SP in the real CSV
    expect(result).toHaveLength(2);
    expect(result[0].Nome).toBe('Alice');
    expect(result[1].Nome).toBe('Bob');
  });

  it('does NOT generate cartesian product combinations', () => {
    // If we select Cidade=[SP, RJ] and Setor=[TI, RH]
    // Cartesian product would be 4 rows: SP/TI, SP/RH, RJ/TI, RJ/RH
    // But the REAL CSV has: Alice(SP/TI), Bob(SP/RH), Charlie(RJ/TI), Diana(RJ/RH) = 4
    // and also Eve(BH/TI) which has BH, not in our filter
    // So we should get 4 real rows, NOT 4 generated rows
    const cols = [
      makeCol('Cidade', 0, 0, ['SP', 'RJ']),
      makeCol('Setor', 1, 1, ['TI', 'RH']),
    ];
    const result = getMatchingRows(sampleData, cols);
    // All 4 rows with SP/RJ match the TI/RH filter
    expect(result).toHaveLength(4);
    // Verify they are all real CSV rows
    const names = result.map((r) => r.Nome).sort();
    expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana']);
    // Eve is NOT included (BH not in filter)
    expect(names).not.toContain('Eve');
  });

  it('returns empty when no real rows match all filters', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      makeCol('Setor', 1, 1, ['Financeiro']), // No one in SP has Setor=Financeiro
    ];
    const result = getMatchingRows(sampleData, cols);
    expect(result).toHaveLength(0);
  });
});

describe('computeAutoAdvance', () => {
  it('returns next column when it has exactly 1 option', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['BH']),
      makeCol('Setor', 1, 1),
      makeCol('Nome', 2, 2),
    ];
    const result = computeAutoAdvance(sampleData, cols, 1);
    expect(result).toEqual([
      { columnName: 'Setor', value: 'TI' },
      { columnName: 'Nome', value: 'Eve' },
    ]);
  });

  it('returns empty when next column has multiple options', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      makeCol('Setor', 1, 1),
      makeCol('Nome', 2, 2),
    ];
    const result = computeAutoAdvance(sampleData, cols, 1);
    expect(result).toEqual([]);
  });

  it('chains auto-advance through multiple columns', () => {
    const data: CsvRow[] = [{ A: 'X', B: 'Y', C: 'Z' }];
    const cols = [
      makeCol('A', 0, 0, ['X']),
      makeCol('B', 1, 1),
      makeCol('C', 2, 2),
    ];
    const result = computeAutoAdvance(data, cols, 1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ columnName: 'B', value: 'Y' });
    expect(result[1]).toEqual({ columnName: 'C', value: 'Z' });
  });
});

describe('allColumnsFilled', () => {
  it('returns true when all columns have values', () => {
    const cols = [
      makeCol('A', 0, 0, ['1']),
      makeCol('B', 1, 1, ['2']),
    ];
    expect(allColumnsFilled(cols)).toBe(true);
  });

  it('returns false when any column is empty', () => {
    const cols = [
      makeCol('A', 0, 0, ['1']),
      makeCol('B', 1, 1),
    ];
    expect(allColumnsFilled(cols)).toBe(false);
  });
});

describe('hasNoCombinations', () => {
  it('returns false when there are matching rows', () => {
    const cols = [makeCol('Cidade', 0, 0, ['SP'])];
    expect(hasNoCombinations(sampleData, cols, 0)).toBe(false);
  });

  it('returns true when no rows match', () => {
    const cols = [makeCol('Cidade', 0, 0, ['Londres'])];
    expect(hasNoCombinations(sampleData, cols, 0)).toBe(true);
  });

  it('returns true for multi-column dead end', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      makeCol('Setor', 1, 1, ['Financeiro']),
    ];
    expect(hasNoCombinations(sampleData, cols, 1)).toBe(true);
  });
});

describe('hidden columns (visible: false)', () => {
  it('filterDataBySelections skips hidden columns', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      { ...makeCol('Setor', 1, 1, ['TI']), visible: false },
    ];
    // Hidden Setor=TI should NOT filter — returns all SP rows (Alice, Bob)
    const result = filterDataBySelections(sampleData, cols, 1);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.Nome).sort()).toEqual(['Alice', 'Bob']);
  });

  it('allColumnsFilled ignores hidden columns', () => {
    const cols = [
      makeCol('A', 0, 0, ['1']),
      { ...makeCol('B', 1, 1), visible: false },
      { ...makeCol('C', 2, 2), visible: false },
    ];
    // Only column A is visible and it's filled → should be true
    expect(allColumnsFilled(cols)).toBe(true);
  });

  it('allColumnsFilled returns false when a visible column is empty', () => {
    const cols = [
      makeCol('A', 0, 0, ['1']),
      { ...makeCol('B', 1, 1), visible: false },
      makeCol('C', 2, 2), // visible but empty
    ];
    expect(allColumnsFilled(cols)).toBe(false);
  });

  it('computeAutoAdvance skips hidden columns', () => {
    const data: CsvRow[] = [{ A: 'X', B: 'Y', C: 'Z' }];
    const cols = [
      makeCol('A', 0, 0, ['X']),
      { ...makeCol('B', 1, 1), visible: false },
      makeCol('C', 2, 2),
    ];
    // B is hidden, so C should be checked for auto-advance
    const result = computeAutoAdvance(data, cols, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ columnName: 'C', value: 'Z' });
  });

  it('all hidden columns means allColumnsFilled returns true', () => {
    const cols = [
      { ...makeCol('A', 0, 0), visible: false },
      { ...makeCol('B', 1, 1), visible: false },
    ];
    expect(allColumnsFilled(cols)).toBe(true);
  });

  it('hidden columns still appear in matching rows (values preserved for final table)', () => {
    const cols = [
      makeCol('Cidade', 0, 0, ['SP']),
      { ...makeCol('Setor', 1, 1), visible: false },
    ];
    const result = getMatchingRows(sampleData, cols);
    // Setor is hidden so doesn't filter, returns all SP rows
    expect(result).toHaveLength(2);
    // Both rows still have Setor values (preserved for final table)
    expect(result.every((r) => 'Setor' in r)).toBe(true);
  });
});
