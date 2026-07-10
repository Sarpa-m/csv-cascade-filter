import React, { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CsvParseResult } from '@/types';
import { parseCsv } from '@/lib/csvParser';
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface CsvImporterProps {
  onImport: (result: CsvParseResult) => void;
  isParsing: boolean;
  error: string | null;
}

export const CsvImporter: React.FC<CsvImporterProps> = ({ onImport, isParsing, error }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseCsv(text);
    if (result.headers.length > 0) onImport(result);
  }, [onImport]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) return;
    const text = await file.text();
    const result = parseCsv(text);
    if (result.headers.length > 0) onImport(result);
  }, [onImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Importar CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDrop={handleDrop} onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/50 transition-all duration-200"
        >
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground/70 mb-1">
            Arraste um arquivo CSV aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            Separadores suportados: ponto e vírgula (;), vírgula (,), tab
          </p>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
        </div>

        {isParsing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            Processando arquivo...
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

interface ImportSummaryProps {
  result: CsvParseResult;
  onContinue: () => void;
  onReset: () => void;
}

export const ImportSummary: React.FC<ImportSummaryProps> = ({ result, onContinue, onReset }) => {
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Arquivo importado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground">Colunas</p>
            <p className="text-lg font-semibold">{result.headers.length}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground">Linhas de dados</p>
            <p className="text-lg font-semibold">{result.data.length}</p>
          </div>
        </div>
        <div className="text-sm">
          <p className="text-muted-foreground mb-1">Colunas detectadas:</p>
          <div className="flex flex-wrap gap-1">
            {result.headers.map((h) => (
              <span key={h} className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">{h}</span>
            ))}
          </div>
        </div>
        {result.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              {result.errors.length} linha(s) com número incorreto de colunas foram ignoradas.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2 pt-2">
          <Button onClick={onContinue} className="flex-1 transition-all duration-200">Continuar</Button>
          <Button onClick={onReset} variant="outline" className="transition-all duration-200">Reimportar</Button>
        </div>
      </CardContent>
    </Card>
  );
};
