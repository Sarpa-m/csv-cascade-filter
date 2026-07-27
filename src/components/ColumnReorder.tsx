import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GripVertical, ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface ColumnReorderProps {
  columns: string[];
  hiddenColumns: Set<string>;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onContinue: () => void;
  onMoveItem: (from: number, to: number) => void;
  onToggleVisibility: (columnName: string) => void;
  /** Se fornecido, mostra botão "Voltar aos filtros" (reorder vindo do filtro) */
  onBack?: () => void;
}

export const ColumnReorder: React.FC<ColumnReorderProps> = ({
  columns,
  hiddenColumns,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onContinue,
  onToggleVisibility,
  onBack,
}) => {
  const allHidden = columns.length > 0 && columns.every((c) => hiddenColumns.has(c));

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Ordem da Cascata</CardTitle>
        <p className="text-sm text-muted-foreground">
          Arraste as colunas para definir a ordem em que os filtros serão aplicados.
          A ordem original do CSV será mantida na tabela final.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {columns.map((col, idx) => {
            const isHidden = hiddenColumns.has(col);
            return (
              <div
                key={col}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragLeave={onDragLeave}
                onDrop={() => onDrop(idx)}
                onDragEnd={onDragEnd}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card cursor-grab active:cursor-grabbing transition-all duration-200',
                  draggedIndex === idx && 'opacity-50 shadow-lg',
                  dragOverIndex === idx && 'border-blue-400 bg-blue-50 dark:bg-blue-950 scale-[1.02]',
                  isHidden && 'opacity-50 bg-muted/30',
                )}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span
                  className={cn(
                    'flex-1 text-sm font-medium',
                    isHidden && 'line-through text-muted-foreground',
                  )}
                >
                  {col}
                </span>
                {isHidden && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    oculta
                  </span>
                )}
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {idx + 1}ª
                </span>

                {/* Toggle visibilidade */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(col);
                  }}
                  className={cn(
                    'p-1 rounded-md transition-all duration-200 border',
                    isHidden
                      ? 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-input'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-input',
                  )}
                  title={isHidden ? 'Mostrar coluna nos filtros' : 'Ocultar coluna dos filtros'}
                >
                  {isHidden ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {allHidden && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Todas as colunas estão ocultas. Nenhum filtro será exibido na cascata.
          </p>
        )}

        <div className="pt-2 flex gap-2">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar aos filtros
            </Button>
          )}
          <Button onClick={onContinue} className="flex-1 transition-all duration-200">
            <ArrowRight className="w-4 h-4 mr-1" />
            {onBack ? 'Aplicar e filtrar' : 'Iniciar Filtros'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
