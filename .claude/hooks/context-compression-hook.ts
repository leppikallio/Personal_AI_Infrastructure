#!/usr/bin/env bun
/**
 * PreCompact Hook - Triggered before context compression
 * Extracts context information from transcript and notifies about compression
 * Also exports the full conversation to history before compression loses detail
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

interface NotificationPayload {
  title: string;
  message: string;
  voice_enabled: boolean;
  voice_name?: string;
  rate?: number;
  priority?: 'low' | 'normal' | 'high';
}

interface VoiceConfig {
  voice_name: string;
  rate_wpm: number;
  rate_multiplier: number;
  description: string;
  type: string;
}

interface VoicesConfig {
  default_rate: number;
  voices: Record<string, VoiceConfig>;
}

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  compact_type?: string;
}

interface TranscriptEntry {
  type: string;
  message?: {
    role?: string;
    content?: Array<{
      type: string;
      text: string;
    }>;
  };
  timestamp?: string;
}

/**
 * Send notification to the Marvin notification server
 */
async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_error) {
    // Silently handle notification failures
  }
}

/**
 * Count messages in transcript to provide context
 */
function getTranscriptStats(transcriptPath: string): { messageCount: number; isLarge: boolean } {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    let userMessages = 0;
    let assistantMessages = 0;

    for (const line of lines) {
      if (line.trim()) {
        try {
          const entry = JSON.parse(line) as TranscriptEntry;
          if (entry.type === 'user') {
            userMessages++;
          } else if (entry.type === 'assistant') {
            assistantMessages++;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    const totalMessages = userMessages + assistantMessages;
    const isLarge = totalMessages > 50; // Consider large if more than 50 messages

    return { messageCount: totalMessages, isLarge };
  } catch (_error) {
    return { messageCount: 0, isLarge: false };
  }
}

/**
 * Convert transcript to readable markdown and save to history
 */
function exportConversation(transcriptPath: string): {
  success: boolean;
  outputPath?: string;
  messageCount?: number;
} {
  try {
    if (!existsSync(transcriptPath)) {
      return { success: false };
    }

    const lines = readFileSync(transcriptPath, 'utf-8').trim().split('\n');
    const messages: Array<{ role: string; content: string; timestamp: string }> = [];

    let sessionId = '';
    let cwd = '';
    let startTime = '';
    let endTime = '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);

        // Capture metadata
        if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
        if (!cwd && entry.cwd) cwd = entry.cwd;

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
    md.push('trigger: precompact');
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

    // Determine output path
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paiDir = process.env.PAI_DIR || join(homedir(), 'Projects', 'PAI', '.claude');
    const outputDir = join(paiDir, 'History', 'conversations', yearMonth);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const projectName = cwd
      ? basename(cwd)
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .toLowerCase()
      : 'conversation';
    const shortSession = sessionId.slice(0, 8);
    const filename = `${dateStr}-${timeStr}_${projectName}_${shortSession}_precompact.md`;
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

// Load voice configuration
let marvinVoiceConfig: VoiceConfig;
try {
  const voicesPath = join(
    homedir(),
    'Library/Mobile Documents/com~apple~CloudDocs/Claude/voice-server/voices.json'
  );
  const config: VoicesConfig = JSON.parse(readFileSync(voicesPath, 'utf-8'));
  marvinVoiceConfig = config.voices.marvin;
} catch (_e) {
  // Fallback to hardcoded Marvin voice config
  marvinVoiceConfig = {
    voice_id: 'onwK4e9ZLuTAKqWW03F9',
    rate_wpm: 263,
    rate_multiplier: 1.5,
    description: 'Default DA voice',
    type: 'Free',
  };
}

async function main() {
  let hookInput: HookInput | null = null;

  try {
    // Read the JSON input from stdin
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (input.trim()) {
      hookInput = JSON.parse(input) as HookInput;
    }
  } catch (_error) {
    // Silently handle input errors
  }

  // Determine the type of compression
  const compactType = hookInput?.compact_type || 'auto';
  let message = 'Compressing context to continue';

  // Get transcript statistics if available
  if (hookInput?.transcript_path) {
    const stats = getTranscriptStats(hookInput.transcript_path);
    if (stats.messageCount > 0) {
      if (compactType === 'manual') {
        message = `Manually compressing ${stats.messageCount} messages`;
      } else {
        message = stats.isLarge
          ? `Auto-compressing large context with ${stats.messageCount} messages`
          : `Compressing context with ${stats.messageCount} messages`;
      }
    }

    // Export conversation BEFORE compression loses detail
    const exportResult = exportConversation(hookInput.transcript_path);
    if (exportResult.success) {
      console.error(`📝 Conversation exported: ${exportResult.outputPath}`);
      console.error(`💬 Messages saved: ${exportResult.messageCount}`);
    }
  }

  // Send notification with voice (using Marvin's voice from config)
  await sendNotification({
    title: 'Marvin Context',
    message: message,
    voice_enabled: true,
    voice_name: marvinVoiceConfig.voice_name,
    rate: marvinVoiceConfig.rate_wpm,
    priority: 'low',
  });

  process.exit(0);
}

// Run the hook
main().catch(() => {
  process.exit(0);
});
