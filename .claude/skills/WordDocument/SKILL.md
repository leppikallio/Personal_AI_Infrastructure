---
name: WordDocument
description: Convert Markdown to professionally-formatted Word documents (.docx) using company templates. USE WHEN user wants to create Word document, convert markdown to docx, generate report, create professional document, OR mentions Word, docx, template formatting, document generation.
---

# WordDocument

Convert Markdown content to professionally-formatted Word documents using company .dotx templates. Preserves template styling including headers, footers, logos, fonts, and corporate branding.

## Workflow Routing

**When executing a workflow, call the notification script via Bash:**

```bash
${PAI_DIR}/tools/skill-workflow-notification WorkflowName WordDocument
```

| Workflow | Trigger | File |
|----------|---------|------|
| **Create** | "create Word document", "convert to docx", "generate report" | `workflows/Create.md` |
| **Edit** | "append to document", "add content to docx" | `workflows/Edit.md` |

## CLI Location

The docx-cli tool is located at: `${PAI_DIR}/bin/docx-cli/docx-cli.ts`

## Examples

**Example 1: Create a Word document from Markdown**
```
User: "Create a Word document from this report"
-> Invokes Create workflow
-> Converts markdown content to docx using Orbit template
-> Generates cover page with metadata (title, author, date)
-> Auto-generates Table of Contents from headings
-> User receives professionally formatted .docx file
```

**Example 2: Generate a document with full metadata**
```
User: "Convert this markdown to a Word doc with title 'Q4 Analysis', author 'Engineering Team'"
-> Invokes Create workflow
-> Passes metadata to CLI (--title, --author, --date, etc.)
-> Creates cover page with all specified metadata
-> Applies corporate template styling
-> User receives branded document with cover page and TOC
```

**Example 3: Append content to existing document**
```
User: "Add this section to my existing report.docx"
-> Invokes Edit workflow
-> Reads existing document
-> Appends new markdown content
-> Preserves existing formatting
-> User receives updated document
```

## Supported Markdown Features

| Markdown | Word Element |
|----------|--------------|
| `# Heading 1` | Heading1 style (from template) |
| `## Heading 2` | Heading2 style |
| `### Heading 3` | Heading3 style |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `` `code` `` | Code style (Consolas font) |
| `[link](url)` | Hyperlink |
| `![alt](path)` | Embedded image (auto-sized) |
| `- item` | Bullet list |
| `1. item` | Numbered list |
| `> quote` | Quote style |
| `---` | Page break |
| Tables | Table Grid style |

## Document Structure

Generated documents include:
1. **Cover Page** - Title, subtitle, author, date, version, confidentiality
2. **Table of Contents** - Auto-generated from headings (H1-H3)
3. **Content** - Converted markdown with template styles

## Template

Default template: `~/orbit_doc_template.dotx`

The template provides:
- Corporate headers/footers with logos
- Branded heading styles (colors, fonts)
- Page margins and numbering
- Professional document appearance

## Quick Reference

```bash
# Basic conversion
bun ${PAI_DIR}/bin/docx-cli/docx-cli.ts create report.md -o report.docx

# With metadata
bun ${PAI_DIR}/bin/docx-cli/docx-cli.ts create report.md -o report.docx \
  --title "Report Title" \
  --author "Author Name" \
  --date "2025-01-15" \
  --doc-version "1.0"

# From stdin (for PAI integration)
echo "# Title\n\nContent..." | bun ${PAI_DIR}/bin/docx-cli/docx-cli.ts create - -o output.docx

# Edit existing document
bun ${PAI_DIR}/bin/docx-cli/docx-cli.ts edit existing.docx --append additions.md
```
