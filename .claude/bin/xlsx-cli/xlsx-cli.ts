#!/usr/bin/env bun
/**
 * xlsx-cli - Create, read, and manipulate Excel spreadsheets
 *
 * Usage:
 *   xlsx-cli create <input> -o <output.xlsx> [options]
 *   xlsx-cli read <input.xlsx> [-o output.json] [options]
 *   xlsx-cli info <input.xlsx>
 *   xlsx-cli edit <input.xlsx> [options]
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { parseInput, detectFormat } from "./lib/readers.ts";
import {
  createWorkbook,
  addDataToSheet,
  loadWorkbook,
  saveWorkbook,
  getWorksheet,
  getWorkbookInfo,
  appendDataToSheet,
  setCellValue,
} from "./lib/workbook.ts";
import { loadTemplate, populateTemplate, addSheetWithData } from "./lib/template.ts";
import { toJSON, toCSV } from "./lib/exporters.ts";

const program = new Command();

/**
 * Read input from file or stdin
 */
async function readInput(inputPath: string): Promise<string> {
  if (inputPath === "-") {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of Bun.stdin.stream()) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  const resolvedPath = inputPath.replace(/^~/, process.env.HOME || "");
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  return fs.readFileSync(resolvedPath, "utf-8");
}

/**
 * Resolve path with home directory expansion
 */
function resolvePath(inputPath: string): string {
  return inputPath.replace(/^~/, process.env.HOME || "");
}

// Program configuration
program
  .name("xlsx-cli")
  .description("Create, read, and manipulate Excel spreadsheets")
  .version("1.0.0");

// Create command
program
  .command("create <input>")
  .description("Create an Excel spreadsheet from JSON, CSV, or Markdown data")
  .option("-o, --output <path>", "Output file path", "output.xlsx")
  .option("-t, --template <path>", "Excel template file (.xltx/.xlsx)")
  .option("-f, --format <type>", "Input format: json|csv|md (auto-detect)")
  .option("-s, --sheet <name>", "Sheet name", "Sheet1")
  .option("--title <title>", "Workbook title")
  .option("--author <author>", "Workbook author")
  .option("--autofit", "Auto-fit column widths")
  .option("--no-headers", "Data does not include headers")
  .action(async (input: string, options) => {
    try {
      // Read input data
      const content = await readInput(input);
      const filename = input === "-" ? undefined : input;

      // Parse input data
      const format = options.format || detectFormat(content, filename);
      const data = parseInput(content, format, filename, {
        headers: options.headers !== false,
      });

      if (data.length === 0) {
        console.error("No data found in input");
        process.exit(1);
      }

      console.error(`Parsed ${data.length} rows from ${format} input`);

      let workbook;

      if (options.template) {
        // Load and populate template
        const templatePath = resolvePath(options.template);
        console.error(`Using template: ${templatePath}`);
        workbook = await loadTemplate(templatePath);
        await populateTemplate(workbook, data, {
          sheet: options.sheet === "Sheet1" ? 0 : options.sheet,
          autofit: options.autofit,
        });
      } else {
        // Create new workbook
        workbook = createWorkbook({
          title: options.title,
          author: options.author,
        });

        // Add worksheet with data
        const worksheet = workbook.addWorksheet(options.sheet);
        addDataToSheet(worksheet, data, {
          headers: options.headers !== false,
          autofit: options.autofit,
        });
      }

      // Save output
      const outputPath = resolvePath(options.output);
      await saveWorkbook(workbook, outputPath);

      console.error(`Created: ${outputPath}`);
      console.error(`  Sheet: ${options.sheet}`);
      console.error(`  Rows: ${data.length}`);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

// Read command
program
  .command("read <input>")
  .description("Read data from an Excel spreadsheet")
  .option("-o, --output <path>", "Output file path (stdout if omitted)")
  .option("-f, --format <type>", "Output format: json|csv", "json")
  .option("-s, --sheet <name>", "Sheet name or index to read")
  .option("--range <range>", "Cell range to read (e.g., A1:D10)")
  .option("--filter <expr>", "Filter rows (e.g., isRequirement=TRUE, Status!=Done)")
  .option("--no-headers", "First row is not headers")
  .action(async (input: string, options) => {
    try {
      const inputPath = resolvePath(input);
      const workbook = await loadWorkbook(inputPath);

      // Get worksheet
      const worksheet = getWorksheet(workbook, options.sheet);

      // Export data
      let output: string;
      if (options.format === "csv") {
        output = toCSV(worksheet, {
          headers: options.headers !== false,
          range: options.range,
          filter: options.filter,
        });
      } else {
        const data = toJSON(worksheet, {
          headers: options.headers !== false,
          range: options.range,
          filter: options.filter,
        });
        output = JSON.stringify(data, null, 2);
      }

      // Write output
      if (options.output) {
        const outputPath = resolvePath(options.output);
        fs.writeFileSync(outputPath, output);
        console.error(`Exported to: ${outputPath}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

// Info command
program
  .command("info <input>")
  .description("Display spreadsheet information")
  .action(async (input: string) => {
    try {
      const inputPath = resolvePath(input);
      const workbook = await loadWorkbook(inputPath);
      const info = getWorkbookInfo(workbook, path.basename(input));

      console.log(`File: ${info.filename}`);
      console.log(`Sheets: ${info.sheets.length}`);

      for (const sheet of info.sheets) {
        console.log(
          `  ${sheet.index}. ${sheet.name} (${sheet.rowCount} rows, ${sheet.columnCount} columns)`
        );
      }

      if (info.properties.title || info.properties.author) {
        console.log("Properties:");
        if (info.properties.title) {
          console.log(`  Title: ${info.properties.title}`);
        }
        if (info.properties.author) {
          console.log(`  Author: ${info.properties.author}`);
        }
        if (info.properties.created) {
          console.log(
            `  Created: ${info.properties.created.toISOString().split("T")[0]}`
          );
        }
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

// Edit command
program
  .command("edit <input>")
  .description("Edit an existing Excel spreadsheet")
  .option("-a, --append <file>", "Append data from JSON/CSV file")
  .option("--add-sheet <name>", "Add a new sheet")
  .option("--data <file>", "Data file for new sheet")
  .option("--set <cell=value>", "Set cell value (can be repeated)", collect, [])
  .option("-s, --sheet <name>", "Target sheet for append/set operations")
  .option("-o, --output <path>", "Output file path (default: overwrite input)")
  .option("--autofit", "Auto-fit column widths")
  .action(async (input: string, options) => {
    try {
      const inputPath = resolvePath(input);
      const workbook = await loadWorkbook(inputPath);

      let modified = false;

      // Append data
      if (options.append) {
        const content = await readInput(options.append);
        const data = parseInput(content, undefined, options.append);

        const worksheet = getWorksheet(workbook, options.sheet);
        appendDataToSheet(worksheet, data);

        console.error(`Appended ${data.length} rows to "${worksheet.name}"`);
        modified = true;
      }

      // Add new sheet
      if (options.addSheet) {
        if (options.data) {
          const content = await readInput(options.data);
          const data = parseInput(content, undefined, options.data);
          addSheetWithData(workbook, options.addSheet, data, {
            autofit: options.autofit,
          });
          console.error(
            `Added sheet "${options.addSheet}" with ${data.length} rows`
          );
        } else {
          workbook.addWorksheet(options.addSheet);
          console.error(`Added empty sheet "${options.addSheet}"`);
        }
        modified = true;
      }

      // Set cell values
      if (options.set && options.set.length > 0) {
        const worksheet = getWorksheet(workbook, options.sheet);

        for (const cellValue of options.set) {
          const [cell, value] = parseCellValue(cellValue);
          setCellValue(worksheet, cell, value);
          console.error(`Set ${cell} = ${value}`);
        }
        modified = true;
      }

      if (!modified) {
        console.error("No edit operations specified");
        console.error("Use --append, --add-sheet, or --set to modify the spreadsheet");
        process.exit(1);
      }

      // Save output
      const outputPath = resolvePath(options.output || input);
      await saveWorkbook(workbook, outputPath);

      console.error(`Updated: ${outputPath}`);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });

/**
 * Collect multiple option values
 */
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * Parse cell=value string
 */
function parseCellValue(input: string): [string, string] {
  const eqIndex = input.indexOf("=");
  if (eqIndex === -1) {
    throw new Error(`Invalid cell=value format: ${input}`);
  }
  return [input.substring(0, eqIndex), input.substring(eqIndex + 1)];
}

// Help with examples
program.on("--help", () => {
  console.log("");
  console.log("Examples:");
  console.log("  $ xlsx-cli create data.json -o output.xlsx");
  console.log("  $ xlsx-cli create data.csv -o report.xlsx --autofit");
  console.log('  $ cat table.md | xlsx-cli create - -o output.xlsx --format md');
  console.log("  $ xlsx-cli create data.json -o report.xlsx --template template.xltx");
  console.log("");
  console.log("  $ xlsx-cli read input.xlsx");
  console.log("  $ xlsx-cli read input.xlsx -o data.json");
  console.log("  $ xlsx-cli read input.xlsx -o data.csv --format csv");
  console.log('  $ xlsx-cli read input.xlsx --sheet "Sales" -o sales.json');
  console.log('  $ xlsx-cli read input.xlsx --filter "isRequirement=TRUE"');
  console.log('  $ xlsx-cli read input.xlsx --filter "Status!=Done"');
  console.log("");
  console.log("  $ xlsx-cli info spreadsheet.xlsx");
  console.log("");
  console.log("  $ xlsx-cli edit input.xlsx --append newdata.json");
  console.log('  $ xlsx-cli edit input.xlsx --add-sheet "Summary" --data summary.json');
  console.log('  $ xlsx-cli edit input.xlsx --set "A1=Total" --set "B1=100"');
});

// Parse and run
program.parse();
