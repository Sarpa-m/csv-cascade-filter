import { useState, useCallback, useMemo } from 'react';
import type { CsvRow, CascadeColumn } from '@/types';
import {
  filterDataBySelections,
  getUniqueValues,
  computeAutoAdvance,
  getMatchingRows,
  hasNoCombinations,
} from '@/lib/cascadeLogic';

interface UseCascadeFiltersReturn {
  columns: CascadeColumn[];
  /** Dados filtrados até a última coluna com seleção confirmada */
  filteredData: CsvRow[];
  /** Linhas REAIS do CSV que correspondem a TODAS as seleções atuais */
  matchingRows: CsvRow[];
  /** Valores disponíveis para cada coluna (considerando filtros anteriores) */
  availableValues: Map<string, string[]>;
  /** Colunas que foram preenchidas por avanço automático neste ciclo */
  autoFilledColumns: Set<string>;
  /** true quando uma seleção resulta em 0 combinações */
  deadEnd: boolean;
  /** Inicializa/reseta as colunas a partir dos headers do CSV.
   * Aceita opcionalmente colunas salvas de uma sessão anterior. */
  initColumns: (
    headers: string[],
    data: CsvRow[],
    savedColumns?: CascadeColumn[],
  ) => void;
  /** Atualiza a ordem das colunas (drag-and-drop) */
  reorderColumns: (newOrder: string[]) => void;
  /** Confirma a seleção de uma coluna */
  confirmSelection: (columnName: string, values: string[]) => void;
  /** Alterna o travamento de uma coluna */
  toggleLock: (columnName: string) => void;
  /** Trava ou destrava todas as colunas */
  setAllLocks: (locked: boolean) => void;
  /** Alterna o modo multi-seleção de uma coluna */
  toggleMultiSelect: (columnName: string) => void;
  /** Reinicia a cascata para uma nova linha (respeita travamentos) */
  resetForNewRow: () => void;
  /** Índice da primeira coluna não preenchida */
  firstUnfilledIndex: number;
}

export function useCascadeFilters(): UseCascadeFiltersReturn {
  const [columns, setColumns] = useState<CascadeColumn[]>([]);
  const [allData, setAllData] = useState<CsvRow[]>([]);
  const [autoFilledColumns, setAutoFilledColumns] = useState<Set<string>>(new Set());

  const initColumns = useCallback(
    (headers: string[], data: CsvRow[], savedColumns?: CascadeColumn[]) => {
      // Se houver colunas salvas de uma sessão anterior, restaura-as
      // preservando locks, selectedValues, multiSelectEnabled, etc.
      if (savedColumns && savedColumns.length > 0) {
        setColumns(savedColumns);
      } else {
        const cols: CascadeColumn[] = headers.map((name, i) => ({
          name,
          originalIndex: i,
          cascadeIndex: i,
          locked: false,
          selectedValues: [],
          autoFilled: false,
          multiSelectEnabled: false,
        }));
        setColumns(cols);
      }
      setAllData(data);
      setAutoFilledColumns(new Set());
    },
    [],
  );

  const reorderColumns = useCallback((newOrder: string[]) => {
    setColumns((prev) => {
      // Se o estado anterior está vazio (ex.: restaurando de localStorage sem
      // initColumns prévio), cria colunas frescas a partir da nova ordem.
      if (prev.length === 0) {
        return newOrder.map((name, i) => ({
          name,
          originalIndex: i,
          cascadeIndex: i,
          locked: false,
          selectedValues: [],
          autoFilled: false,
          multiSelectEnabled: false,
        }));
      }

      const nameToCol = new Map(prev.map((c) => [c.name, c]));
      return newOrder.map((name, i) => {
        const col = nameToCol.get(name);
        // Se a coluna não existir no estado anterior (nunca deveria acontecer,
        // mas defensivamente), cria uma nova em vez de retornar undefined.
        if (!col) {
          return {
            name,
            originalIndex: i,
            cascadeIndex: i,
            locked: false,
            selectedValues: [],
            autoFilled: false,
            multiSelectEnabled: false,
          };
        }
        return {
          ...col,
          cascadeIndex: i,
          selectedValues: [],
          autoFilled: false,
        };
      });
    });
    setAutoFilledColumns(new Set());
  }, []);

  const confirmSelection = useCallback(
    (columnName: string, values: string[]) => {
      setColumns((prev) => {
        const updated = prev.map((col) =>
          col.name === columnName
            ? { ...col, selectedValues: values, autoFilled: false }
            : col,
        );

        // Rodar avanço automático a partir da próxima coluna
        const sorted = [...updated].sort((a, b) => a.cascadeIndex - b.cascadeIndex);
        const confirmedIdx = sorted.findIndex((c) => c.name === columnName);

        // Filtrar dados até a coluna confirmada
        let filtered = allData;
        for (const col of sorted) {
          if (col.cascadeIndex <= confirmedIdx) {
            if (col.selectedValues.length > 0) {
              filtered = filtered.filter((r) =>
                col.selectedValues.includes(r[col.name]),
              );
            }
          }
        }

        // Calcular avanço automático a partir da próxima
        const autoAdvances = computeAutoAdvance(allData, updated, confirmedIdx + 1);

        const newAutoFilled = new Set<string>();
        let modified = updated;
        for (const { columnName: autoCol, value } of autoAdvances) {
          modified = modified.map((col) =>
            col.name === autoCol
              ? { ...col, selectedValues: [value], autoFilled: true }
              : col,
          );
          newAutoFilled.add(autoCol);
        }

        setAutoFilledColumns(newAutoFilled);
        return modified;
      });
    },
    [allData],
  );

  const toggleLock = useCallback((columnName: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.name === columnName ? { ...col, locked: !col.locked } : col,
      ),
    );
  }, []);

  const setAllLocks = useCallback((locked: boolean) => {
    setColumns((prev) => prev.map((col) => ({ ...col, locked })));
  }, []);

  const toggleMultiSelect = useCallback((columnName: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.name === columnName
          ? {
              ...col,
              multiSelectEnabled: !col.multiSelectEnabled,
              // Se desligar multi-seleção e tiver múltiplos valores, mantém só o primeiro
              selectedValues:
                col.multiSelectEnabled && col.selectedValues.length > 1
                  ? [col.selectedValues[0]]
                  : col.selectedValues,
            }
          : col,
      ),
    );
  }, []);

  const resetForNewRow = useCallback(() => {
    setColumns((prev) => {
      let updated = prev.map((col) =>
        col.locked
          ? { ...col, autoFilled: false }
          : { ...col, selectedValues: [], autoFilled: false },
      );

      // Avanço automático com colunas travadas
      const sorted = [...updated].sort((a, b) => a.cascadeIndex - b.cascadeIndex);
      const firstUnlockedIdx = sorted.findIndex((c) => !c.locked);

      const autoAdvances = computeAutoAdvance(allData, updated, firstUnlockedIdx);

      const newAutoFilled = new Set<string>();
      for (const { columnName: autoCol, value } of autoAdvances) {
        updated = updated.map((col) =>
          col.name === autoCol
            ? { ...col, selectedValues: [value], autoFilled: true }
            : col,
        );
        newAutoFilled.add(autoCol);
      }

      setAutoFilledColumns(newAutoFilled);
      return updated;
    });
  }, [allData]);

  // Dados filtrados até a última coluna preenchida
  const filteredData = useMemo(() => {
    const sorted = [...columns].sort((a, b) => a.cascadeIndex - b.cascadeIndex);
    const lastFilledIdx = sorted.reduce((max, col) => {
      if (col.selectedValues.length > 0 && col.cascadeIndex > max) {
        return col.cascadeIndex;
      }
      return max;
    }, -1);

    if (lastFilledIdx < 0) return allData;
    return filterDataBySelections(allData, columns, lastFilledIdx);
  }, [columns, allData]);

  // Linhas REAIS do CSV que correspondem a TODAS as seleções
  const matchingRows = useMemo(() => {
    if (columns.length === 0) return [];
    return getMatchingRows(allData, columns);
  }, [columns, allData]);

  // Valores disponíveis para cada coluna
  const availableValues = useMemo(() => {
    const map = new Map<string, string[]>();
    const sorted = [...columns].sort((a, b) => a.cascadeIndex - b.cascadeIndex);

    for (const col of sorted) {
      // Aplica filtros das colunas anteriores
      const prevCols = sorted.filter((c) => c.cascadeIndex < col.cascadeIndex);
      let relevantData = allData;
      for (const pc of prevCols) {
        if (pc.selectedValues.length > 0) {
          relevantData = relevantData.filter((r) =>
            pc.selectedValues.includes(r[pc.name]),
          );
        }
      }
      map.set(col.name, getUniqueValues(relevantData, col.name));
    }

    return map;
  }, [columns, allData]);

  // Verificar dead end
  const deadEnd = useMemo(() => {
    const sorted = [...columns].sort((a, b) => a.cascadeIndex - b.cascadeIndex);
    const lastFilled = sorted.reduce(
      (max, col) =>
        col.selectedValues.length > 0 && col.cascadeIndex > max
          ? col.cascadeIndex
          : max,
      -1,
    );
    if (lastFilled < 0) return false;
    return hasNoCombinations(allData, columns, lastFilled);
  }, [columns, allData]);

  // Primeira coluna não preenchida
  const firstUnfilledIndex = useMemo(() => {
    const sorted = [...columns].sort((a, b) => a.cascadeIndex - b.cascadeIndex);
    const first = sorted.find((col) => col.selectedValues.length === 0);
    return first ? first.cascadeIndex : columns.length;
  }, [columns]);

  return {
    columns,
    filteredData,
    matchingRows,
    availableValues,
    autoFilledColumns,
    deadEnd,
    initColumns,
    reorderColumns,
    confirmSelection,
    toggleLock,
    setAllLocks,
    toggleMultiSelect,
    resetForNewRow,
    firstUnfilledIndex,
  };
}
