import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import type { TableHistory } from '@/types';
import { RotateCcw, Trash2 } from 'lucide-react';

interface HistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: TableHistory[];
  currentRowCount: number;
  onRestore: (id: string) => void;
  onMerge: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onClearAllHistory: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  open, onOpenChange, history, currentRowCount,
  onRestore, onMerge, onDeleteEntry, onClearAllHistory,
}) => {
  const [confirmClearAll, setConfirmClearAll] = React.useState(false);
  const [deleteEntryId, setDeleteEntryId] = React.useState<string | null>(null);
  const [restoreEntryId, setRestoreEntryId] = React.useState<string | null>(null);

  const formatDate = (iso: string) => {
    try {
      return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm");
    } catch {
      return iso;
    }
  };

  const handleRestoreClick = (id: string) => {
    if (currentRowCount > 0) {
      setRestoreEntryId(id);
    } else {
      onRestore(id);
    }
  };

  const restoreEntry = restoreEntryId
    ? history.find((e) => e.id === restoreEntryId)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de tabelas</DialogTitle>
            <DialogDescription>
              {history.length > 0
                ? `${history.length} entrada(s) no histórico`
                : 'Nenhum histórico ainda.'}
            </DialogDescription>
          </DialogHeader>

          {history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhum histórico ainda.
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-28 whitespace-nowrap">Data/hora</TableHead>
                    <TableHead className="w-20 text-center">Linhas</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {entry.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                          {entry.rowCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleRestoreClick(entry.id)}
                            className="h-8 w-8 transition-all duration-200"
                            title="Restaurar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setDeleteEntryId(entry.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 transition-all duration-200"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          <DialogFooter>
            {history.length > 0 && (
              <Button
                variant="destructive" size="sm"
                onClick={() => setConfirmClearAll(true)}
                className="transition-all duration-200"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar todo histórico
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-dialog: restaurar — substituir ou mesclar */}
      <Dialog open={!!restoreEntryId} onOpenChange={() => setRestoreEntryId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar histórico</DialogTitle>
            <DialogDescription>
              A tabela atual tem <strong>{currentRowCount} linha(s)</strong>.
              Como deseja restaurar a lista{" "}
              <strong>{restoreEntry?.name}</strong>{" "}
              ({restoreEntry?.rowCount} linha(s))?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                if (restoreEntryId) onRestore(restoreEntryId);
                setRestoreEntryId(null);
              }}
              className="transition-all duration-200"
            >
              Substituir — perde a tabela atual e usa a do histórico
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (restoreEntryId) onMerge(restoreEntryId);
                setRestoreEntryId(null);
              }}
              className="transition-all duration-200"
            >
              Mesclar — junta as duas listas (sem duplicatas)
            </Button>
            <Button
              variant="outline"
              onClick={() => setRestoreEntryId(null)}
              className="transition-all duration-200"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialog: confirmar exclusão de uma entrada */}
      <Dialog open={!!deleteEntryId} onOpenChange={() => setDeleteEntryId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir entrada do histórico?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntryId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteEntryId) onDeleteEntry(deleteEntryId);
                setDeleteEntryId(null);
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-dialog: confirmar limpar todo histórico */}
      <Dialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar todo histórico?</DialogTitle>
            <DialogDescription>
              Todas as {history.length} entrada(s) do histórico serão
              permanentemente removidas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClearAll(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClearAllHistory();
                setConfirmClearAll(false);
              }}
            >
              Limpar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
