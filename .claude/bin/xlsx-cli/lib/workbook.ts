/**
 * Workbook creation and manipulation module
 * Handles Excel workbook creation, data population, and saving
 */

import ExcelJS from "exceljs";
import * as fs from "fs";
import type { DataTable } from "./readers.ts";

export interface WorkbookOptions {
  title?: string;
  author?: string;
  subject?: string;
  company?: string;
  created?: Date;
}

export interface SheetOptions {
  name?: string;
  headers?: boolean;
  autofit?: boolean;
  headerStyle?: Partial<ExcelJS.Style>;
}

/**
 * Create a new workbook with optional properties
 */
export function createWorkbook(options: WorkbookOptions = {}): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();

  // Set workbook properties
  if (options.title) workbook.title = options.title;
  if (options.author) workbook.creator = options.author;
  if (options.subject) workbook.subject = options.subject;
  if (options.company) workbook.company = options.company;

  workbook.created = options.created || new Date();
  workbook.modified = new Date();

  return workbook;
}

/**
 * Add data to a worksheet
 */
export function addDataToSheet(
  worksheet: ExcelJS.Worksheet,
  data: DataTable,
  options: SheetOptions = {}
): void {
  const { headers = true, autofit = false, headerStyle } = options;

  if (data.length === 0) {
    return;
  }

  // Get column headers from first row
  const columnKeys = Object.keys(data[0]);

  // Set up columns
  worksheet.columns = columnKeys.map((key) => ({
    header: headers ? key : undefined,
    key,
    width: autofit ? calculateColumnWidth(key, data, key) : undefined,
  }));

  // Add data rows
  for (const row of data) {
    worksheet.addRow(row);
  }

  // Style header row if headers are enabled
  if (headers && worksheet.rowCount > 0) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Apply custom header style if provided
    if (headerStyle) {
      headerRow.eachCell((cell) => {
        Object.assign(cell.style, headerStyle);
      });
    }

    headerRow.commit();
  }

  // Auto-fit columns if enabled
  if (autofit) {
    autoFitColumns(worksheet, data);
  }
}

/**
 * Calculate optimal column width based on content
 */
function calculateColumnWidth(
  header: string,
  data: DataTable,
  key: string
): number {
  let maxLength = header.length;

  for (const row of data) {
    const value = row[key];
    const length = String(value ?? "").length;
    if (length > maxLength) {
      maxLength = length;
    }
  }

  // Add some padding and cap at reasonable max
  return Math.min(Math.max(maxLength + 2, 10), 50);
}

/**
 * Auto-fit all columns in a worksheet
 */
export function autoFitColumns(
  worksheet: ExcelJS.Worksheet,
  data?: DataTable
): void {
  worksheet.columns.forEach((column) => {
    if (!column.key) return;

    let maxLength = column.header?.toString().length ?? 10;

    // Check data values if available
    if (data) {
      for (const row of data) {
        const value = row[column.key as string];
        const length = String(value ?? "").length;
        if (length > maxLength) {
          maxLength = length;
        }
      }
    } else {
      // Check actual cell values
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const length = String(cell.value ?? "").length;
        if (length > maxLength) {
          maxLength = length;
        }
      });
    }

    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });
}

/**
 * Save workbook to file
 */
export async function saveWorkbook(
  workbook: ExcelJS.Workbook,
  outputPath: string
): Promise<void> {
  const resolvedPath = outputPath.replace(/^~/, process.env.HOME || "");
  await workbook.xlsx.writeFile(resolvedPath);
}

/**
 * Save workbook to buffer
 */
export async function workbookToBuffer(
  workbook: ExcelJS.Workbook
): Promise<Buffer> {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Load workbook from file
 */
export async function loadWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
  const resolvedPath = filePath.replace(/^~/, process.env.HOME || "");

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolvedPath);
  return workbook;
}

/**
 * Get worksheet by name or index
 */
export function getWorksheet(
  workbook: ExcelJS.Workbook,
  sheetIdentifier?: string | number
): ExcelJS.Worksheet {
  if (sheetIdentifier === undefined) {
    // Return first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Workbook has no worksheets");
    }
    return worksheet;
  }

  if (typeof sheetIdentifier === "number") {
    const worksheet = workbook.worksheets[sheetIdentifier];
    if (!worksheet) {
      throw new Error(`Worksheet at index ${sheetIdentifier} not found`);
    }
    return worksheet;
  }

  // Try to find by name
  const worksheet = workbook.getWorksheet(sheetIdentifier);
  if (!worksheet) {
    // Try to parse as index
    const index = parseInt(sheetIdentifier, 10);
    if (!isNaN(index)) {
      const ws = workbook.worksheets[index];
      if (ws) return ws;
    }
    throw new Error(`Worksheet "${sheetIdentifier}" not found`);
  }
  return worksheet;
}

/**
 * Get workbook info
 */
export interface WorkbookInfo {
  filename: string;
  sheets: SheetInfo[];
  properties: {
    title?: string;
    author?: string;
    created?: Date;
    modified?: Date;
  };
}

export interface SheetInfo {
  index: number;
  name: string;
  rowCount: number;
  columnCount: number;
}

export function getWorkbookInfo(
  workbook: ExcelJS.Workbook,
  filename: string
): WorkbookInfo {
  const sheets: SheetInfo[] = workbook.worksheets.map((ws, index) => ({
    index: index + 1,
    name: ws.name,
    rowCount: ws.rowCount,
    columnCount: ws.columnCount,
  }));

  return {
    filename,
    sheets,
    properties: {
      title: workbook.title,
      author: workbook.creator,
      created: workbook.created,
      modified: workbook.modified,
    },
  };
}

/**
 * Append data to existing worksheet
 */
export function appendDataToSheet(
  worksheet: ExcelJS.Worksheet,
  data: DataTable
): void {
  if (data.length === 0) return;

  // Add each row at the end
  for (const row of data) {
    worksheet.addRow(row);
  }
}

/**
 * Set cell value
 */
export function setCellValue(
  worksheet: ExcelJS.Worksheet,
  cellRef: string,
  value: unknown
): void {
  const cell = worksheet.getCell(cellRef);

  // Try to parse as number if it looks like one
  if (typeof value === "string") {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && value === numValue.toString()) {
      cell.value = numValue;
      return;
    }

    // Try to parse as date
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime()) && value.includes("-")) {
      cell.value = dateValue;
      return;
    }
  }

  cell.value = value as ExcelJS.CellValue;
}
