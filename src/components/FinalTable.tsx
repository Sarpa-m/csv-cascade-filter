import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ExportMenu } from '@/components/ExportMenu';
import { toast } from 'sonner';
import type { SavedRow, ExportFormat } from '@/types';
import { ArrowLeft, Trash2, AlertTriangle, Eraser, Clock } from 'lucide-react';

interface FinalTableProps {
  headers: string[];
  rows: SavedRow[];
  historyCount: number;
  onBack: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onOpenHistory: () => void;
  onExport: (format: ExportFormat) => void;
  onCopy: () => void;
}

export const FinalTable: React.FC<FinalTableProps> = ({
  headers, rows, historyCount, onBack, onDelete, onClearAll, onOpenHistory, onExport, onCopy,
}) => {
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = React.useState(false);

  const handleCellClick = React.useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado!', { duration: 1500 });
    } catch {
      toast.error('Falha ao copiar.');
    }
  }, []);
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Tabela Final</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} linha(s) — colunas na ordem original do CSV
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack} className="transition-all duration-200">
            <ArrowLeft className="w-4 h-4 mr-1" />Voltar aos filtros
          </Button>
          {rows.length > 0 && (
            <ExportMenu onExport={onExport} onCopy={onCopy} />
          )}
          <Button
            variant="outline" size="sm"
            onClick={onOpenHistory}
            className="transition-all duration-200"
          >
            <Clock className="w-4 h-4 mr-1" />Histórico
            {historyCount > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full text-xs font-mono">
                {historyCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => setShowClearDialog(true)}
            className="transition-all duration-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300"
          >
            <Eraser className="w-4 h-4 mr-1" />Encerrar lista
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma linha salva ainda.</p>
            <Button variant="outline" onClick={onBack} className="mt-3 transition-all duration-200">
              Voltar aos filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  {headers.map((h) => (
                    <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                  ))}
                  <TableHead className="w-16 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    {headers.map((h) => {
                      const text = row.values[h] ?? '';
                      return (
                        <TableCell
                          key={h}
                          className="whitespace-nowrap max-w-[250px] truncate cursor-pointer hover:bg-accent/50 transition-all duration-200"
                          title={text || undefined}
                          onClick={() => handleCellClick(text)}
                        >
                          {text}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon"
                        onClick={() => setDeleteId(row.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 transition-all duration-200">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir linha?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar esta lista?</DialogTitle>
            <DialogDescription>
              {rows.length > 0
                ? `As ${rows.length} linha(s) serão movidas para o histórico. Você poderá restaurá-las depois pelo botão "Histórico". `
                : ''}
              A lista some do seletor de listas — se houver outra lista aberta, você continua nela;
              caso contrário, volta para a tela de reordenação para começar uma nova.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { onClearAll(); setShowClearDialog(false); }}>
              Encerrar lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
