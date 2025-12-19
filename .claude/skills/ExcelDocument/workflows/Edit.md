# Edit Excel Spreadsheet Workflow

Modify existing Excel spreadsheets using xlsx-cli.

## Prerequisites

- xlsx-cli installed at `${PAI_DIR}/bin/xlsx-cli/`
- Bun runtime available
- Existing .xlsx file to modify

## Workflow Steps

### Step 1: Verify Existing Spreadsheet

Ensure the target file exists and check its structure:
```bash
ls -la <existing.xlsx>
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts info <existing.xlsx>
```

### Step 2: Prepare Modification

Determine the edit operation:
- **Append**: Add rows to existing sheet
- **Add Sheet**: Create new sheet with data
- **Set Cells**: Update specific cell values

### Step 3: Execute CLI

**Append data to existing sheet:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit <existing.xlsx> \
  --append <newdata.json>
```

**Append to specific sheet:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit <existing.xlsx> \
  --append <newdata.json> \
  --sheet "Sales"
```

**Add new sheet with data:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit <existing.xlsx> \
  --add-sheet "Summary" \
  --data <summary.json>
```

**Add empty sheet:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit <existing.xlsx> \
  --add-sheet "Notes"
```

**Set specific cell values:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit <existing.xlsx> \
  --set "A1=Total" \
  --set "B1=100" \
  --set "C1=2025-01-15"
```

**Save to new file instead of overwriting:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit <existing.xlsx> \
  --append <newdata.json> \
  -o <updated.xlsx>
```

**Combine operations:**
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit <existing.xlsx> \
  --add-sheet "New Data" \
  --data <data.json> \
  --set "A1=Updated" \
  -o <output.xlsx>
```

### Step 4: Verify Output

Check the updated spreadsheet:
```bash
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts info <output.xlsx>
```

### Step 5: Inform User

Report:
- Operations performed
- Number of rows added/modified
- Output file location

## Error Handling

| Error | Solution |
|-------|----------|
| File not found | Verify input path exists |
| Sheet not found | Use `info` to list available sheets |
| Invalid cell reference | Use Excel notation (A1, B2, etc.) |
| Permission denied | Check write permissions |

## Example Execution

```bash
# Add quarterly data to existing report
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit yearly_report.xlsx \
  --add-sheet "Q4 2025" \
  --data q4_data.json \
  --autofit

# Update summary cells
bun ${PAI_DIR}/bin/xlsx-cli/xlsx-cli.ts edit report.xlsx \
  --sheet "Summary" \
  --set "A1=Grand Total" \
  --set "B1=50000"
```

## Notes

- Original formatting is preserved
- Use `-o` to save to new file instead of overwriting
- Multiple `--set` options can be used
- Data files can be JSON or CSV
- Sheet must exist for append operations
