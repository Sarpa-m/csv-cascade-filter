import type { CsvParseResult, CsvRow, CsvRowError } from '@/types';

/**
 * Detecta o separador mais provável do CSV analisando a primeira linha (cabeçalho).
 * Testa `;`, `,` e `\t` — retorna o que aparecer mais vezes na linha, com preferência
 * por `;` em caso de empate (formato mais comum no Brasil).
 */
export function detectSeparator(firstLine: string): string {
  const candidates = [';', ',', '\t'];
  let best = ';';
  let bestCount = 0;

  for (const sep of candidates) {
    const count = (firstLine.match(new RegExp(escapeRegex(sep), 'g')) || []).length;
    if (count > bestCount) {
      bestCount = count;
      best = sep;
    }
  }
  return best;
}

/**
 * Parser real de CSV conforme RFC 4180.
 * Suporta:
 * - Campos entre aspas contendo o separador, quebras de linha ou aspas escapadas (`""`).
 * - Linhas em branco no meio do arquivo (ignoradas).
 * - Detecção automática de separador.
 */
export function parseCsv(
  raw: string,
  separator?: string,
): CsvParseResult {
  // Normalizar quebras de linha
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Dividir em linhas preservando campos com quebra de linha embutida
  const lines = splitCsvLines(normalized);

  if (lines.length === 0) {
    return { headers: [], data: [], errors: [] };
  }

  // Filtrar linhas totalmente em branco
  const nonEmptyLines = lines.filter((l) => l.trim() !== '');

  if (nonEmptyLines.length === 0) {
    return { headers: [], data: [], errors: [] };
  }

  const detectedSep = separator ?? detectSeparator(nonEmptyLines[0]);

  // Parse do cabeçalho
  const headers = parseCsvLine(nonEmptyLines[0], detectedSep).map((h, i) =>
    h.trim() || `Coluna_${i + 1}`,
  );

  // Verificar cabeçalhos duplicados
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count > 0 ? `${h}_${count + 1}` : h;
  });

  const expectedCols = uniqueHeaders.length;
  const data: CsvRow[] = [];
  const errors: CsvRowError[] = [];

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const fields = parseCsvLine(nonEmptyLines[i], detectedSep);

    if (fields.length !== expectedCols) {
      errors.push({
        line: i + 1, // 1-indexed no arquivo original
        expectedColumns: expectedCols,
        actualColumns: fields.length,
        rawLine: nonEmptyLines[i].substring(0, 200),
      });
      continue; // pula essa linha mas continua processando
    }

    const row: CsvRow = {};
    for (let j = 0; j < uniqueHeaders.length; j++) {
      row[uniqueHeaders[j]] = fields[j];
    }
    data.push(row);
  }

  return { headers: uniqueHeaders, data, errors };
}

/**
 * Divide o conteúdo CSV em linhas, respeitando campos entre aspas
 * que podem conter quebras de linha.
 */
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Última linha
  if (current.length > 0 || lines.length > 0) {
    lines.push(current);
  }

  return lines;
}

/**
 * Faz o parse de uma única linha CSV em campos, respeitando aspas e escapes.
 */
function parseCsvLine(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Aspas escapadas: "" → "
        current += '"';
        i++; // skip next char
      } else if (char === '"') {
        inQuotes = false;
        // não adiciona a aspa de fechamento
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        // não adiciona a aspa de abertura
      } else if (char === separator) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}

/** Escapa caracteres especiais para uso em RegExp */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
