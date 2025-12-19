---
name: ExcelDocument
description: Create, read, and manipulate Excel spreadsheets (.xlsx). USE WHEN user wants to create spreadsheet, convert JSON/CSV to Excel, read Excel data, export to JSON/CSV, OR mentions Excel, xlsx, spreadsheet, workbook.
---

# ExcelDocument

Create, read, and manipulate Excel spreadsheets using xlsx-cli. Supports JSON, CSV, and Markdown table input, template-based generation, and export to various formats.

## Workflow Routing

**When executing a workflow, call the notification script via Bash:**

```bash
${PAI_DIR}/tools/skill-workflow-notification WorkflowName ExcelDocument
```

| Workflow | Trigger | File |
|----------|---------|------|
| **Create** | "create spreadsheet", "convert to Excel", "make xlsx", "generate Excel" | `workflows/Create.md` |
| **Read** | "read Excel", "export to JSON", "get spreadsheet data", "extract from xlsx" | `workflows/Read.md` |
| **Edit** | "update spreadsheet", "add sheet", "append data", "modify Excel" | `workflows/Edit.md` |

## CLI Location

The xlsx-cli tool is located at: `${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts`

## Examples

**Example 1: Create Excel from JSON data**
```
User: "Create an Excel spreadsheet from this sales data"
-> Invokes Create workflow
-> Parses JSON/CSV/Markdown input
-> Creates xlsx with headers and formatted data
-> User receives spreadsheet file
```

**Example 2: Read Excel data**
```
User: "Read this Excel file and give me the data as JSON"
-> Invokes Read workflow
-> Loads xlsx file
-> Exports data as JSON array
-> User receives structured data
```

**Example 3: Add sheet to existing spreadsheet**
```
User: "Add a summary sheet to this report"
-> Invokes Edit workflow
-> Loads existing xlsx
-> Adds new sheet with data
-> User receives updated spreadsheet
```

## Supported Features

| Input Format | Description |
|--------------|-------------|
| JSON | Array of objects -> rows with headers from keys |
| CSV | Parse CSV with proper delimiter handling |
| Markdown | Extract tables from markdown syntax |

| Output Format | Description |
|---------------|-------------|
| JSON | Export sheet as array of objects |
| CSV | Export sheet as CSV text |
| Info | Sheet names, row/column counts, metadata |

## Document Structure

Generated spreadsheets include:
- **Headers** - Column names from data keys (first row, bold)
- **Data rows** - Values from input data
- **Auto-fit columns** - Optional automatic column width sizing
- **Metadata** - Title, author, creation date

## Template Support

Use `.xltx` or `.xlsx` files as templates to preserve:
- Corporate formatting and styles
- Headers and footers
- Charts and images
- Pre-defined formulas

## Quick Reference

```bash
# Create from JSON
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create data.json -o output.xlsx

# Create with options
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create data.json -o output.xlsx \
  --title "Report" \
  --author "Team" \
  --autofit

# Read to JSON
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read input.xlsx -o data.json

# Read with filter (e.g., only rows where isRequirement=TRUE)
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read input.xlsx --filter "isRequirement=TRUE"

# Get info
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts info spreadsheet.xlsx

# Edit existing
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit input.xlsx --append newdata.json
```

## Row Filtering

Use `--filter` to read only rows matching a condition:

| Operator | Example | Description |
|----------|---------|-------------|
| `=` | `Status=Active` | Equals (case-insensitive) |
| `!=` | `Status!=Done` | Not equals |
| `>` | `Amount>100` | Greater than (numeric) |
| `<` | `Age<30` | Less than (numeric) |
| `>=` | `Score>=90` | Greater than or equal |
| `<=` | `Price<=50` | Less than or equal |

**Common patterns:**
- `--filter "isRequirement=TRUE"` - Only actual data rows, skip headers/sections
- `--filter "Status!=Completed"` - Exclude completed items
- `--filter "Priority=High"` - Only high priority items
