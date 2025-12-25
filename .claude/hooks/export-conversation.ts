#!/usr/bin/env bun

/**
 * Conversation Export Utility
 * Converts Claude Code transcripts (JSONL) to readable Markdown
 *
 * Used by:
 * - PreCompact hook (automatic, before context compression)
 * - Stop hook (optional, end of conversation)
 * - Manual invocation via /export-conversation skill
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

// Types for transcript entries
interface TranscriptEntry {
  type: 'user' | 'assistant' | 'system' | 'file-history-snapshot';
  message?: {
    role?: string;
    content?: string | ContentBlock[];
  };
  timestamp?: string;
  uuid?: string;
  sessionId?: string;
  cwd?: string;
  subtype?: string;
}

interface ContentBlock {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result';
  text?: string;
  thinking?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface ExportOptions {
  includeThinking?: boolean;
  includeToolCalls?: boolean;
  includeSystemMessages?: boolean;
  outputDir?: string;
}

interface ExportResult {
  success: boolean;
  outputPath?: string;
  messageCount?: number;
  error?: string;
}

/**
 * Extract text content from a message content field
 */
function extractTextContent(
  content: string | ContentBlock[] | undefined,
  options: ExportOptions = {}
): string {
  if (!content) return '';

  if (typeof content === 'string') {
    return content;
  }

  const parts: string[] = [];

  for (const block of content) {
    if (block.type === 'text' && block.text) {
      parts.push(block.text);
    } else if (block.type === 'thinking' && block.thinking && options.includeThinking) {
      parts.push(`\n<thinking>\n${block.thinking}\n</thinking>\n`);
    } else if (block.type === 'tool_use' && options.includeToolCalls) {
      const toolName = block.name || 'unknown';
      const inputStr = block.input ? JSON.stringify(block.input, null, 2) : '';
      parts.push(`\n**Tool: ${toolName}**\n\`\`\`json\n${inputStr}\n\`\`\`\n`);
    }
  }

  return parts.join('\n');
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return timestamp;
  }
}

/**
 * Generate a filename for the conversation export
 */
function generateFilename(sessionId: string, cwd?: string): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS

  // Extract project name from cwd if available
  let projectName = 'conversation';
  if (cwd) {
    const parts = cwd.split('/');
    projectName = parts[parts.length - 1] || 'conversation';
  }

  // Sanitize project name
  projectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();

  // Short session ID (first 8 chars)
  const shortSession = sessionId.slice(0, 8);

  return `${dateStr}-${timeStr}_${projectName}_${shortSession}.md`;
}

/**
 * Convert a transcript JSONL file to Markdown
 */
export function transcriptToMarkdown(transcriptPath: string, options: ExportOptions = {}): string {
  const lines = readFileSync(transcriptPath, 'utf-8').trim().split('\n');

  const messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }> = [];

  let sessionId = '';
  let cwd = '';
  let startTime = '';
  let endTime = '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const entry: TranscriptEntry = JSON.parse(line);

      // Capture metadata from first entry
      if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
      if (!cwd && entry.cwd) cwd = entry.cwd;

      // Track time range
      if (entry.timestamp) {
        if (!startTime) startTime = entry.timestamp;
        endTime = entry.timestamp;
      }

      // Process user messages
      if (entry.type === 'user' && entry.message?.content) {
        const content = extractTextContent(entry.message.content, options);
        if (content.trim()) {
          messages.push({
            role: 'user',
            content: content.trim(),
            timestamp: entry.timestamp || '',
          });
        }
      }

      // Process assistant messages
      if (entry.type === 'assistant' && entry.message?.content) {
        const content = extractTextContent(entry.message.content, options);
        if (content.trim()) {
          messages.push({
            role: 'assistant',
            content: content.trim(),
            timestamp: entry.timestamp || '',
          });
        }
      }

      // Optionally include system messages
      if (options.includeSystemMessages && entry.type === 'system') {
        const subtype = entry.subtype || 'system';
        messages.push({
          role: 'system',
          content: `[${subtype}]`,
          timestamp: entry.timestamp || '',
        });
      }
    } catch {}
  }

  // Build markdown output
  const md: string[] = [];

  // Header with metadata
  md.push('---');
  md.push(`session_id: ${sessionId}`);
  md.push(`project: ${cwd}`);
  md.push(`start_time: ${formatTimestamp(startTime)}`);
  md.push(`end_time: ${formatTimestamp(endTime)}`);
  md.push(`message_count: ${messages.length}`);
  md.push(`export_time: ${new Date().toISOString()}`);
  md.push('---');
  md.push('');
  md.push('# Conversation Export');
  md.push('');
  md.push(`**Project:** \`${cwd}\``);
  md.push(`**Session:** \`${sessionId}\``);
  md.push(`**Duration:** ${formatTimestamp(startTime)} → ${formatTimestamp(endTime)}`);
  md.push(`**Messages:** ${messages.length}`);
  md.push('');
  md.push('---');
  md.push('');

  // Add each message
  for (const msg of messages) {
    const roleLabel =
      msg.role === 'user'
        ? '## 👤 User'
        : msg.role === 'assistant'
          ? '## 🤖 Assistant'
          : '## ⚙️ System';

    md.push(roleLabel);
    if (msg.timestamp) {
      md.push(`*${formatTimestamp(msg.timestamp)}*`);
    }
    md.push('');
    md.push(msg.content);
    md.push('');
    md.push('---');
    md.push('');
  }

  return md.join('\n');
}

/**
 * Export a conversation to the history directory
 */
export function exportConversation(
  transcriptPath: string,
  options: ExportOptions = {}
): ExportResult {
  try {
    // Verify transcript exists
    if (!existsSync(transcriptPath)) {
      return { success: false, error: `Transcript not found: ${transcriptPath}` };
    }

    // Parse transcript to get metadata
    const firstLine = readFileSync(transcriptPath, 'utf-8').split('\n')[0];
    let sessionId = 'unknown';
    let cwd = '';

    try {
      const firstEntry = JSON.parse(firstLine);
      sessionId = firstEntry.sessionId || basename(transcriptPath, '.jsonl');
      cwd = firstEntry.cwd || '';
    } catch {
      sessionId = basename(transcriptPath, '.jsonl');
    }

    // Determine output directory
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const baseDir = options.outputDir || process.env.PAI_DIR || '/Users/zuul/Projects/PAI/.claude';
    const outputDir = join(baseDir, 'History', 'conversations', yearMonth);

    // Ensure directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Convert to markdown
    const markdown = transcriptToMarkdown(transcriptPath, options);

    // Count messages
    const messageCount = (markdown.match(/^## 👤 User|^## 🤖 Assistant/gm) || []).length;

    // Generate filename and write
    const filename = generateFilename(sessionId, cwd);
    const outputPath = join(outputDir, filename);

    writeFileSync(outputPath, markdown, 'utf-8');

    return {
      success: true,
      outputPath,
      messageCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * CLI interface for manual invocation
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Read from stdin (hook mode)
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    } catch {
      console.error('Error reading stdin');
      process.exit(1);
    }

    if (!input.trim()) {
      console.error('No input received');
      process.exit(1);
    }

    try {
      const hookInput = JSON.parse(input);
      const transcriptPath = hookInput.transcript_path;

      if (!transcriptPath) {
        console.error('No transcript_path in input');
        process.exit(1);
      }

      const result = exportConversation(transcriptPath, {
        includeThinking: false,
        includeToolCalls: false,
      });

      if (result.success) {
        console.error(`✅ Conversation exported: ${result.outputPath}`);
        console.error(`📝 Messages: ${result.messageCount}`);
      } else {
        console.error(`❌ Export failed: ${result.error}`);
      }
    } catch (e) {
      console.error(`Error parsing input: ${e}`);
      process.exit(1);
    }
  } else {
    // Direct file mode
    const transcriptPath = args[0];
    const includeThinking = args.includes('--thinking');
    const includeToolCalls = args.includes('--tools');

    const result = exportConversation(transcriptPath, {
      includeThinking,
      includeToolCalls,
    });

    if (result.success) {
      console.log(`✅ Conversation exported to: ${result.outputPath}`);
      console.log(`📝 Messages: ${result.messageCount}`);
    } else {
      console.error(`❌ Export failed: ${result.error}`);
      process.exit(1);
    }
  }
}

// Run if executed directly
main().catch(console.error);
