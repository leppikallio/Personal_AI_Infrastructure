# Read Excel Spreadsheet Workflow

Extract data from Excel spreadsheets to JSON or CSV format using xlsx-cli.

## Prerequisites

- xlsx-cli installed at `${PAI_DIR}/bin/xlsx-cli/`
- Bun runtime available
- Existing .xlsx file to read

## Workflow Steps

### Step 1: Verify Input File

Ensure the target spreadsheet exists:
```bash
ls -la <input.xlsx>
```

### Step 2: Get Spreadsheet Info (Optional)

Check available sheets and structure:
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts info <input.xlsx>
```

### Step 3: Execute CLI

**Export to JSON (file):**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx> -o <output.json>
```

**Export to JSON (stdout):**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx>
```

**Export to CSV:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx> -o <output.csv> --format csv
```

**Export specific sheet:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx> --sheet "Sales" -o <sales.json>
```

**Export specific range:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx> --range "A1:D10" -o <subset.json>
```

**Export without headers:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx> --no-headers -o <output.json>
```

**Filter rows by column value:**
```bash
# Only rows where isRequirement=TRUE (skip section headers)
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx> --filter "isRequirement=TRUE"

# Exclude completed items
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx> --filter "Status!=Done"

# Numeric comparisons
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read <input.xlsx> --filter "Amount>100"
```

**Supported filter operators:** `=`, `!=`, `>`, `<`, `>=`, `<=`

### Step 4: Process Results

The exported data can be:
- Displayed to the user
- Used for further processing
- Saved to a file

### Step 5: Inform User

Report:
- Number of rows extracted
- Column names (if headers)
- Output format and location

## Error Handling

| Error | Solution |
|-------|----------|
| File not found | Verify input path exists |
| Sheet not found | Use `info` command to list available sheets |
| Invalid range | Check range format (e.g., "A1:D10") |
| File corrupted | Check if xlsx is valid |

## Example Execution

```bash
# Read spreadsheet and display as JSON
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read financial_report.xlsx

# Export specific sheet to CSV
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts read report.xlsx \
  --sheet "Q4 Summary" \
  --format csv \
  -o q4_summary.csv
```

## Notes

- Default output format is JSON
- First row is treated as headers by default
- Use `--no-headers` if first row is data
- Use `--range` to export a subset of cells
- Output to stdout if `-o` is not specified
