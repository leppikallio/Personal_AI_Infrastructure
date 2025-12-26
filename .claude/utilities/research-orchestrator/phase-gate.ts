/**
 * Research Workflow Phase Gate Utility
 *
 * Enforces sequential phase completion with marker-based gates.
 * Prevents premature phase transitions and ensures quality checkpoints.
 *
 * Phase markers:
 * - .wave1-complete: Wave 1 agents finished executing
 * - .wave1-validated: Wave 1 quality analysis passed
 * - .pivot-complete: Pivot decision made (Wave 2 or skip)
 * - .wave2-complete: Wave 2 agents finished (or .wave2-skipped)
 * - .citations-validated: All citations verified
 * - .synthesis-complete: Final synthesis generated
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Phase definitions with dependencies
const PHASE_DEFINITIONS = {
  'wave1-complete': {
    description: 'Wave 1 agents have completed execution',
    requires: [],
    marker: '.wave1-complete',
  },
  'wave1-validated': {
    description: 'Wave 1 quality analysis has passed',
    requires: ['wave1-complete'],
    marker: '.wave1-validated',
  },
  'pivot-complete': {
    description: 'Pivot decision has been made',
    requires: ['wave1-validated'],
    marker: '.pivot-complete',
  },
  'wave2-complete': {
    description: 'Wave 2 agents have completed (or skipped)',
    requires: ['pivot-complete'],
    marker: '.wave2-complete',
    alternativeMarker: '.wave2-skipped',
  },
  'citations-validated': {
    description: 'All citations have been validated',
    requires: ['wave2-complete'],
    marker: '.citations-validated',
  },
  'synthesis-complete': {
    description: 'Final synthesis has been generated',
    requires: ['citations-validated'],
    marker: '.synthesis-complete',
  },
} as const;

type PhaseName = keyof typeof PHASE_DEFINITIONS;

interface PhaseMarkerMetadata {
  phase: string;
  timestamp: string;
  agentCount?: number;
  qualityScore?: number;
  notes?: string;
}

interface GateVerificationResult {
  canProceed: boolean;
  phase: string;
  missing: string[];
  present: string[];
  message: string;
}

interface PhaseStatus {
  sessionDir: string;
  phases: Record<
    string,
    {
      complete: boolean;
      marker: string;
      metadata?: PhaseMarkerMetadata;
      timestamp?: string;
    }
  >;
  currentPhase: string | null;
  nextPhase: string | null;
  allComplete: boolean;
}

/**
 * Check if a specific marker file exists
 */
function markerExists(sessionDir: string, markerName: string): boolean {
  const markerPath = join(sessionDir, 'analysis', markerName);
  return existsSync(markerPath);
}

/**
 * Read marker metadata if it exists
 */
function readMarkerMetadata(sessionDir: string, markerName: string): PhaseMarkerMetadata | null {
  const markerPath = join(sessionDir, 'analysis', markerName);
  if (!existsSync(markerPath)) {
    return null;
  }

  try {
    const content = readFileSync(markerPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Marker exists but has no parseable metadata
    return { phase: markerName, timestamp: 'unknown' };
  }
}

/**
 * Get the timestamp of a marker file
 */
function getMarkerTimestamp(sessionDir: string, markerName: string): string | undefined {
  const markerPath = join(sessionDir, 'analysis', markerName);
  if (!existsSync(markerPath)) {
    return undefined;
  }

  try {
    const stats = statSync(markerPath);
    return stats.mtime.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Verify if a phase gate can be passed
 * Returns whether the required prerequisites are met
 */
export function verifyPhaseGate(sessionDir: string, phaseName: PhaseName): GateVerificationResult {
  const definition = PHASE_DEFINITIONS[phaseName];

  if (!definition) {
    return {
      canProceed: false,
      phase: phaseName,
      missing: [],
      present: [],
      message: `Unknown phase: ${phaseName}`,
    };
  }

  // Check all required phases
  const missing: string[] = [];
  const present: string[] = [];

  for (const requiredPhase of definition.requires) {
    const reqDef = PHASE_DEFINITIONS[requiredPhase as PhaseName];
    const hasMarker = markerExists(sessionDir, reqDef.marker);
    const hasAltMarker = reqDef.alternativeMarker
      ? markerExists(sessionDir, reqDef.alternativeMarker)
      : false;

    if (hasMarker || hasAltMarker) {
      present.push(requiredPhase);
    } else {
      missing.push(requiredPhase);
    }
  }

  const canProceed = missing.length === 0;

  return {
    canProceed,
    phase: phaseName,
    missing,
    present,
    message: canProceed
      ? `Gate passed: Ready for ${phaseName}`
      : `Gate BLOCKED: Missing prerequisites: ${missing.join(', ')}`,
  };
}

/**
 * Mark a phase as complete by creating its marker file
 */
export function markPhaseComplete(
  sessionDir: string,
  phaseName: PhaseName,
  metadata?: Partial<PhaseMarkerMetadata>
): { success: boolean; message: string; markerPath: string } {
  const definition = PHASE_DEFINITIONS[phaseName];

  if (!definition) {
    return {
      success: false,
      message: `Unknown phase: ${phaseName}`,
      markerPath: '',
    };
  }

  // First verify the gate
  const gateCheck = verifyPhaseGate(sessionDir, phaseName);
  if (!gateCheck.canProceed) {
    return {
      success: false,
      message: `Cannot mark ${phaseName} complete: ${gateCheck.message}`,
      markerPath: '',
    };
  }

  const markerPath = join(sessionDir, 'analysis', definition.marker);

  const fullMetadata: PhaseMarkerMetadata = {
    phase: phaseName,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  try {
    writeFileSync(markerPath, JSON.stringify(fullMetadata, null, 2));
    return {
      success: true,
      message: `Phase ${phaseName} marked complete`,
      markerPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create marker: ${error}`,
      markerPath,
    };
  }
}

/**
 * Mark Wave 2 as skipped (alternative to wave2-complete)
 */
export function markWave2Skipped(
  sessionDir: string,
  reason: string
): { success: boolean; message: string; markerPath: string } {
  // Verify pivot-complete exists
  const gateCheck = verifyPhaseGate(sessionDir, 'wave2-complete');
  if (gateCheck.missing.length > 0 && !gateCheck.missing.includes('wave2-complete')) {
    return {
      success: false,
      message: `Cannot skip Wave 2: Missing prerequisites: ${gateCheck.missing.join(', ')}`,
      markerPath: '',
    };
  }

  const markerPath = join(sessionDir, 'analysis', '.wave2-skipped');

  const metadata = {
    phase: 'wave2-skipped',
    timestamp: new Date().toISOString(),
    reason,
  };

  try {
    writeFileSync(markerPath, JSON.stringify(metadata, null, 2));
    return {
      success: true,
      message: `Wave 2 marked as skipped: ${reason}`,
      markerPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create skip marker: ${error}`,
      markerPath,
    };
  }
}

/**
 * Get the full status of all phases in a research session
 */
export function getPhaseStatus(sessionDir: string): PhaseStatus {
  const phases: PhaseStatus['phases'] = {};
  let currentPhase: string | null = null;
  let nextPhase: string | null = null;
  let allComplete = true;

  const phaseOrder: PhaseName[] = [
    'wave1-complete',
    'wave1-validated',
    'pivot-complete',
    'wave2-complete',
    'citations-validated',
    'synthesis-complete',
  ];

  for (const phaseName of phaseOrder) {
    const definition = PHASE_DEFINITIONS[phaseName];
    const hasMarker = markerExists(sessionDir, definition.marker);
    const hasAltMarker = definition.alternativeMarker
      ? markerExists(sessionDir, definition.alternativeMarker)
      : false;

    const isComplete = hasMarker || hasAltMarker;
    const activeMarker = hasMarker
      ? definition.marker
      : hasAltMarker && definition.alternativeMarker
        ? definition.alternativeMarker
        : definition.marker;

    phases[phaseName] = {
      complete: isComplete,
      marker: activeMarker,
      metadata: isComplete ? readMarkerMetadata(sessionDir, activeMarker) || undefined : undefined,
      timestamp: isComplete ? getMarkerTimestamp(sessionDir, activeMarker) : undefined,
    };

    if (!isComplete) {
      allComplete = false;
      if (nextPhase === null) {
        nextPhase = phaseName;
      }
    } else {
      currentPhase = phaseName;
    }
  }

  return {
    sessionDir,
    phases,
    currentPhase,
    nextPhase,
    allComplete,
  };
}

/**
 * Count perspective files in wave directories
 */
export function countPerspectiveFiles(sessionDir: string): {
  wave1: number;
  wave2: number;
  total: number;
} {
  let wave1 = 0;
  let wave2 = 0;

  const wave1Dir = join(sessionDir, 'wave-1');
  const wave2Dir = join(sessionDir, 'wave-2');

  try {
    if (existsSync(wave1Dir)) {
      wave1 = readdirSync(wave1Dir).filter((f) => f.endsWith('.md')).length;
    }
  } catch {
    /* ignore */
  }

  try {
    if (existsSync(wave2Dir)) {
      wave2 = readdirSync(wave2Dir).filter((f) => f.endsWith('.md')).length;
    }
  } catch {
    /* ignore */
  }

  return { wave1, wave2, total: wave1 + wave2 };
}

/**
 * Format status for console output
 */
export function formatStatusReport(status: PhaseStatus): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════',
    '  Research Session Phase Status',
    '═══════════════════════════════════════════════════════════',
    `  Session: ${status.sessionDir}`,
    '───────────────────────────────────────────────────────────',
  ];

  const phaseOrder: PhaseName[] = [
    'wave1-complete',
    'wave1-validated',
    'pivot-complete',
    'wave2-complete',
    'citations-validated',
    'synthesis-complete',
  ];

  for (const phaseName of phaseOrder) {
    const phase = status.phases[phaseName];
    const icon = phase.complete ? '✅' : '⬜';
    const marker = phase.marker;
    const timestamp = phase.timestamp ? ` (${phase.timestamp.split('T')[0]})` : '';

    lines.push(`  ${icon} ${phaseName.padEnd(20)} ${marker}${timestamp}`);
  }

  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`  Current: ${status.currentPhase || 'None'}`);
  lines.push(`  Next:    ${status.nextPhase || 'All complete!'}`);
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}
