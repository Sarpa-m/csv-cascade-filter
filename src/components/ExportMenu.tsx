import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ExportFormat } from '@/types';
import { Download, Copy } from 'lucide-react';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  onCopy: () => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ onExport, onCopy }) => {
  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="transition-all duration-200">
            <Download className="w-4 h-4 mr-1" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onExport('csv')}>
            Baixar CSV (.csv)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('tsv')}>
            Baixar TSV (.tsv)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('xlsx')}>
            Baixar Excel (.xls)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        onClick={onCopy}
        className="transition-all duration-200"
      >
        <Copy className="w-4 h-4 mr-1" />
        Copiar TSV
      </Button>
    </div>
  );
};
