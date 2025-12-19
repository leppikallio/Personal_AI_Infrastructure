# Create Excel Spreadsheet Workflow

Create an Excel spreadsheet from JSON, CSV, or Markdown table data using xlsx-cli.

## Prerequisites

- xlsx-cli installed at `${PAI_DIR}/bin/xlsx-cli/`
- Bun runtime available
- Data in JSON, CSV, or Markdown format

## Workflow Steps

### Step 1: Prepare Data

Ensure data is ready in one of these formats:
- **JSON**: Array of objects
- **CSV**: Comma-separated values with headers
- **Markdown**: Table with `|` delimiters

### Step 2: Gather Metadata (Optional)

Collect spreadsheet metadata:
- `title` - Workbook title
- `author` - Author name
- `sheet` - Sheet name (default: "Sheet1")

### Step 3: Execute CLI

**From JSON file:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create <input.json> -o <output.xlsx> \
  --title "Document Title" \
  --author "Author Name" \
  --autofit
```

**From CSV file:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create <input.csv> -o <output.xlsx> \
  --autofit
```

**From stdin (for generated content):**
```bash
echo '${json_content}' | bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create - -o <output.xlsx> \
  --format json \
  --autofit
```

**From Markdown table:**
```bash
echo '${markdown_table}' | bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create - -o <output.xlsx> \
  --format md \
  --autofit
```

**With template:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create data.json -o output.xlsx \
  --template /path/to/template.xltx
```

### Step 4: Verify Output

Check that the spreadsheet was created:
```bash
ls -la <output.xlsx>
```

### Step 5: Inform User

Report:
- Output file location
- Number of rows created
- Sheet name
- Any applied options (autofit, template, etc.)

## Error Handling

| Error | Solution |
|-------|----------|
| No data found | Verify input format and content |
| Template not found | Check template path exists |
| Permission denied | Check write permissions for output directory |
| Invalid JSON | Validate JSON syntax |

## Example Execution

```bash
# Create a sales report from JSON
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts create sales_data.json \
  -o "Sales-Report-2025.xlsx" \
  --title "Q4 Sales Report" \
  --author "Sales Team" \
  --sheet "Sales Data" \
  --autofit
```

## Notes

- JSON input must be an array of objects
- CSV files should have a header row
- Markdown tables need `|---` separator row
- Use `--autofit` for automatic column sizing
- Use `--no-headers` if data doesn't include column headers
