# xlsx-cli

Create, read, and manipulate Excel spreadsheets (.xlsx) from the command line.

## Installation

```bash
cd ${PAI_DIR}/bin/xlsx-cli
bun install
```

## Quick Start

```bash
# Create spreadsheet from JSON
bun xlsx-cli.ts create data.json -o output.xlsx

# Create from CSV with auto-fit columns
bun xlsx-cli.ts create data.csv -o report.xlsx --autofit

# Read spreadsheet to JSON
bun xlsx-cli.ts read input.xlsx -o data.json

# Get spreadsheet info
bun xlsx-cli.ts info spreadsheet.xlsx
```

## Commands

### create

Create an Excel spreadsheet from JSON, CSV, or Markdown table data.

```bash
bun xlsx-cli.ts create <input> [options]
```

**Arguments:**
- `<input>` - Input file path, or `-` for stdin

**Options:**
- `-o, --output <path>` - Output file path (default: `output.xlsx`)
- `-t, --template <path>` - Excel template file (.xltx/.xlsx)
- `-f, --format <type>` - Input format: json|csv|md (auto-detect)
- `-s, --sheet <name>` - Sheet name (default: `Sheet1`)
- `--title <title>` - Workbook title
- `--author <author>` - Workbook author
- `--autofit` - Auto-fit column widths
- `--no-headers` - Data does not include headers

**Examples:**

```bash
# From JSON
bun xlsx-cli.ts create data.json -o output.xlsx

# From CSV with metadata
bun xlsx-cli.ts create report.csv -o report.xlsx \
  --title "Q4 Report" \
  --author "Finance Team" \
  --autofit

# From Markdown table (stdin)
echo "| Name | Value |
|------|-------|
| A    | 100   |
| B    | 200   |" | bun xlsx-cli.ts create - -o output.xlsx --format md

# Using a template
bun xlsx-cli.ts create data.json -o report.xlsx --template template.xltx
```

### read

Read data from an Excel spreadsheet and export to JSON or CSV.

```bash
bun xlsx-cli.ts read <input> [options]
```

**Arguments:**
- `<input>` - Excel file path

**Options:**
- `-o, --output <path>` - Output file path (stdout if omitted)
- `-f, --format <type>` - Output format: json|csv (default: json)
- `-s, --sheet <name>` - Sheet name or index to read
- `--range <range>` - Cell range to read (e.g., `A1:D10`)
- `--no-headers` - First row is not headers

**Examples:**

```bash
# Export to JSON (stdout)
bun xlsx-cli.ts read input.xlsx

# Export to file
bun xlsx-cli.ts read input.xlsx -o data.json

# Export to CSV
bun xlsx-cli.ts read input.xlsx -o data.csv --format csv

# Export specific sheet
bun xlsx-cli.ts read input.xlsx --sheet "Sales" -o sales.json

# Export specific range
bun xlsx-cli.ts read input.xlsx --range "A1:D10" -o subset.json
```

### info

Display spreadsheet information including sheets and properties.

```bash
bun xlsx-cli.ts info <input>
```

**Example output:**

```
File: report.xlsx
Sheets: 3
  1. Sales (150 rows, 8 columns)
  2. Inventory (45 rows, 12 columns)
  3. Summary (10 rows, 4 columns)
Properties:
  Title: Q4 Report
  Author: Finance Team
  Created: 2025-01-15
```

### edit

Modify an existing Excel spreadsheet.

```bash
bun xlsx-cli.ts edit <input> [options]
```

**Arguments:**
- `<input>` - Excel file path

**Options:**
- `-a, --append <file>` - Append data from JSON/CSV file
- `--add-sheet <name>` - Add a new sheet
- `--data <file>` - Data file for new sheet
- `--set <cell=value>` - Set cell value (repeatable)
- `-s, --sheet <name>` - Target sheet for append/set
- `-o, --output <path>` - Output file (default: overwrite)
- `--autofit` - Auto-fit column widths

**Examples:**

```bash
# Append data to existing sheet
bun xlsx-cli.ts edit report.xlsx --append newdata.json

# Add new sheet with data
bun xlsx-cli.ts edit report.xlsx --add-sheet "Summary" --data summary.json

# Set specific cells
bun xlsx-cli.ts edit report.xlsx --set "A1=Total" --set "B1=100"

# Save to new file
bun xlsx-cli.ts edit report.xlsx --append data.json -o report_updated.xlsx
```

## Input Formats

### JSON

Array of objects where keys become column headers:

```json
[
  { "Name": "Alice", "Age": 30, "City": "NYC" },
  { "Name": "Bob", "Age": 25, "City": "LA" }
]
```

### CSV

Standard comma-separated values with header row:

```csv
Name,Age,City
Alice,30,NYC
Bob,25,LA
```

### Markdown Table

GitHub-flavored markdown tables:

```markdown
| Name  | Age | City |
|-------|-----|------|
| Alice | 30  | NYC  |
| Bob   | 25  | LA   |
```

## Template Support

Use `.xltx` or `.xlsx` files as templates:

```bash
bun xlsx-cli.ts create data.json -o report.xlsx --template ~/templates/report.xltx
```

Templates preserve:
- Formatting and styles
- Headers and footers
- Charts and images
- Formulas (in non-data cells)

Data is inserted starting from row 2, matching column headers in row 1.

## PAI Skill Integration

This CLI is designed for use with PAI skills:

```typescript
// Generate data
const data = [
  { product: "Widget", sales: 100, revenue: 5000 },
  { product: "Gadget", sales: 50, revenue: 2500 },
];

// Create spreadsheet
await $`echo ${JSON.stringify(data)} | bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create - \
  -o ${outputPath} \
  --title "Sales Report" \
  --autofit`;
```

## Development

```bash
# Run directly
bun xlsx-cli.ts create test.json -o test.xlsx

# Type check
bun run tsc --noEmit

# Run tests
bun test
```

## Dependencies

- **exceljs** - Excel file manipulation
- **csv-parse** - CSV parsing
- **commander** - CLI framework

## License

MIT
