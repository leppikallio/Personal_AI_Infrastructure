/**
 * Data readers for various input formats
 * Supports JSON, CSV, and Markdown table parsing
 */

import { parse as csvParse } from 'csv-parse/sync';

export type DataRow = Record<string, unknown>;
export type DataTable = DataRow[];

export interface ParseOptions {
  headers?: boolean;
  delimiter?: string;
}

/**
 * Parse JSON array input
 */
export function parseJSON(input: string): DataTable {
  const data = JSON.parse(input);

  if (!Array.isArray(data)) {
    // If it's a single object, wrap it in an array
    if (typeof data === 'object' && data !== null) {
      return [data];
    }
    throw new Error('JSON input must be an array of objects');
  }

  return data;
}

/**
 * Parse CSV input
 */
export function parseCSV(input: string, options: ParseOptions = {}): DataTable {
  const { headers = true, delimiter = ',' } = options;

  const records = csvParse(input, {
    columns: headers,
    skip_empty_lines: true,
    delimiter,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  return records;
}

/**
 * Parse Markdown table input
 * Supports standard GitHub-flavored markdown tables
 */
export function parseMarkdownTable(input: string): DataTable {
  const lines = input.split('\n').filter((line) => line.trim());

  // Find table lines (lines with | characters)
  const tableLines = lines.filter((line) => line.includes('|'));

  if (tableLines.length < 2) {
    throw new Error('No valid markdown table found');
  }

  // Parse header row
  const headerLine = tableLines[0];
  const headers = parseMarkdownRow(headerLine);

  if (headers.length === 0) {
    throw new Error('No headers found in markdown table');
  }

  // Skip separator line (contains dashes)
  const dataLines = tableLines.slice(2);

  // Parse data rows
  const data: DataTable = [];
  for (const line of dataLines) {
    if (line.includes('-') && !line.match(/[a-zA-Z0-9]/)) {
      // Skip separator lines
      continue;
    }

    const cells = parseMarkdownRow(line);
    if (cells.length > 0) {
      const row: DataRow = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] ?? '';
      });
      data.push(row);
    }
  }

  return data;
}

/**
 * Parse a single markdown table row
 */
function parseMarkdownRow(line: string): string[] {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell, index, arr) => {
      // Remove empty cells at start and end (from leading/trailing |)
      if (index === 0 && cell === '') return false;
      if (index === arr.length - 1 && cell === '') return false;
      return true;
    });
}

/**
 * Detect input format from content or filename
 */
export function detectFormat(input: string, filename?: string): 'json' | 'csv' | 'md' {
  // Check filename extension first
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'json') return 'json';
    if (ext === 'csv') return 'csv';
    if (ext === 'md' || ext === 'markdown') return 'md';
  }

  // Try to detect from content
  const trimmed = input.trim();

  // JSON starts with [ or {
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON, continue checking
    }
  }

  // Markdown tables have | and usually header separators with ---
  if (trimmed.includes('|') && trimmed.includes('---')) {
    return 'md';
  }

  // Default to CSV
  return 'csv';
}

/**
 * Parse input based on format
 */
export function parseInput(
  input: string,
  format?: 'json' | 'csv' | 'md',
  filename?: string,
  options: ParseOptions = {}
): DataTable {
  const detectedFormat = format || detectFormat(input, filename);

  switch (detectedFormat) {
    case 'json':
      return parseJSON(input);
    case 'csv':
      return parseCSV(input, options);
    case 'md':
      return parseMarkdownTable(input);
    default:
      throw new Error(`Unsupported format: ${detectedFormat}`);
  }
}
