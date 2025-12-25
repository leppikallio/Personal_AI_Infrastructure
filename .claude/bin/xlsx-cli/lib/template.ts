/**
 * Template loading and population module
 * Handles Excel template (.xltx/.xlsx) loading and data insertion
 */

import * as fs from 'node:fs';
import ExcelJS from 'exceljs';
import type { DataTable } from './readers.ts';
import { addDataToSheet, autoFitColumns } from './workbook.ts';

export interface TemplateOptions {
  /** Sheet name or index to populate (default: first sheet) */
  sheet?: string | number;
  /** Starting row for data (default: 2, assuming row 1 has headers) */
  startRow?: number;
  /** Whether the template already has headers */
  hasHeaders?: boolean;
  /** Auto-fit column widths after population */
  autofit?: boolean;
}

/**
 * Load template file
 */
export async function loadTemplate(templatePath: string): Promise<ExcelJS.Workbook> {
  const resolvedPath = templatePath.replace(/^~/, process.env.HOME || '');

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Template not found: ${resolvedPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolvedPath);

  return workbook;
}

/**
 * Populate template with data
 * Preserves template formatting and styling
 */
export async function populateTemplate(
  workbook: ExcelJS.Workbook,
  data: DataTable,
  options: TemplateOptions = {}
): Promise<ExcelJS.Workbook> {
  const { sheet = 0, startRow = 2, hasHeaders = true, autofit = false } = options;

  if (data.length === 0) {
    return workbook;
  }

  // Get target worksheet
  let worksheet: ExcelJS.Worksheet | undefined;
  if (typeof sheet === 'number') {
    worksheet = workbook.worksheets[sheet];
  } else {
    worksheet = workbook.getWorksheet(sheet);
  }

  if (!worksheet) {
    throw new Error(`Worksheet ${sheet} not found in template`);
  }

  // Get column keys from data
  const dataKeys = Object.keys(data[0]);

  // If template has headers, try to match them with data keys
  let columnMapping: Map<string, number> | undefined;
  if (hasHeaders) {
    columnMapping = mapColumnsToHeaders(worksheet, dataKeys);
  }

  // Insert data starting from startRow
  let currentRow = startRow;
  for (const rowData of data) {
    const row = worksheet.getRow(currentRow);

    if (columnMapping) {
      // Map data to matched columns
      for (const [key, colIndex] of columnMapping) {
        const cell = row.getCell(colIndex);
        cell.value = rowData[key] as ExcelJS.CellValue;
      }
    } else {
      // Insert data sequentially
      let colIndex = 1;
      for (const key of dataKeys) {
        const cell = row.getCell(colIndex);
        cell.value = rowData[key] as ExcelJS.CellValue;
        colIndex++;
      }
    }

    row.commit();
    currentRow++;
  }

  // Auto-fit if requested
  if (autofit) {
    autoFitColumns(worksheet);
  }

  return workbook;
}

/**
 * Map data keys to template header columns
 */
function mapColumnsToHeaders(
  worksheet: ExcelJS.Worksheet,
  dataKeys: string[]
): Map<string, number> {
  const mapping = new Map<string, number>();
  const headerRow = worksheet.getRow(1);

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const headerValue = String(cell.value ?? '')
      .toLowerCase()
      .trim();

    for (const key of dataKeys) {
      if (key.toLowerCase().trim() === headerValue) {
        mapping.set(key, colNumber);
        break;
      }
    }
  });

  // If no matches found, use sequential mapping
  if (mapping.size === 0) {
    dataKeys.forEach((key, index) => {
      mapping.set(key, index + 1);
    });
  }

  return mapping;
}

/**
 * Add a new sheet to workbook with data
 */
export function addSheetWithData(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  data: DataTable,
  options: { headers?: boolean; autofit?: boolean } = {}
): ExcelJS.Worksheet {
  const { headers = true, autofit = false } = options;

  // Create new worksheet
  const worksheet = workbook.addWorksheet(sheetName);

  // Add data
  addDataToSheet(worksheet, data, { headers, autofit });

  return worksheet;
}

/**
 * List named ranges in workbook
 */
export function listNamedRanges(_workbook: ExcelJS.Workbook): string[] {
  // ExcelJS stores defined names
  const names: string[] = [];

  // Note: ExcelJS has limited support for named ranges
  // This is a placeholder for future enhancement

  return names;
}

/**
 * Check if file is a template format
 */
export function isTemplateFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'xltx' || ext === 'xltm';
}
