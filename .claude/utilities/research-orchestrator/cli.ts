#!/usr/bin/env bun
/**
 * Research Workflow Phase Gate CLI
 *
 * Usage:
 *   bun cli.ts verify $SESSION_DIR <phase-name>  # Check if gate can be passed
 *   bun cli.ts mark $SESSION_DIR <phase-name>    # Mark phase as complete
 *   bun cli.ts skip-wave2 $SESSION_DIR <reason>  # Mark Wave 2 as skipped
 *   bun cli.ts status $SESSION_DIR               # Show all phase states
 *   bun cli.ts count $SESSION_DIR                # Count perspective files
 *
 * Exit codes:
 *   0 = Success / Gate can be passed
 *   1 = Failure / Gate blocked / Error
 */

import {
  countPerspectiveFiles,
  formatStatusReport,
  getPhaseStatus,
  markPhaseComplete,
  markWave2Skipped,
  verifyPhaseGate,
} from './phase-gate';

type ValidPhase =
  | 'wave1-complete'
  | 'wave1-validated'
  | 'pivot-complete'
  | 'wave2-complete'
  | 'citations-validated'
  | 'synthesis-complete';

const VALID_PHASES: ValidPhase[] = [
  'wave1-complete',
  'wave1-validated',
  'pivot-complete',
  'wave2-complete',
  'citations-validated',
  'synthesis-complete',
];

function printUsage(): void {
  console.log(`
Research Workflow Phase Gate CLI

Usage:
  bun cli.ts verify <session-dir> <phase-name>   Check if gate can be passed
  bun cli.ts mark <session-dir> <phase-name>     Mark phase as complete
  bun cli.ts skip-wave2 <session-dir> <reason>   Mark Wave 2 as skipped
  bun cli.ts status <session-dir>                Show all phase states
  bun cli.ts count <session-dir>                 Count perspective files

Valid phases:
  ${VALID_PHASES.join('\n  ')}

Exit codes:
  0 = Success / Gate can be passed
  1 = Failure / Gate blocked / Error

Examples:
  bun cli.ts verify /path/to/session wave1-validated
  bun cli.ts mark /path/to/session wave1-complete
  bun cli.ts status /path/to/session
`);
}

function isValidPhase(phase: string): phase is ValidPhase {
  return VALID_PHASES.includes(phase as ValidPhase);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 1 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(args.length < 1 ? 1 : 0);
  }

  const command = args[0];
  const sessionDir = args[1];

  if (!sessionDir && command !== '--help') {
    console.error('❌ Error: Session directory is required');
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case 'verify': {
      const phaseName = args[2];
      if (!phaseName) {
        console.error('❌ Error: Phase name is required for verify command');
        process.exit(1);
      }
      if (!isValidPhase(phaseName)) {
        console.error(`❌ Error: Invalid phase name: ${phaseName}`);
        console.error(`Valid phases: ${VALID_PHASES.join(', ')}`);
        process.exit(1);
      }

      const result = verifyPhaseGate(sessionDir, phaseName);

      if (result.canProceed) {
        console.log(`✅ ${result.message}`);
        if (result.present.length > 0) {
          console.log(`   Prerequisites met: ${result.present.join(', ')}`);
        }
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        if (result.present.length > 0) {
          console.error(`   Present: ${result.present.join(', ')}`);
        }
        process.exit(1);
      }
      break;
    }

    case 'mark': {
      const phaseName = args[2];
      if (!phaseName) {
        console.error('❌ Error: Phase name is required for mark command');
        process.exit(1);
      }
      if (!isValidPhase(phaseName)) {
        console.error(`❌ Error: Invalid phase name: ${phaseName}`);
        console.error(`Valid phases: ${VALID_PHASES.join(', ')}`);
        process.exit(1);
      }

      // Optional: Additional metadata from args[3] as JSON
      let metadata: Record<string, unknown> = {};
      if (args[3]) {
        try {
          metadata = JSON.parse(args[3]);
        } catch {
          console.error('⚠️  Warning: Could not parse metadata JSON, using empty metadata');
        }
      }

      const result = markPhaseComplete(sessionDir, phaseName, metadata);

      if (result.success) {
        console.log(`✅ ${result.message}`);
        console.log(`   Marker: ${result.markerPath}`);
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case 'skip-wave2': {
      const reason = args[2] || 'No Wave 2 required';

      const result = markWave2Skipped(sessionDir, reason);

      if (result.success) {
        console.log(`✅ ${result.message}`);
        console.log(`   Marker: ${result.markerPath}`);
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case 'status': {
      const status = getPhaseStatus(sessionDir);
      console.log(formatStatusReport(status));

      // Also output JSON for programmatic use if --json flag
      if (args.includes('--json')) {
        console.log('\nJSON:');
        console.log(JSON.stringify(status, null, 2));
      }

      process.exit(status.allComplete ? 0 : 1);
      break;
    }

    case 'count': {
      const counts = countPerspectiveFiles(sessionDir);
      console.log('📊 Perspective File Count');
      console.log(`   Wave 1: ${counts.wave1} files`);
      console.log(`   Wave 2: ${counts.wave2} files`);
      console.log(`   Total:  ${counts.total} files`);

      if (args.includes('--json')) {
        console.log(JSON.stringify(counts));
      }

      process.exit(0);
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
