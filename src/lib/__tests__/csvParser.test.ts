import { describe, it, expect } from 'vitest';
import { parseCsv, detectSeparator } from '../csvParser';

describe('detectSeparator', () => {
  it('detects semicolon as separator', () => {
    expect(detectSeparator('Nome;Idade;Cidade')).toBe(';');
  });

  it('detects comma as separator', () => {
    expect(detectSeparator('Name,Age,City')).toBe(',');
  });

  it('detects tab as separator', () => {
    expect(detectSeparator('Name\tAge\tCity')).toBe('\t');
  });

  it('defaults to semicolon for ambiguous input', () => {
    expect(detectSeparator('Hello World')).toBe(';');
  });
});

describe('parseCsv', () => {
  it('parses a simple semicolon-separated CSV', () => {
    const input = 'Nome;Idade\nAlice;30\nBob;25';
    const result = parseCsv(input);
    expect(result.headers).toEqual(['Nome', 'Idade']);
    expect(result.data).toEqual([
      { Nome: 'Alice', Idade: '30' },
      { Nome: 'Bob', Idade: '25' },
    ]);
    expect(result.errors).toHaveLength(0);
  });

  it('handles quoted fields containing the separator', () => {
    const input = 'Nome;Descrição\nAlice;"Engenheira; Sênior"\nBob;Analista';
    const result = parseCsv(input);
    expect(result.data[0]['Descrição']).toBe('Engenheira; Sênior');
    expect(result.data[1]['Descrição']).toBe('Analista');
  });

  it('handles escaped quotes ("" becomes ")', () => {
    const input = 'Nome;Apelido\nAlice;"Al""ice"\nBob;Bobby';
    const result = parseCsv(input);
    expect(result.data[0]['Apelido']).toBe('Al"ice');
  });

  it('handles newlines inside quoted fields', () => {
    const input = 'Nome;Bio\nAlice;"Linha 1\nLinha 2"\nBob;Teste';
    const result = parseCsv(input);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]['Bio']).toBe('Linha 1\nLinha 2');
  });

  it('detects comma separator automatically', () => {
    const input = 'Name,Age,City\nAlice,30,NYC\nBob,25,LA';
    const result = parseCsv(input);
    expect(result.headers).toEqual(['Name', 'Age', 'City']);
    expect(result.data).toHaveLength(2);
  });

  it('skips blank lines', () => {
    const input = 'Nome;Idade\n\nAlice;30\n\n\nBob;25\n';
    const result = parseCsv(input);
    expect(result.data).toHaveLength(2);
  });

  it('handles empty input', () => {
    const result = parseCsv('');
    expect(result.headers).toEqual([]);
    expect(result.data).toEqual([]);
  });

  it('handles header-only CSV (no data rows)', () => {
    const result = parseCsv('A;B;C');
    expect(result.headers).toEqual(['A', 'B', 'C']);
    expect(result.data).toEqual([]);
  });

  it('reports rows with wrong column count', () => {
    const input = 'Nome;Idade\nAlice;30\nBob\nCharlie;25;Extra';
    const result = parseCsv(input);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].line).toBe(3); // Bob — 1-indexed: header=1, Alice=2, Bob=3
    expect(result.errors[1].line).toBe(4); // Charlie — header=1, Alice=2, Bob=3, Charlie=4
    // Only Alice is valid (Bob has 1 col, Charlie has 3 cols)
    expect(result.data).toHaveLength(1);
    expect(result.data[0]['Nome']).toBe('Alice');
  });

  it('handles duplicate headers by appending suffix', () => {
    const input = 'Nome;Nome;Nome\nAlice;30;SP';
    const result = parseCsv(input);
    expect(result.headers).toEqual(['Nome', 'Nome_2', 'Nome_3']);
  });

  it('handles empty header names', () => {
    const input = ';Idade;\nAlice;30;SP';
    const result = parseCsv(input);
    expect(result.headers[0]).toBe('Coluna_1');
    expect(result.headers[1]).toBe('Idade');
    expect(result.headers[2]).toBe('Coluna_3');
  });

  it('accepts explicit separator parameter', () => {
    const input = 'A,B,C\n1,2,3';
    const result = parseCsv(input, ',');
    expect(result.headers).toEqual(['A', 'B', 'C']);
  });

  it('normalizes Windows line endings (\\r\\n)', () => {
    const input = 'Nome;Idade\r\nAlice;30\r\nBob;25';
    const result = parseCsv(input);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]['Nome']).toBe('Alice');
  });
});
