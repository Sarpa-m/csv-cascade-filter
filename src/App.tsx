import React, { useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { CsvImporter } from '@/components/CsvImporter';
import { ColumnReorder } from '@/components/ColumnReorder';
import { CascadeFilter } from '@/components/CascadeFilter';
import { FinalTable } from '@/components/FinalTable';
import { useCsvParser } from '@/hooks/useCsvParser';
import { useCascadeFilters } from '@/hooks/useCascadeFilters';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { allColumnsFilled } from '@/lib/cascadeLogic';
import { exportAsCsv, exportAsTsv, exportAsXlsx, copyTsvToClipboard } from '@/lib/exporters';
import type { AppState, SavedRow, ExportFormat } from '@/types';

type AppStage = 'import' | 'reorder' | 'filter' | 'review';

/** Compara dois objetos planos (string → string) por valor */
function shallowEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

const DEFAULT_STATE: AppState = {
  csvHeaders: [],
  csvData: [],
  cascadeColumns: [],
  savedRows: [],
  partialSelection: null,
};

function App() {
  const [appState, setAppState, resetState] = useLocalStorage<AppState>(DEFAULT_STATE);
  const [stage, setStage] = React.useState<AppStage>(
    appState.csvHeaders.length > 0
      ? appState.cascadeColumns.length > 0
        ? 'filter'
        : 'reorder'
      : 'import',
  );

  const { isParsing, error: parseError } = useCsvParser();
  const cascade = useCascadeFilters();
  const dragDrop = useDragAndDrop(appState.csvHeaders, () => {});

  const autoSubmitLock = React.useRef(false);

  // --- Handlers ---

  const handleImport = useCallback(
    (result: { headers: string[]; data: Record<string, string>[]; errors: unknown[] }) => {
      setAppState((prev) => ({
        ...prev,
        csvHeaders: result.headers,
        csvData: result.data as AppState['csvData'],
        cascadeColumns: [],
        savedRows: prev.savedRows,
        partialSelection: null,
      }));
      setStage('reorder');
      cascade.initColumns(result.headers, result.data as AppState['csvData']);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} linha(s) ignoradas por formato incorreto.`);
      }
      toast.success(`${result.data.length} linhas importadas.`);
    },
    [setAppState, cascade],
  );

  const handleReorderContinue = useCallback((orderedHeaders: string[]) => {
    // Reordenar as colunas da cascata com a ordem escolhida
    cascade.reorderColumns(orderedHeaders);
    setStage('filter');
    autoSubmitLock.current = false;
    // resetForNewRow roda no próximo tick para garantir que reorderColumns já aplicou
    setTimeout(() => cascade.resetForNewRow(), 0);
  }, [cascade]);

  const handleConfirmSelection = useCallback(
    (columnName: string, values: string[]) => {
      cascade.confirmSelection(columnName, values);
    },
    [cascade],
  );

  // Efeito: auto-submit quando todas as colunas estão preenchidas
  // Usa matchingRows — SOMENTE linhas reais do CSV que passaram em todos os filtros
  React.useEffect(() => {
    if (stage !== 'filter') return;
    if (autoSubmitLock.current) return;
    if (!allColumnsFilled(cascade.columns)) return;
    if (cascade.columns.every((c) => c.selectedValues.length === 0)) return;

    autoSubmitLock.current = true;

    // matchingRows são as linhas REAIS do CSV — nunca combinações artificiais
    const matchedRows = cascade.matchingRows;

    if (matchedRows.length === 0) {
      // Nenhuma linha real corresponde — dead end, mas não trava
      autoSubmitLock.current = false;
      return;
    }

    const allAuto = cascade.columns.every((c) => c.autoFilled);
    const hasMultiSelect = cascade.columns.some((c) => c.multiSelectEnabled && c.selectedValues.length > 1);

    setAppState((prev) => {
      // Verificar duplicatas: comparar valores de cada linha candidata com as já salvas
      const newRows: SavedRow[] = [];
      const skipped: number[] = [];

      for (let i = 0; i < matchedRows.length; i++) {
        const candidate = matchedRows[i];
        const isDuplicate = prev.savedRows.some((existing) =>
          shallowEqual(existing.values, candidate),
        );

        if (isDuplicate) {
          skipped.push(i);
        } else {
          newRows.push({
            id: crypto.randomUUID(),
            values: { ...candidate },
            source: hasMultiSelect ? 'multi-select' : allAuto ? 'auto' : 'manual',
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Feedback
      if (newRows.length === 0) {
        toast.warning('Nenhuma linha nova — todas já existem na lista.');
      } else if (newRows.length === 1) {
        toast.success('1 linha adicionada');
      } else {
        toast.success(`${newRows.length} linhas adicionadas`);
      }

      if (skipped.length > 0) {
        toast.info(`${skipped.length} duplicata(s) ignorada(s).`, { duration: 3000 });
      }

      return {
        ...prev,
        savedRows: [...prev.savedRows, ...newRows],
        partialSelection: null,
      };
    });

    // Delay para o usuário ver o feedback antes do reset
    setTimeout(() => {
      autoSubmitLock.current = false;
      cascade.resetForNewRow();
    }, 400);
  }, [cascade.columns, stage]);

  const handleReset = useCallback(() => {
    resetState();
    cascade.initColumns([], []);
    autoSubmitLock.current = false;
    setStage('import');
    toast.info('Sessão resetada.');
  }, [resetState, cascade]);

  const handleDeleteRow = useCallback(
    (id: string) => {
      setAppState((prev) => ({
        ...prev,
        savedRows: prev.savedRows.filter((r) => r.id !== id),
      }));
      toast.success('Linha removida.');
    },
    [setAppState],
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const headers = appState.csvHeaders;
      const rows = appState.savedRows;
      switch (format) {
        case 'csv':
          exportAsCsv(headers, rows);
          break;
        case 'tsv':
          exportAsTsv(headers, rows);
          break;
        case 'xlsx':
          exportAsXlsx(headers, rows);
          break;
      }
      toast.success(`Arquivo ${format.toUpperCase()} baixado.`);
    },
    [appState.csvHeaders, appState.savedRows],
  );

  const handleClearAllRows = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      savedRows: [],
      partialSelection: null,
    }));
    toast.success('Tabela limpa. CSV e configurações preservados.');
  }, [setAppState]);

  const handleCopy = useCallback(async () => {
    const ok = await copyTsvToClipboard(appState.csvHeaders, appState.savedRows);
    if (ok) {
      toast.success('TSV copiado para a área de transferência.');
    } else {
      toast.error('Falha ao copiar.');
    }
  }, [appState.csvHeaders, appState.savedRows]);

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" richColors closeButton />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Filtro CSV em Cascata</h1>
            <p className="text-xs text-gray-500">
              {stage === 'import' && 'Importe um arquivo CSV para começar'}
              {stage === 'reorder' && 'Defina a ordem dos filtros'}
              {stage === 'filter' && 'Preencha os filtros sequencialmente'}
              {stage === 'review' && `${appState.savedRows.length} linhas na tabela final`}
            </p>
          </div>

          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
            {stage === 'import' && '1. Importar'}
            {stage === 'reorder' && '2. Reordenar'}
            {stage === 'filter' && '3. Filtrar'}
            {stage === 'review' && '4. Revisar'}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {stage === 'import' && (
          <CsvImporter
            onImport={handleImport}
            isParsing={isParsing}
            error={parseError}
          />
        )}

        {stage === 'reorder' && (
          <ColumnReorder
            columns={dragDrop.items}
            draggedIndex={dragDrop.draggedIndex}
            dragOverIndex={dragDrop.dragOverIndex}
            onDragStart={dragDrop.handleDragStart}
            onDragOver={dragDrop.handleDragOver}
            onDragLeave={dragDrop.handleDragLeave}
            onDrop={(idx) => {
              dragDrop.handleDrop(idx);
            }}
            onDragEnd={dragDrop.handleDragEnd}
            onContinue={() => handleReorderContinue(dragDrop.items)}
            onMoveItem={dragDrop.moveItem}
          />
        )}

        {stage === 'filter' && (
          <CascadeFilter
            columns={cascade.columns}
            availableValues={cascade.availableValues}
            autoFilledColumns={cascade.autoFilledColumns}
            deadEnd={cascade.deadEnd}
            onConfirmSelection={handleConfirmSelection}
            onToggleLock={cascade.toggleLock}
            onSetAllLocks={cascade.setAllLocks}
            onToggleMultiSelect={cascade.toggleMultiSelect}
            onResetCascade={handleReset}
            onGoToReview={() => setStage('review')}
            totalSavedRows={appState.savedRows.length}
          />
        )}

        {stage === 'review' && (
          <FinalTable
            headers={appState.csvHeaders}
            rows={appState.savedRows}
            onBack={() => setStage('filter')}
            onDelete={handleDeleteRow}
            onClearAll={handleClearAllRows}
            onExport={handleExport}
            onCopy={handleCopy}
          />
        )}
      </main>
    </div>
  );
}

export default App;
