# docx-cli

Convert Markdown to Word documents using company templates (.dotx).

## Installation

```bash
cd ${PAI_DIR}/bin/docx-cli
bun install
```

## Quick Start

```bash
# Create a Word document from Markdown
bun docx-cli.ts create report.md -o report.docx

# With cover page metadata
bun docx-cli.ts create report.md -o report.docx \
  --title "Q4 Analysis Report" \
  --author "John Doe" \
  --date "2025-01-15" \
  --doc-version "1.0"

# From stdin (for PAI skill integration)
echo "# Hello World\n\nThis is a test." | bun docx-cli.ts create - -o test.docx
```

## Commands

### create

Create a Word document from Markdown input.

```bash
bun docx-cli.ts create <input> [options]
```

**Arguments:**
- `<input>` - Markdown file path, or `-` for stdin

**Options:**
- `-o, --output <path>` - Output file path (default: `output.docx`)
- `-t, --template <path>` - Template file (.dotx) (default: `~/orbit_doc_template.dotx`)
- `-m, --meta <path>` - JSON metadata file for cover page
- `--title <title>` - Document title
- `--subtitle <subtitle>` - Document subtitle
- `--author <author>` - Document author
- `--date <date>` - Document date
- `--doc-version <version>` - Document version
- `--confidentiality <level>` - Confidentiality level (e.g., "Internal", "Confidential")
- `--no-template` - Create without template styling

**Examples:**

```bash
# Basic conversion
bun docx-cli.ts create report.md -o report.docx

# With all metadata options
bun docx-cli.ts create report.md -o report.docx \
  --title "Project Proposal" \
  --subtitle "Phase 1 Implementation" \
  --author "Engineering Team" \
  --date "2025-01-15" \
  --doc-version "1.0" \
  --confidentiality "Internal"

# Using JSON metadata file
bun docx-cli.ts create report.md -o report.docx --meta metadata.json

# Without template (simple styling)
bun docx-cli.ts create report.md -o report.docx --no-template
```

### edit

Edit an existing Word document by appending content.

```bash
bun docx-cli.ts edit <document> [options]
```

**Arguments:**
- `<document>` - Path to existing .docx file

**Options:**
- `-a, --append <markdown>` - Markdown file to append
- `-o, --output <path>` - Output file path (default: overwrite input)

**Examples:**

```bash
# Append content to existing document
bun docx-cli.ts edit report.docx --append additions.md

# Save to new file instead of overwriting
bun docx-cli.ts edit report.docx --append additions.md -o report_updated.docx
```

### styles

List available styles in a template file.

```bash
bun docx-cli.ts styles <template>
```

**Example:**

```bash
bun docx-cli.ts styles ~/orbit_doc_template.dotx
```

## Metadata JSON Format

```json
{
  "title": "Document Title",
  "subtitle": "Optional Subtitle",
  "author": "Author Name",
  "date": "2025-01-15",
  "version": "1.0",
  "confidentiality": "Internal"
}
```

All fields are optional. Missing fields are gracefully omitted from the cover page.

## Supported Markdown Features

| Markdown | Word Element |
|----------|--------------|
| `# Heading 1` | Heading1 style |
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

## Configuration

Create `~/.config/docx-cli/config.json` to set defaults:

```json
{
  "defaultTemplate": "~/orbit_doc_template.dotx",
  "outputDir": "~/Documents/Generated"
}
```

## PAI Skill Integration

This CLI is designed to be used by PAI skills. Example usage in a skill:

```typescript
// Generate markdown content
const markdown = `
# ${title}

## Executive Summary
${summary}

## Details
${details}
`;

// Convert to Word
await $`echo ${markdown} | bun ${PAI_DIR}/bin/docx-cli/docx-cli.ts create - \
  -o ${outputPath} \
  --title "${title}" \
  --author "${author}"`;
```

## Document Structure

Generated documents include:

1. **Cover Page** - Title, subtitle, metadata (from options)
2. **Table of Contents** - Auto-generated from headings (H1-H3)
3. **Content** - Converted markdown with template styles

## Template Requirements

The CLI works best with .dotx templates that include:

- `Heading1` through `Heading6` paragraph styles
- `Quote` paragraph style
- `Code` character or paragraph style
- `Hyperlink` character style
- Headers and footers with company branding
- Theme colors and fonts

## Troubleshooting

**Template not found:**
```bash
# Check template path
ls -la ~/orbit_doc_template.dotx

# Use explicit path
bun docx-cli.ts create report.md -o report.docx -t /full/path/to/template.dotx
```

**Images not showing:**
- Ensure image paths are relative to the markdown file location
- Supported formats: PNG, JPEG, GIF, BMP
- Remote URLs are not currently supported

**TOC not updating:**
- The Table of Contents uses Word field codes
- Open the document in Word and press Ctrl+A, then F9 to update

## Development

```bash
# Run directly
bun docx-cli.ts create test.md -o test.docx

# Type check
bun run tsc --noEmit

# Run tests
bun test
```

## License

MIT
