import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CascadeColumn } from '@/types';
import { Lock, LockOpen, List, AlertTriangle, ArrowLeftRight, Layers, Plus } from 'lucide-react';

export interface WorkListSummary {
  id: string;
  name: string;
  rowCount: number;
}

interface CascadeFilterProps {
  columns: CascadeColumn[];
  availableValues: Map<string, string[]>;
  autoFilledColumns: Set<string>;
  deadEnd: boolean;
  onConfirmSelection: (columnName: string, values: string[]) => void;
  onToggleLock: (columnName: string) => void;
  onSetAllLocks: (locked: boolean) => void;
  onToggleMultiSelect: (columnName: string) => void;
  onResetCascade: () => void;
  onGoToReview: () => void;
  onBackToReorder: () => void;
  totalSavedRows: number;
  /** Listas de trabalho existentes, para o seletor "qual lista estou preenchendo" */
  lists: WorkListSummary[];
  activeListId: string | null;
  onSwitchList: (id: string) => void;
  onNewList: () => void;
}

export const CascadeFilter: React.FC<CascadeFilterProps> = ({
  columns,
  availableValues,
  autoFilledColumns,
  deadEnd,
  onConfirmSelection,
  onToggleLock,
  onSetAllLocks,
  onToggleMultiSelect,
  onResetCascade,
  onGoToReview,
  onBackToReorder,
  totalSavedRows,
  lists,
  activeListId,
  onSwitchList,
  onNewList,
}) => {
  const [showResetDialog, setShowResetDialog] = React.useState(false);

  const sorted = useMemo(
    () =>
      [...columns]
        .filter((c) => c.visible)
        .sort((a, b) => a.cascadeIndex - b.cascadeIndex),
    [columns],
  );

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);
  const anyLocked = visibleColumns.some((c) => c.locked);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Seletor de lista de trabalho */}
      {lists.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Listas de trabalho">
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-pressed={l.id === activeListId}
              onClick={() => onSwitchList(l.id)}
              title={l.name}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all duration-200',
                l.id === activeListId
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-card text-muted-foreground border-border hover:border-input hover:text-foreground',
              )}
            >
              <Layers className="w-3 h-3 flex-shrink-0" />
              <span className="max-w-[140px] truncate">{l.name}</span>
              {l.rowCount > 0 && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 rounded-full',
                    l.id === activeListId ? 'bg-white/20' : 'bg-muted',
                  )}
                >
                  {l.rowCount}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={onNewList}
            title="Iniciar uma nova lista"
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border border-dashed border-border text-muted-foreground hover:border-input hover:text-foreground transition-all duration-200"
          >
            <Plus className="w-3 h-3" />
            Nova lista
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Filtros em Cascata</h2>
          <p className="text-sm text-muted-foreground">
            {totalSavedRows > 0 && (
              <span className="inline-flex items-center gap-1">
                <List className="w-3.5 h-3.5" />
                {totalSavedRows} linha(s) salva(s) ·
              </span>
            )}{' '}
            Selecione os valores em ordem
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToReorder}
            className="transition-all duration-200"
            title="Voltar para reordenar/ocultar colunas"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
            Reordenar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetAllLocks(!anyLocked || visibleColumns.every((c) => c.locked))}
            className="transition-all duration-200"
          >
            {anyLocked && visibleColumns.some((c) => !c.locked) ? (
              <>
                <Lock className="w-3.5 h-3.5 mr-1" />
                Travar todas
              </>
            ) : visibleColumns.length > 0 && visibleColumns.every((c) => c.locked) ? (
              <>
                <LockOpen className="w-3.5 h-3.5 mr-1" />
                Destravar todas
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 mr-1" />
                Travar todas
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResetDialog(true)}
            className="transition-all duration-200"
          >
            Resetar
          </Button>
          {totalSavedRows > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToReview}
              className="transition-all duration-200"
            >
              Ver lista
            </Button>
          )}
        </div>
      </div>

      {/* Dead end warning */}
      {deadEnd && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Nenhuma combinação encontrada com os valores selecionados. Ajuste a seleção anterior.
          </AlertDescription>
        </Alert>
      )}

      {/* Colunas em cascata */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma coluna visível. Use o botão <strong>Reordenar</strong> para mostrar colunas.
            </p>
          )}
          {sorted.map((col, displayIdx) => {
            const isUnlocked =
              col.cascadeIndex === 0 ||
              sorted
                .filter((c) => c.cascadeIndex < col.cascadeIndex)
                .every((c) => c.selectedValues.length > 0);

            const isDisabled =
              !isUnlocked && col.selectedValues.length === 0;

            const values = availableValues.get(col.name) ?? [];

            return (
              <div key={col.name} className="flex items-start gap-3">
                {/* Indicador de ordem */}
                <div className="flex flex-col items-center pt-1.5">
                  <span className="text-xs font-mono text-muted-foreground bg-muted w-6 h-6 rounded-full flex items-center justify-center">
                    {displayIdx + 1}
                  </span>
                  {displayIdx < sorted.length - 1 && (
                    <div className="w-px h-6 bg-border my-1" />
                  )}
                </div>

                {/* Dropdown */}
                <div className="flex-1">
                  <MultiSelectDropdown
                    options={values}
                    selected={col.selectedValues}
                    onConfirm={(vals) => onConfirmSelection(col.name, vals)}
                    disabled={isDisabled}
                    autoFilled={autoFilledColumns.has(col.name)}
                    locked={col.locked}
                    multiSelectEnabled={col.multiSelectEnabled}
                    onToggleMultiSelect={() => onToggleMultiSelect(col.name)}
                    label={col.name}
                  />
                </div>

                {/* Botão de travar */}
                <button
                  type="button"
                  onClick={() => onToggleLock(col.name)}
                  className={`mt-7 p-1.5 rounded-lg border transition-all duration-200
                    ${col.locked
                      ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900'
                      : 'bg-card border-border text-muted-foreground hover:border-input hover:text-foreground'
                    }
                  `}
                  title={col.locked ? 'Destravar coluna' : 'Travar coluna'}
                >
                  {col.locked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <LockOpen className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Tabela final link */}
      {totalSavedRows > 0 && (
        <Button
          onClick={onGoToReview}
          variant="outline"
          className="w-full transition-all duration-200"
        >
          <List className="w-4 h-4 mr-2" />
          Ir para lista ({totalSavedRows} linhas)
        </Button>
      )}

      {/* Reset confirmation dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar sessão?</DialogTitle>
            <DialogDescription>
              Isso limpará todo o estado: CSV importado, travamentos e lista de linhas salvas.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onResetCascade();
                setShowResetDialog(false);
              }}
            >
              Resetar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
