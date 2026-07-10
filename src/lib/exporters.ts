import type { SavedRow } from '@/types';

/**
 * Converte as linhas salvas para formato CSV (separador ;).
 */
export function toCsv(headers: string[], rows: SavedRow[]): string {
  const headerLine = headers.map((h) => escapeCsvField(h)).join(';');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(row.values[h] ?? '')).join(';'),
  );
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Converte as linhas salvas para formato TSV (para colar no Excel).
 */
export function toTsv(headers: string[], rows: SavedRow[]): string {
  const headerLine = headers.join('\t');
  const dataLines = rows.map((row) =>
    headers.map((h) => row.values[h] ?? '').join('\t'),
  );
  return [headerLine, ...dataLines].join('\n');
}

/** Escapa um campo para CSV: envolve em aspas se contiver `;`, `"`, ou `\n` */
function escapeCsvField(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Dispara o download de um arquivo no navegador.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta como CSV e faz download.
 */
export function exportAsCsv(headers: string[], rows: SavedRow[]): void {
  const content = toCsv(headers, rows);
  downloadFile(content, 'dados_filtrados.csv', 'text/csv;charset=utf-8');
}

/**
 * Exporta como TSV e faz download.
 */
export function exportAsTsv(headers: string[], rows: SavedRow[]): void {
  const content = toTsv(headers, rows);
  downloadFile(content, 'dados_filtrados.tsv', 'text/tab-separated-values;charset=utf-8');
}

/**
 * Exporta como XLSX simples (na verdade gera um HTML que o Excel abre como planilha).
 * Solução sem dependência externa de biblioteca XLSX.
 */
export function exportAsXlsx(headers: string[], rows: SavedRow[]): void {
  const headerCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const dataRows = rows
    .map(
      (row) =>
        `<tr>${headers.map((h) => `<td>${escapeHtml(row.values[h] ?? '')}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body>
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${dataRows}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadFile(html, 'dados_filtrados.xls', 'application/vnd.ms-excel;charset=utf-8');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Copia o conteúdo TSV para a área de transferência.
 */
export async function copyTsvToClipboard(
  headers: string[],
  rows: SavedRow[],
): Promise<boolean> {
  try {
    const tsv = toTsv(headers, rows);
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}
