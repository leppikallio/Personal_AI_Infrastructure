#!/usr/bin/env bun

/**
 * get-art-config - Art Skill Configuration CLI
 *
 * Reads art configuration from settings.json using PAI_DIR.
 * Outputs as shell-compatible KEY=value lines for eval, or JSON.
 *
 * Usage:
 *   get-art-config.ts [key]              # Get specific key
 *   get-art-config.ts all                # Get all as KEY=value (default)
 *   get-art-config.ts --json             # Get all as JSON
 *   get-art-config.ts style-illustrations # Get illustration style config (JSON)
 *   get-art-config.ts style-diagrams     # Get diagram style config (JSON)
 *
 * Keys: outputDir, preset, model, batchSize, autoOpen, thumbnails, size, aspect
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ============================================================================
// Types
// ============================================================================

interface StyleConfig {
  name: string;
  background: string;
  linework: string;
  accentPrimary: string;
  accentSecondary: string;
  signature?: string;
  gridColor?: string;
  characteristics: string[];
  promptKeywords: string[];
}

interface ArtStyleConfig {
  illustrations: StyleConfig;
  diagrams: StyleConfig;
}

interface ArtConfig {
  outputDir: string;
  defaultPreset: string;
  defaultModel: string;
  defaultBatchSize: number;
  autoOpen: boolean;
  generateThumbnails: boolean;
  defaultSize: string;
  aspectRatio: string;
  styleConfig?: ArtStyleConfig;
}

interface SettingsJson {
  art?: Partial<ArtConfig> & { styleConfig?: Partial<ArtStyleConfig> };
}

// ============================================================================
// Configuration
// ============================================================================

// PAI_DIR with fallback to ~/.claude
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

// Default style configurations
const DEFAULT_STYLES: ArtStyleConfig = {
  illustrations: {
    name: 'New Yorker / Saul Steinberg',
    background: '#FFFFFF',
    linework: '#000000',
    accentPrimary: '#4A148C',
    accentSecondary: '#00796B',
    signature: '#2D2D2D',
    characteristics: [
      'flat colors only - NO gradients',
      'hand-drawn black ink linework',
      'imperfect gestural strokes',
      'variable line weight',
      'risograph aesthetic',
      'muted earth tones',
      '2-3 elements maximum',
      '40-60% negative space',
    ],
    promptKeywords: [
      'Saul Steinberg',
      'New Yorker style',
      'editorial conceptual illustration',
      'hand-drawn black ink',
      'flat colors',
      'risograph aesthetic',
    ],
  },
  diagrams: {
    name: 'Excalidraw + Tron',
    background: '#1A202C',
    linework: '#FFFFFF',
    accentPrimary: '#FF6B35',
    accentSecondary: '#00D9FF',
    gridColor: '#2D3748',
    characteristics: [
      'hand-drawn sketch style',
      'rough wobbly Excalidraw lines',
      'dark background for contrast',
      'subtle neon glows on focal points',
      'variable line weight',
      'multiple overlapping strokes',
      '2-4 elements maximum',
      '40-50% negative space',
    ],
    promptKeywords: [
      'Excalidraw whiteboard aesthetic',
      'hand-drawn sketch style',
      'Tron-inspired neon highlights',
      'rough wobbly lines',
      'dark slate background',
      'digital circuit aesthetic',
    ],
  },
};

// Default configuration values
const DEFAULTS: ArtConfig = {
  outputDir: join(PAI_DIR, 'history/art'),
  defaultPreset: 'artistic',
  defaultModel: 'nano-banana-pro',
  defaultBatchSize: 4,
  autoOpen: false,
  generateThumbnails: true,
  defaultSize: '2K',
  aspectRatio: '1:1',
  styleConfig: DEFAULT_STYLES,
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

function getConfig(): ArtConfig {
  const settings = loadSettings();
  const art = settings.art || {};

  // Expand ~ in outputDir if present
  let outputDir = art.outputDir || DEFAULTS.outputDir;
  if (outputDir.startsWith('~')) {
    outputDir = outputDir.replace('~', homedir());
  }
  // Also expand ${PAI_DIR} if present
  if (outputDir.includes('${PAI_DIR}')) {
    outputDir = outputDir.replace('${PAI_DIR}', PAI_DIR);
  }

  // Merge style configs with defaults
  const styleConfig: ArtStyleConfig = {
    illustrations: {
      ...DEFAULT_STYLES.illustrations,
      ...(art.styleConfig?.illustrations || {}),
    },
    diagrams: {
      ...DEFAULT_STYLES.diagrams,
      ...(art.styleConfig?.diagrams || {}),
    },
  };

  return {
    outputDir,
    defaultPreset: art.defaultPreset || DEFAULTS.defaultPreset,
    defaultModel: art.defaultModel || DEFAULTS.defaultModel,
    defaultBatchSize: art.defaultBatchSize || DEFAULTS.defaultBatchSize,
    autoOpen: art.autoOpen ?? DEFAULTS.autoOpen,
    generateThumbnails: art.generateThumbnails ?? DEFAULTS.generateThumbnails,
    defaultSize: art.defaultSize || DEFAULTS.defaultSize,
    aspectRatio: art.aspectRatio || DEFAULTS.aspectRatio,
    styleConfig,
  };
}

// ============================================================================
// Output Formatting
// ============================================================================

function outputShellVars(config: ArtConfig): void {
  console.log(`ART_DIR="${config.outputDir}"`);
  console.log(`ART_PRESET="${config.defaultPreset}"`);
  console.log(`ART_MODEL="${config.defaultModel}"`);
  console.log(`ART_BATCH="${config.defaultBatchSize}"`);
  console.log(`ART_OPEN="${config.autoOpen}"`);
  console.log(`ART_THUMBS="${config.generateThumbnails}"`);
  console.log(`ART_SIZE="${config.defaultSize}"`);
  console.log(`ART_ASPECT="${config.aspectRatio}"`);
  console.log(`PAI_DIR="${PAI_DIR}"`);
  // Style shortcuts for shell use
  if (config.styleConfig) {
    console.log(`ART_ILLUST_BG="${config.styleConfig.illustrations.background}"`);
    console.log(`ART_ILLUST_LINE="${config.styleConfig.illustrations.linework}"`);
    console.log(`ART_ILLUST_ACCENT1="${config.styleConfig.illustrations.accentPrimary}"`);
    console.log(`ART_ILLUST_ACCENT2="${config.styleConfig.illustrations.accentSecondary}"`);
    console.log(`ART_DIAG_BG="${config.styleConfig.diagrams.background}"`);
    console.log(`ART_DIAG_LINE="${config.styleConfig.diagrams.linework}"`);
    console.log(`ART_DIAG_ACCENT1="${config.styleConfig.diagrams.accentPrimary}"`);
    console.log(`ART_DIAG_ACCENT2="${config.styleConfig.diagrams.accentSecondary}"`);
  }
}

function outputJson(config: ArtConfig): void {
  console.log(JSON.stringify({ ...config, paiDir: PAI_DIR }, null, 2));
}

function outputStyleJson(style: StyleConfig): void {
  console.log(JSON.stringify(style, null, 2));
}

function outputSingleKey(config: ArtConfig, key: string): void {
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
    size: config.defaultSize,
    aspect: config.aspectRatio,
    aspectRatio: config.aspectRatio,
    paiDir: PAI_DIR,
    // Style-specific values
    'illust-bg': config.styleConfig?.illustrations.background || '',
    'illust-line': config.styleConfig?.illustrations.linework || '',
    'illust-accent1': config.styleConfig?.illustrations.accentPrimary || '',
    'illust-accent2': config.styleConfig?.illustrations.accentSecondary || '',
    'diag-bg': config.styleConfig?.diagrams.background || '',
    'diag-line': config.styleConfig?.diagrams.linework || '',
    'diag-accent1': config.styleConfig?.diagrams.accentPrimary || '',
    'diag-accent2': config.styleConfig?.diagrams.accentSecondary || '',
  };

  if (key in keyMap) {
    console.log(keyMap[key]);
  } else {
    console.error(`Unknown key: ${key}`);
    console.error(
      'Valid keys: outputDir, preset, model, batchSize, autoOpen, thumbnails, size, aspect, paiDir'
    );
    console.error(
      'Style keys: illust-bg, illust-line, illust-accent1, illust-accent2, diag-bg, diag-line, diag-accent1, diag-accent2'
    );
    console.error('Style JSON: style-illustrations, style-diagrams');
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
  } else if (args[0] === 'style-illustrations') {
    if (config.styleConfig) {
      outputStyleJson(config.styleConfig.illustrations);
    }
  } else if (args[0] === 'style-diagrams') {
    if (config.styleConfig) {
      outputStyleJson(config.styleConfig.diagrams);
    }
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
get-art-config - Art Skill Configuration

Usage:
  get-art-config.ts [key]              Get specific key value
  get-art-config.ts all                Get all as KEY=value (default)
  get-art-config.ts --json             Get all config as JSON
  get-art-config.ts style-illustrations Get illustration style config (JSON)
  get-art-config.ts style-diagrams     Get diagram style config (JSON)

General Keys:
  outputDir, dir      Output directory for images
  preset              Default style preset
  model               Default image model
  batchSize, batch    Number of composition variations
  autoOpen, open      Auto-open images after generation
  thumbnails, thumb   Generate thumbnails
  size                Default resolution (1K, 2K, 4K)
  aspect, aspectRatio Default aspect ratio
  paiDir              PAI_DIR path

Style Keys (individual values):
  illust-bg           Illustration background color
  illust-line         Illustration linework color
  illust-accent1      Illustration primary accent
  illust-accent2      Illustration secondary accent
  diag-bg             Diagram background color
  diag-line           Diagram linework color
  diag-accent1        Diagram primary accent (neon orange)
  diag-accent2        Diagram secondary accent (cyan)

Example (in bash):
  eval $(bun \${PAI_DIR}/skills/Art/get-art-config.ts all)
  echo $ART_DIR
  echo $ART_ILLUST_BG  # #FFFFFF
  echo $ART_DIAG_BG    # #1A202C

Example (get full style as JSON):
  bun \${PAI_DIR}/skills/Art/get-art-config.ts style-illustrations
  # Returns full style config including characteristics and promptKeywords
`);
  } else {
    outputSingleKey(config, args[0]);
  }
}

main();
