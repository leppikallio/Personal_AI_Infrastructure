# Edit Word Document Workflow

Append content to an existing Word document using the docx-cli.

## Prerequisites

- docx-cli installed at `${PAI_DIR}/bin/docx-cli/`
- Existing .docx file to modify
- Bun runtime available

## Workflow Steps

### Step 1: Verify Existing Document

Ensure the target document exists:
```bash
ls -la <existing.docx>
```

### Step 2: Prepare Content to Append

Create or gather markdown content to append. Can be:
- A markdown file
- Inline content

### Step 3: Execute CLI

**Append and overwrite original:**
```bash
bun ${PAI_DIR}/bin/docx-cli/docx-cli.ts edit <existing.docx> \
  --append <additions.md>
```

**Append and save to new file:**
```bash
bun ${PAI_DIR}/bin/docx-cli/docx-cli.ts edit <existing.docx> \
  --append <additions.md> \
  -o <updated.docx>
```

### Step 4: Verify Output

Check the document was updated:
```bash
ls -la <output.docx>
```

### Step 5: Inform User

Report:
- Updated file location
- Content was appended at the end of the document
- Original formatting preserved

## Error Handling

| Error | Solution |
|-------|----------|
| Document not found | Verify input path exists |
| Document corrupted | Check if .docx is valid |
| Permission denied | Check write permissions |

## Example Execution

```bash
# Add appendix to existing report
bun ${PAI_DIR}/bin/docx-cli/docx-cli.ts edit report.docx \
  --append appendix.md \
  -o report-with-appendix.docx
```

## Notes

- Original document formatting is preserved
- Appended content inherits template styles
- Use `-o` to save to new file instead of overwriting
- TOC may need manual refresh after appending (Ctrl+A, F9 in Word)
