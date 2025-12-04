/**
 * Configurators - apply configuration changes
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import Mustache from 'mustache';
import { type Transaction, writeAtomic } from '../core/transaction';
import { plistTemplate } from '../templates/plist';
import { profileTemplate } from '../templates/profile';
import { SHELL_MARKER_END, SHELL_MARKER_START, shellTemplate } from '../templates/shell';

export interface SetupConfig {
  paiDir: string;
  userName: string;
  userEmail: string;
  assistantName: string;
  assistantColor: string;
  voicePort: number;
  voiceEnabled: boolean;
  updateShellProfile: boolean;
}

/**
 * Detect bun binary path
 */
function getBunPath(): string {
  // Check common locations
  const locations = [
    join(homedir(), '.bun/bin/bun'), // bun's default install
    '/opt/homebrew/bin/bun', // Apple Silicon homebrew
    '/usr/local/bin/bun', // Intel homebrew / manual
  ];

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc;
    }
  }

  // Fallback - assume it's in PATH
  return 'bun';
}

/**
 * Create PAI directory structure
 */
export async function createDirectories(config: SetupConfig): Promise<void> {
  const dirs = [
    config.paiDir,
    join(config.paiDir, 'config'),
    join(config.paiDir, 'skills'),
    join(config.paiDir, 'tools'),
    join(config.paiDir, 'history'),
    join(config.paiDir, 'voice-server', 'logs'),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Write user profile configuration
 */
export async function writeProfile(config: SetupConfig, transaction: Transaction): Promise<void> {
  const profilePath = join(config.paiDir, 'config', 'profile.json');

  await transaction.backup(profilePath);

  const data = {
    ...config,
    createdAt: new Date().toISOString(),
  };

  const content = Mustache.render(profileTemplate, data);
  await writeAtomic(profilePath, content);
}

/**
 * Write voice server plist (macOS only)
 */
export async function writePlist(config: SetupConfig, transaction: Transaction): Promise<void> {
  if (process.platform !== 'darwin') {
    return; // Skip on non-macOS
  }

  const launchAgentsDir = join(homedir(), 'Library', 'LaunchAgents');
  if (!existsSync(launchAgentsDir)) {
    mkdirSync(launchAgentsDir, { recursive: true });
  }

  const plistPath = join(launchAgentsDir, 'com.pai.voiceserver.plist');

  await transaction.backup(plistPath);

  const data = {
    ...config,
    homeDir: homedir(),
    bunPath: getBunPath(),
  };

  const content = Mustache.render(plistTemplate, data);
  await writeAtomic(plistPath, content);
}

/**
 * Update shell profile (.zshrc or .bashrc)
 */
export async function updateShellProfile(
  config: SetupConfig,
  transaction: Transaction
): Promise<string | null> {
  if (!config.updateShellProfile) {
    return null;
  }

  const shell = process.env.SHELL || '';
  const isZsh = shell.includes('zsh');
  const profilePath = join(homedir(), isZsh ? '.zshrc' : '.bashrc');

  await transaction.backup(profilePath);

  // Read existing content
  let content = '';
  if (existsSync(profilePath)) {
    content = readFileSync(profilePath, 'utf-8');
  }

  // Check if PAI config already exists
  if (content.includes(SHELL_MARKER_START)) {
    // Remove existing PAI config block
    const startIdx = content.indexOf(SHELL_MARKER_START);
    const endIdx = content.indexOf(SHELL_MARKER_END);
    if (startIdx !== -1 && endIdx !== -1) {
      content = content.slice(0, startIdx) + content.slice(endIdx + SHELL_MARKER_END.length);
    }
  }

  // Add new PAI config
  const data = {
    ...config,
    createdAt: new Date().toISOString().split('T')[0],
  };
  const shellConfig = Mustache.render(shellTemplate, data);
  content = `${content.trimEnd()}\n${shellConfig}`;

  await writeAtomic(profilePath, content);

  return profilePath;
}
