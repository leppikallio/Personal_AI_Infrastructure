/**
 * Export module for converting worksheet data to various formats
 */

import type ExcelJS from "exceljs";
import type { DataTable, DataRow } from "./readers.ts";

export interface ExportOptions {
  /** Use first row as headers (default: true) */
  headers?: boolean;
  /** Cell range to export (e.g., "A1:D10") */
  range?: string;
  /** Skip empty rows */
  skipEmpty?: boolean;
  /** CSV delimiter (default: ",") */
  delimiter?: string;
  /** Filter expression (e.g., "isRequirement=TRUE", "Status!=Done") */
  filter?: string;
}

interface FilterCondition {
  column: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=";
  value: string;
}

/**
 * Parse filter expression into condition
 */
function parseFilter(filter: string): FilterCondition {
  // Match operators in order of length (longest first)
  const operators = ["!=", ">=", "<=", "=", ">", "<"] as const;

  for (const op of operators) {
    const index = filter.indexOf(op);
    if (index > 0) {
      return {
        column: filter.substring(0, index).trim(),
        operator: op,
        value: filter.substring(index + op.length).trim(),
      };
    }
  }

  throw new Error(`Invalid filter format: ${filter}. Use column=value, column!=value, etc.`);
}

/**
 * Check if a row matches the filter condition
 */
function matchesFilter(row: DataRow, condition: FilterCondition): boolean {
  const cellValue = String(row[condition.column] ?? "");
  const filterValue = condition.value;

  switch (condition.operator) {
    case "=":
      return cellValue.toUpperCase() === filterValue.toUpperCase();
    case "!=":
      return cellValue.toUpperCase() !== filterValue.toUpperCase();
    case ">":
      return parseFloat(cellValue) > parseFloat(filterValue);
    case "<":
      return parseFloat(cellValue) < parseFloat(filterValue);
    case ">=":
      return parseFloat(cellValue) >= parseFloat(filterValue);
    case "<=":
      return parseFloat(cellValue) <= parseFloat(filterValue);
    default:
      return true;
  }
}

/**
 * Export worksheet to JSON array
 */
export function toJSON(
  worksheet: ExcelJS.Worksheet,
  options: ExportOptions = {}
): DataTable {
  const { headers = true, range, skipEmpty = true, filter } = options;

  const data: DataTable = [];
  let headerRow: string[] = [];

  // Parse filter if provided
  const filterCondition = filter ? parseFilter(filter) : null;

  // Determine row/column bounds
  const bounds = range ? parseRange(range) : getWorksheetBounds(worksheet);

  // Get header row if needed
  if (headers) {
    const firstRow = worksheet.getRow(bounds.startRow);
    for (let col = bounds.startCol; col <= bounds.endCol; col++) {
      const cell = firstRow.getCell(col);
      headerRow.push(String(cell.value ?? `Column${col}`));
    }
  }

  // Start row (skip header if present)
  const dataStartRow = headers ? bounds.startRow + 1 : bounds.startRow;

  // Iterate through data rows
  for (let rowNum = dataStartRow; rowNum <= bounds.endRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowData: DataRow = {};
    let hasData = false;

    for (let col = bounds.startCol; col <= bounds.endCol; col++) {
      const cell = row.getCell(col);
      const value = getCellValue(cell);

      if (value !== null && value !== undefined && value !== "") {
        hasData = true;
      }

      const key = headers ? headerRow[col - bounds.startCol] : `col${col}`;
      if (key) {
        rowData[key] = value;
      }
    }

    // Skip empty rows if option is set
    if (skipEmpty && !hasData) {
      continue;
    }

    // Apply filter if provided
    if (filterCondition && !matchesFilter(rowData, filterCondition)) {
      continue;
    }

    data.push(rowData);
  }

  return data;
}

/**
 * Export worksheet to CSV string
 */
export function toCSV(
  worksheet: ExcelJS.Worksheet,
  options: ExportOptions = {}
): string {
  const { headers = true, range, skipEmpty = true, delimiter = ",", filter } = options;

  const lines: string[] = [];

  // Parse filter if provided
  const filterCondition = filter ? parseFilter(filter) : null;

  // Determine row/column bounds
  const bounds = range ? parseRange(range) : getWorksheetBounds(worksheet);

  // Get header names for filter matching
  let headerRow: string[] = [];
  if (headers) {
    const firstRow = worksheet.getRow(bounds.startRow);
    for (let col = bounds.startCol; col <= bounds.endCol; col++) {
      const cell = firstRow.getCell(col);
      headerRow.push(String(cell.value ?? `Column${col}`));
    }
  }

  // Start row (include header if present)
  const startRow = bounds.startRow;
  const endRow = bounds.endRow;

  // Iterate through rows
  for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const cells: string[] = [];
    const rowData: DataRow = {};
    let hasData = false;

    for (let col = bounds.startCol; col <= bounds.endCol; col++) {
      const cell = row.getCell(col);
      const value = getCellValue(cell);

      if (value !== null && value !== undefined && value !== "") {
        hasData = true;
      }

      cells.push(escapeCSVValue(value, delimiter));

      // Build row data for filter check (skip header row)
      if (headers && rowNum > startRow) {
        const key = headerRow[col - bounds.startCol];
        if (key) {
          rowData[key] = value;
        }
      }
    }

    // Skip empty rows if option is set (except header)
    if (skipEmpty && !hasData && rowNum !== startRow) {
      continue;
    }

    // Apply filter if provided (skip header row)
    if (filterCondition && rowNum > startRow && !matchesFilter(rowData, filterCondition)) {
      continue;
    }

    lines.push(cells.join(delimiter));
  }

  return lines.join("\n");
}

/**
 * Get cell value with proper type handling
 */
function getCellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  // Handle rich text
  if (typeof value === "object" && "richText" in value) {
    return (value as ExcelJS.CellRichTextValue).richText
      .map((rt) => rt.text)
      .join("");
  }

  // Handle formula results
  if (typeof value === "object" && "result" in value) {
    return (value as ExcelJS.CellFormulaValue).result;
  }

  // Handle hyperlinks
  if (typeof value === "object" && "hyperlink" in value) {
    return (value as ExcelJS.CellHyperlinkValue).text;
  }

  // Handle dates
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  return value;
}

/**
 * Escape value for CSV output
 */
function escapeCSVValue(value: unknown, delimiter: string): string {
  const str = String(value ?? "");

  // Check if escaping is needed
  if (
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    // Escape quotes and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Parse cell range string (e.g., "A1:D10")
 */
interface Bounds {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

function parseRange(range: string): Bounds {
  const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid range format: ${range}`);
  }

  return {
    startCol: columnLetterToNumber(match[1]),
    startRow: parseInt(match[2], 10),
    endCol: columnLetterToNumber(match[3]),
    endRow: parseInt(match[4], 10),
  };
}

/**
 * Get worksheet bounds (actual data extent)
 */
function getWorksheetBounds(worksheet: ExcelJS.Worksheet): Bounds {
  return {
    startRow: 1,
    endRow: worksheet.rowCount || 1,
    startCol: 1,
    endCol: worksheet.columnCount || 1,
  };
}

/**
 * Convert column letter(s) to number (A=1, B=2, ..., Z=26, AA=27, ...)
 */
function columnLetterToNumber(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result;
}

/**
 * Convert column number to letter(s)
 */
export function columnNumberToLetter(num: number): string {
  let result = "";
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}
