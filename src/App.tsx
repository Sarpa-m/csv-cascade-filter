import React, { useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CsvImporter } from '@/components/CsvImporter';
import { ColumnReorder } from '@/components/ColumnReorder';
import { CascadeFilter } from '@/components/CascadeFilter';
import { FinalTable } from '@/components/FinalTable';
import { HistoryPanel } from '@/components/HistoryPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCsvParser } from '@/hooks/useCsvParser';
import { useCascadeFilters } from '@/hooks/useCascadeFilters';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useVersionCheck, dismissVersion, APP_VERSION } from '@/hooks/useVersionCheck';
import { allColumnsFilled } from '@/lib/cascadeLogic';
import { exportAsCsv, exportAsTsv, exportAsXlsx, copyTsvToClipboard } from '@/lib/exporters';
import type { AppState, SavedRow, ExportFormat, TableHistory } from '@/types';

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
  tableHistory: [],
  currentListName: '',
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
  const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false);
  const [showNameDialog, setShowNameDialog] = React.useState(false);
  const [pendingListName, setPendingListName] = React.useState('');

  const { isParsing, error: parseError } = useCsvParser();
  const cascade = useCascadeFilters();
  const dragDrop = useDragAndDrop(appState.csvHeaders, () => {});

  const autoSubmitLock = React.useRef(false);
  const cascadeInitialized = React.useRef(false);
  const comingFromFilter = React.useRef(false);

  const versionInfo = useVersionCheck();

  // Estado local da tela de reordenação (visibilidade das colunas)
  const [reorderHidden, setReorderHidden] = React.useState<Set<string>>(new Set());

  // Inicializa o hook de cascata com os dados restaurados do localStorage.
  // Sem isso, reorderColumns opera sobre estado vazio e gera colunas undefined.
  React.useEffect(() => {
    if (!cascadeInitialized.current && appState.csvHeaders.length > 0) {
      cascade.initColumns(
        appState.csvHeaders,
        appState.csvData,
        appState.cascadeColumns.length > 0 ? appState.cascadeColumns : undefined,
      );
      cascadeInitialized.current = true;
    }
  }, [appState.csvHeaders, appState.csvData, appState.cascadeColumns, cascade]);

  // Sincroniza as colunas da cascata de volta para o appState (persistência).
  // Assim, ao fechar e reabrir, as seleções e travamentos são preservados.
  React.useEffect(() => {
    if (cascade.columns.length > 0) {
      setAppState((prev) => ({
        ...prev,
        cascadeColumns: cascade.columns,
      }));
    }
  }, [cascade.columns, setAppState]);

  // Notifica o usuário se houver uma versão mais nova no GitHub
  React.useEffect(() => {
    if (!versionInfo?.hasUpdate) return;

    toast('Nova versão disponível!', {
      description: `v${versionInfo.latest} — você está usando v${versionInfo.current}`,
      duration: 10000,
      action: {
        label: 'Ver',
        onClick: () => window.open(versionInfo.releaseUrl!, '_blank', 'noopener'),
      },
      cancel: {
        label: 'Ignorar',
        onClick: () => {
          if (versionInfo.latest) dismissVersion(versionInfo.latest);
        },
      },
    });
  }, [versionInfo]);

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
      setReorderHidden(new Set());
      comingFromFilter.current = false;
      cascade.initColumns(result.headers, result.data as AppState['csvData']);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} linha(s) ignoradas por formato incorreto.`);
      }
      toast.success(`${result.data.length} linhas importadas.`);
    },
    [setAppState, cascade],
  );

  const handleReorderContinue = useCallback((orderedHeaders: string[]) => {
    // Aplica ordem e visibilidade (preserva seleções se voltando do filtro)
    cascade.updateColumnOrder(orderedHeaders, reorderHidden);

    if (comingFromFilter.current) {
      // Voltou do filtro: volta direto para a cascata
      comingFromFilter.current = false;
      setStage('filter');
      autoSubmitLock.current = false;
      setTimeout(() => cascade.resetForNewRow(), 0);
    } else {
      // Primeira vez (vindo do import): pede nome da lista
      const defaultName = `Lista ${appState.tableHistory.length + 1}`;
      setPendingListName(defaultName);
      setShowNameDialog(true);
    }
  }, [cascade, appState.tableHistory.length, reorderHidden]);

  const handleBackToReorder = useCallback(() => {
    const sorted = [...cascade.columns].sort((a, b) => a.cascadeIndex - b.cascadeIndex);
    const names = sorted.map((c) => c.name);
    const hidden = new Set(sorted.filter((c) => !c.visible).map((c) => c.name));

    dragDrop.resetItems(names);
    setReorderHidden(hidden);
    comingFromFilter.current = true;
    setStage('reorder');
  }, [cascade.columns, dragDrop]);

  const handleCancelReorder = useCallback(() => {
    comingFromFilter.current = false;
    setStage('filter');
  }, []);

  const handleToggleVisibility = useCallback((col: string) => {
    setReorderHidden((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  }, []);

  const handleConfirmListName = useCallback(() => {
    const name = pendingListName.trim() || 'Sem nome';
    setAppState((prev) => ({ ...prev, currentListName: name }));
    setShowNameDialog(false);
    setStage('filter');
    autoSubmitLock.current = false;
    setTimeout(() => cascade.resetForNewRow(), 0);
  }, [pendingListName, setAppState, cascade]);

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
    comingFromFilter.current = false;
    setReorderHidden(new Set());
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
    setAppState((prev) => {
      if (prev.savedRows.length === 0) return prev;

      const name = prev.currentListName || 'Sem nome';

      const entry: TableHistory = {
        id: crypto.randomUUID(),
        name,
        rows: prev.savedRows,
        createdAt: new Date().toISOString(),
        rowCount: prev.savedRows.length,
      };

      return {
        ...prev,
        savedRows: [],
        currentListName: '',
        tableHistory: [...prev.tableHistory, entry],
        partialSelection: null,
      };
    });
    toast.success('Tabela limpa. Dados movidos para o histórico.');
  }, [setAppState]);

  const handleBackToFilters = useCallback(() => {
    if (!appState.currentListName) {
      const defaultName = `Lista ${appState.tableHistory.length + 1}`;
      setPendingListName(defaultName);
      setShowNameDialog(true);
    } else {
      setStage('filter');
    }
  }, [appState.currentListName, appState.tableHistory.length]);

  const handleRestoreHistory = useCallback((id: string) => {
    setAppState((prev) => {
      const entry = prev.tableHistory.find((e) => e.id === id);
      if (!entry) return prev;
      return {
        ...prev,
        savedRows: entry.rows,
        tableHistory: prev.tableHistory.filter((e) => e.id !== id),
      };
    });
    setHistoryDialogOpen(false);
    toast.success('Histórico restaurado com sucesso.');
  }, [setAppState]);

  const handleMergeHistory = useCallback((id: string) => {
    setAppState((prev) => {
      const entry = prev.tableHistory.find((e) => e.id === id);
      if (!entry) return prev;

      const existingValues = new Set(
        prev.savedRows.map((r) => JSON.stringify(r.values)),
      );
      const newRows = entry.rows.filter(
        (r) => !existingValues.has(JSON.stringify(r.values)),
      );

      if (newRows.length === 0) {
        toast.info('Nenhuma linha nova para mesclar — todas já existem na tabela.');
        return {
          ...prev,
          tableHistory: prev.tableHistory.filter((e) => e.id !== id),
        };
      }

      return {
        ...prev,
        savedRows: [...prev.savedRows, ...newRows],
        tableHistory: prev.tableHistory.filter((e) => e.id !== id),
      };
    });
    setHistoryDialogOpen(false);
    toast.success('Listas mescladas com sucesso.');
  }, [setAppState]);

  const handleDeleteHistoryEntry = useCallback((id: string) => {
    setAppState((prev) => ({
      ...prev,
      tableHistory: prev.tableHistory.filter((e) => e.id !== id),
    }));
    toast.success('Entrada do histórico removida.');
  }, [setAppState]);

  const handleClearAllHistory = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      tableHistory: [],
    }));
    toast.info('Todo o histórico foi limpo.');
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
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors closeButton />

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Filtro CSV em Cascata</h1>
            <p className="text-xs text-muted-foreground">
              {stage === 'import' && 'Importe um arquivo CSV para começar'}
              {stage === 'reorder' && 'Defina a ordem dos filtros'}
              {stage === 'filter' && 'Preencha os filtros sequencialmente'}
              {stage === 'review' && `${appState.savedRows.length} linhas na tabela final`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {appState.currentListName && (stage === 'filter' || stage === 'review') && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium truncate max-w-[200px]" title={appState.currentListName}>
                {appState.currentListName}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
              {stage === 'import' && '1. Importar'}
              {stage === 'reorder' && '2. Reordenar'}
              {stage === 'filter' && '3. Filtrar'}
              {stage === 'review' && '4. Revisar'}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Dialog: nome da lista antes de começar os filtros */}
        <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nome da lista</DialogTitle>
              <DialogDescription>
                Dê um nome para esta lista de filtros. Ele será usado ao salvar no histórico.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="list-name">Nome</Label>
              <Input
                id="list-name"
                value={pendingListName}
                onChange={(e) => setPendingListName(e.target.value)}
                placeholder="Ex: Dados de SP, Seleção RH, etc."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmListName(); }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNameDialog(false)}>Cancelar</Button>
              <Button onClick={handleConfirmListName}>Começar filtros</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            hiddenColumns={reorderHidden}
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
            onToggleVisibility={handleToggleVisibility}
            onBack={comingFromFilter.current ? handleCancelReorder : undefined}
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
            onBackToReorder={handleBackToReorder}
            totalSavedRows={appState.savedRows.length}
          />
        )}

        {stage === 'review' && (
          <FinalTable
            headers={appState.csvHeaders}
            rows={appState.savedRows}
            historyCount={appState.tableHistory.length}
            onBack={handleBackToFilters}
            onDelete={handleDeleteRow}
            onClearAll={handleClearAllRows}
            onOpenHistory={() => setHistoryDialogOpen(true)}
            onExport={handleExport}
            onCopy={handleCopy}
          />
        )}

        <HistoryPanel
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          history={appState.tableHistory}
          currentRowCount={appState.savedRows.length}
          onRestore={handleRestoreHistory}
          onMerge={handleMergeHistory}
          onDeleteEntry={handleDeleteHistoryEntry}
          onClearAllHistory={handleClearAllHistory}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-6 border-t border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            Desenvolvido por{' '}
            <a
              href="https://www.linkedin.com/in/mauricio-sarpa/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 transition-colors"
            >
              Mauricio Sarpa
            </a>{' '}
            &copy; {new Date().getFullYear()}
            {' '}&middot;{' '}
            <span className="font-mono">v{APP_VERSION}</span>
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Sarpa-m/csv-cascade-filter"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <span className="text-muted-foreground/40">|</span>
            <p>
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              CC BY-SA 4.0
            </a>
          </p>
        </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
