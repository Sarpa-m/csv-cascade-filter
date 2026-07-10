import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GripVertical, ArrowRight } from 'lucide-react';

interface ColumnReorderProps {
  columns: string[];
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onContinue: () => void;
  onMoveItem: (from: number, to: number) => void;
}

export const ColumnReorder: React.FC<ColumnReorderProps> = ({
  columns,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onContinue,
}) => {
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
          {columns.map((col, idx) => (
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
              )}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm font-medium">{col}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {idx + 1}ª
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button onClick={onContinue} className="w-full transition-all duration-200">
            <ArrowRight className="w-4 h-4 mr-1" />
            Iniciar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
