import { useState, useCallback } from 'react';
import { parseCsv } from '@/lib/csvParser';
import type { CsvParseResult } from '@/types';

interface UseCsvParserReturn {
  result: CsvParseResult | null;
  isParsing: boolean;
  error: string | null;
  parseFile: (file: File) => Promise<void>;
  parseText: (text: string, separator?: string) => void;
  reset: () => void;
}

/**
 * Hook que encapsula o parsing de CSV, aceitando tanto arquivo quanto texto puro.
 */
export function useCsvParser(): UseCsvParserReturn {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseText = useCallback((text: string, separator?: string) => {
    try {
      const parsed = parseCsv(text, separator);
      setResult(parsed);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar o arquivo CSV.');
    }
  }, []);

  const parseFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setError(null);

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setResult(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao ler o arquivo.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsParsing(false);
  }, []);

  return { result, isParsing, error, parseFile, parseText, reset };
}
