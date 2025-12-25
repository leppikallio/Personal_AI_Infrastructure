#!/usr/bin/env bun

/**
 * SessionEnd Hook - Captures session summary for UOCS
 *
 * Generates a session summary document when a Claude Code session ends,
 * documenting what was accomplished during the session.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { HISTORY_DIR } from './lib/pai-paths';

interface SessionData {
  conversation_id: string;
  session_id: string;
  transcript_path: string;
  cwd: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Export full conversation to markdown
 */
function exportConversation(
  transcriptPath: string,
  sessionId: string,
  cwd: string,
  yearMonth: string
): { success: boolean; outputPath?: string; messageCount?: number } {
  try {
    const lines = readFileSync(transcriptPath, 'utf-8').trim().split('\n');
    const messages: Array<{ role: string; content: string; timestamp: string }> = [];

    let startTime = '';
    let endTime = '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);

        // Track time range
        if (entry.timestamp) {
          if (!startTime) startTime = entry.timestamp;
          endTime = entry.timestamp;
        }

        // Process user messages
        if (entry.type === 'user' && entry.message?.content) {
          const content = extractContent(entry.message.content);
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
          const content = extractContent(entry.message.content);
          if (content.trim()) {
            messages.push({
              role: 'assistant',
              content: content.trim(),
              timestamp: entry.timestamp || '',
            });
          }
        }
      } catch {}
    }

    if (messages.length === 0) {
      return { success: false };
    }

    // Build markdown
    const md: string[] = [];
    md.push('---');
    md.push(`session_id: ${sessionId}`);
    md.push(`project: ${cwd}`);
    md.push(`start_time: ${formatTime(startTime)}`);
    md.push(`end_time: ${formatTime(endTime)}`);
    md.push(`message_count: ${messages.length}`);
    md.push(`export_time: ${new Date().toISOString()}`);
    md.push('trigger: session_end');
    md.push('---');
    md.push('');
    md.push('# Conversation Export');
    md.push('');
    md.push(`**Project:** \`${cwd}\``);
    md.push(`**Session:** \`${sessionId}\``);
    md.push(`**Duration:** ${formatTime(startTime)} → ${formatTime(endTime)}`);
    md.push(`**Messages:** ${messages.length}`);
    md.push('');
    md.push('---');
    md.push('');

    for (const msg of messages) {
      const roleLabel = msg.role === 'user' ? '## User' : '## Assistant';
      md.push(roleLabel);
      if (msg.timestamp) {
        md.push(`*${formatTime(msg.timestamp)}*`);
      }
      md.push('');
      md.push(msg.content);
      md.push('');
      md.push('---');
      md.push('');
    }

    // Output directory
    const outputDir = join(HISTORY_DIR, 'conversations', yearMonth);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const projectName = cwd
      ? basename(cwd)
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .toLowerCase()
      : 'conversation';
    const shortSession = sessionId.slice(0, 8);
    const filename = `${dateStr}-${timeStr}_${projectName}_${shortSession}_session-end.md`;
    const outputPath = join(outputDir, filename);

    writeFileSync(outputPath, md.join('\n'), 'utf-8');

    return { success: true, outputPath, messageCount: messages.length };
  } catch (_error) {
    return { success: false };
  }
}

/**
 * Extract text content from message content
 */
function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block?.type === 'text' && block.text) return block.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString('en-US', {
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

async function main() {
  try {
    // Read input from stdin
    const input = await Bun.stdin.text();
    if (!input || input.trim() === '') {
      process.exit(0);
    }

    const data: SessionData = JSON.parse(input);

    // Generate timestamp for filename
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '').replace(/\..+/, '').replace('T', '-'); // YYYY-MM-DD-HHMMSS

    const yearMonth = timestamp.substring(0, 7); // YYYY-MM

    // Try to extract session info from raw outputs
    const sessionInfo = await analyzeSession(data.conversation_id, yearMonth);

    // Generate filename
    const filename = `${timestamp}_SESSION_${sessionInfo.focus}.md`;

    // Ensure directory exists
    const sessionDir = join(HISTORY_DIR, 'sessions', yearMonth);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    // Generate session document
    const sessionDoc = formatSessionDocument(timestamp, data, sessionInfo);

    // Write session file
    writeFileSync(join(sessionDir, filename), sessionDoc);

    // Export full conversation if transcript path is available
    if (data.transcript_path && existsSync(data.transcript_path)) {
      const exportResult = exportConversation(
        data.transcript_path,
        data.session_id,
        data.cwd,
        yearMonth
      );
      if (exportResult.success) {
        console.error(`📝 Conversation exported: ${exportResult.outputPath}`);
        console.error(`💬 Messages saved: ${exportResult.messageCount}`);
      }
    }

    // Exit successfully
    process.exit(0);
  } catch (error) {
    // Silent failure - don't disrupt workflow
    console.error(`[UOCS] SessionEnd hook error: ${error}`);
    process.exit(0);
  }
}

async function analyzeSession(conversationId: string, yearMonth: string): Promise<any> {
  // Try to read raw outputs for this session
  const rawOutputsDir = join(HISTORY_DIR, 'raw-outputs', yearMonth);

  const filesChanged: string[] = [];
  const commandsExecuted: string[] = [];
  const toolsUsed: Set<string> = new Set();

  try {
    if (existsSync(rawOutputsDir)) {
      const files = readdirSync(rawOutputsDir).filter((f) => f.endsWith('.jsonl'));

      for (const file of files) {
        const filePath = join(rawOutputsDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.session === conversationId) {
              toolsUsed.add(entry.tool);

              // Extract file changes
              if (entry.tool === 'Edit' || entry.tool === 'Write') {
                if (entry.input?.file_path) {
                  filesChanged.push(entry.input.file_path);
                }
              }

              // Extract bash commands
              if (entry.tool === 'Bash' && entry.input?.command) {
                commandsExecuted.push(entry.input.command);
              }
            }
          } catch (_e) {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } catch (_error) {
    // Silent failure
  }

  return {
    focus: 'general-work',
    filesChanged: [...new Set(filesChanged)].slice(0, 10), // Unique, max 10
    commandsExecuted: commandsExecuted.slice(0, 10), // Max 10
    toolsUsed: Array.from(toolsUsed),
    duration: 0, // Unknown
  };
}

function formatSessionDocument(timestamp: string, data: SessionData, info: any): string {
  const date = timestamp.substring(0, 10); // YYYY-MM-DD
  const time = timestamp.substring(11).replace(/-/g, ':'); // HH:MM:SS

  return `---
capture_type: SESSION
timestamp: ${new Date().toISOString()}
session_id: ${data.conversation_id}
duration_minutes: ${info.duration}
executor: kai
---

# Session: ${info.focus}

**Date:** ${date}
**Time:** ${time}
**Session ID:** ${data.conversation_id}

---

## Session Overview

**Focus:** General development work
**Duration:** ${info.duration > 0 ? `${info.duration} minutes` : 'Unknown'}

---

## Tools Used

${info.toolsUsed.length > 0 ? info.toolsUsed.map((t: string) => `- ${t}`).join('\n') : '- None recorded'}

---

## Files Modified

${info.filesChanged.length > 0 ? info.filesChanged.map((f: string) => `- \`${f}\``).join('\n') : '- None recorded'}

**Total Files Changed:** ${info.filesChanged.length}

---

## Commands Executed

${info.commandsExecuted.length > 0 ? `\`\`\`bash\n${info.commandsExecuted.join('\n')}\n\`\`\`` : 'None recorded'}

---

## Notes

This session summary was automatically generated by the UOCS SessionEnd hook.

For detailed tool outputs, see: \`\${PAI_DIR}/history/raw-outputs/${timestamp.substring(0, 7)}/\`

---

**Session Outcome:** Completed
**Generated:** ${new Date().toISOString()}
`;
}

main();
