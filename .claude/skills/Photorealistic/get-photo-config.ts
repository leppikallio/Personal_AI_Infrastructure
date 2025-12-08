#!/usr/bin/env bun

/**
 * get-photo-config - Photorealistic Skill Configuration CLI
 *
 * Reads photorealistic configuration from settings.json using PAI_DIR.
 * Outputs as shell-compatible KEY=value lines for eval, or JSON.
 *
 * Usage:
 *   get-photo-config.ts [key]         # Get specific key
 *   get-photo-config.ts all           # Get all as KEY=value (default)
 *   get-photo-config.ts --json        # Get all as JSON
 *
 * Keys: outputDir, preset, model, batchSize, autoOpen, thumbnails
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ============================================================================
// Types
// ============================================================================

interface PhotorealisticConfig {
  outputDir: string;
  defaultPreset: string;
  defaultModel: string;
  defaultBatchSize: number;
  autoOpen: boolean;
  generateThumbnails: boolean;
}

interface SettingsJson {
  photorealistic?: Partial<PhotorealisticConfig>;
}

// ============================================================================
// Configuration
// ============================================================================

// PAI_DIR with fallback to ~/.claude
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

// Default configuration values
const DEFAULTS: PhotorealisticConfig = {
  outputDir: join(PAI_DIR, 'history/photorealistic'),
  defaultPreset: 'photorealistic',
  defaultModel: 'flux-pro',
  defaultBatchSize: 8,
  autoOpen: false,
  generateThumbnails: true,
};

// ============================================================================
// Settings Loading
// ============================================================================

function loadSettings(): SettingsJson {
  const settingsPath = join(PAI_DIR, 'settings.json');

  if (!existsSync(settingsPath)) {
    return {};
  }

  try {
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content) as SettingsJson;
  } catch (error) {
    console.error(`Warning: Failed to parse ${settingsPath}:`, error);
    return {};
  }
}

function getConfig(): PhotorealisticConfig {
  const settings = loadSettings();
  const photo = settings.photorealistic || {};

  // Expand ~ in outputDir if present
  let outputDir = photo.outputDir || DEFAULTS.outputDir;
  if (outputDir.startsWith('~')) {
    outputDir = outputDir.replace('~', homedir());
  }
  // Also expand ${PAI_DIR} if present
  if (outputDir.includes('${PAI_DIR}')) {
    outputDir = outputDir.replace('${PAI_DIR}', PAI_DIR);
  }

  return {
    outputDir,
    defaultPreset: photo.defaultPreset || DEFAULTS.defaultPreset,
    defaultModel: photo.defaultModel || DEFAULTS.defaultModel,
    defaultBatchSize: photo.defaultBatchSize || DEFAULTS.defaultBatchSize,
    autoOpen: photo.autoOpen ?? DEFAULTS.autoOpen,
    generateThumbnails: photo.generateThumbnails ?? DEFAULTS.generateThumbnails,
  };
}

// ============================================================================
// Output Formatting
// ============================================================================

function outputShellVars(config: PhotorealisticConfig): void {
  console.log(`PHOTO_DIR="${config.outputDir}"`);
  console.log(`PHOTO_PRESET="${config.defaultPreset}"`);
  console.log(`PHOTO_MODEL="${config.defaultModel}"`);
  console.log(`PHOTO_BATCH="${config.defaultBatchSize}"`);
  console.log(`PHOTO_OPEN="${config.autoOpen}"`);
  console.log(`PHOTO_THUMBS="${config.generateThumbnails}"`);
  console.log(`PAI_DIR="${PAI_DIR}"`);
}

function outputJson(config: PhotorealisticConfig): void {
  console.log(JSON.stringify({ ...config, paiDir: PAI_DIR }, null, 2));
}

function outputSingleKey(config: PhotorealisticConfig, key: string): void {
  const keyMap: Record<string, string | number | boolean> = {
    outputDir: config.outputDir,
    dir: config.outputDir,
    preset: config.defaultPreset,
    model: config.defaultModel,
    batchSize: config.defaultBatchSize,
    batch: config.defaultBatchSize,
    autoOpen: config.autoOpen,
    open: config.autoOpen,
    thumbnails: config.generateThumbnails,
    thumb: config.generateThumbnails,
    paiDir: PAI_DIR,
  };

  if (key in keyMap) {
    console.log(keyMap[key]);
  } else {
    console.error(`Unknown key: ${key}`);
    console.error(
      'Valid keys: outputDir, preset, model, batchSize, autoOpen, thumbnails, paiDir, all'
    );
    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const config = getConfig();

  if (args.length === 0 || args[0] === 'all') {
    outputShellVars(config);
  } else if (args[0] === '--json') {
    outputJson(config);
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
get-photo-config - Photorealistic Skill Configuration

Usage:
  get-photo-config.ts [key]         Get specific key value
  get-photo-config.ts all           Get all as KEY=value (default)
  get-photo-config.ts --json        Get all as JSON

Keys:
  outputDir, dir      Output directory for images
  preset              Default style preset
  model               Default FLUX model
  batchSize, batch    Number of composition variations
  autoOpen, open      Auto-open images after generation
  thumbnails, thumb   Generate thumbnails
  paiDir              PAI_DIR path

Example (in bash):
  eval $(bun \${PAI_DIR}/skills/Photorealistic/get-photo-config.ts all)
  echo $PHOTO_DIR
`);
  } else {
    outputSingleKey(config, args[0]);
  }
}

main();
