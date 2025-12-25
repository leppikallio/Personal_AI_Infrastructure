#!/usr/bin/env bun
/**
 * Quality Analyzer CLI
 *
 * Command-line interface for research quality analysis.
 *
 * Commands:
 * - analyze <session-dir> [--wave N] - Run full quality analysis
 * - score <session-dir> --wave N - Score agents in a wave
 * - signals <session-dir> --wave N - Detect domain signals
 * - gaps <session-dir> --wave N - Analyze coverage gaps
 * - pivot <session-dir> --wave N - Make pivot decision
 * - help - Show this help
 */

import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { scoreWave } from './agent-quality-scorer.ts';
import { analyzeWaveGaps } from './coverage-gap-analyzer.ts';
import { detectWaveSignals } from './domain-signal-detector.ts';
import { makePivotDecision } from './pivot-decision-engine.ts';
import { validatePlatformCoverage } from './platform-coverage-validator.ts';
import type { QualityAnalysisOutput } from './types.ts';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CLIArgs {
  command: string;
  sessionDir?: string;
  wave?: 1 | 2;
  output?: 'json' | 'markdown' | 'both';
  verbose?: boolean;
  agentFile?: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    return { command: 'help' };
  }

  const command = args[0];
  const sessionDir = args[1];

  let wave: 1 | 2 = 1;
  let output: 'json' | 'markdown' | 'both' = 'both';
  let verbose = false;
  let agentFile: string | undefined;

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--wave' && args[i + 1]) {
      wave = Number.parseInt(args[i + 1]) as 1 | 2;
      i++;
    } else if (arg === '--output' && args[i + 1]) {
      output = args[i + 1] as 'json' | 'markdown' | 'both';
      i++;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--file' && args[i + 1]) {
      agentFile = args[i + 1];
      i++;
    }
  }

  return {
    command,
    sessionDir,
    wave,
    output,
    verbose,
    agentFile,
  };
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

/**
 * Format quality analysis as markdown
 */
function formatMarkdown(analysis: QualityAnalysisOutput): string {
  const lines: string[] = [];

  lines.push('# Quality Analysis Report');
  lines.push('');
  lines.push(`**Session:** ${analysis.metadata.sessionDir}`);
  lines.push(`**Wave:** ${analysis.metadata.wave}`);
  lines.push(`**Analyzed:** ${analysis.metadata.analyzedAt}`);
  lines.push(`**Agents:** ${analysis.metadata.agentCount}`);
  lines.push('');

  // Agent Quality
  lines.push('## Agent Quality');
  lines.push('');
  lines.push(`- **Average Score:** ${analysis.agentQuality.averageScore}/100`);
  lines.push(`- **Range:** ${analysis.agentQuality.minScore}-${analysis.agentQuality.maxScore}`);
  lines.push('- **Bands:**');
  lines.push(`  - EXCELLENT (80-100): ${analysis.agentQuality.bandDistribution.EXCELLENT}`);
  lines.push(`  - GOOD (60-79): ${analysis.agentQuality.bandDistribution.GOOD}`);
  lines.push(`  - MODERATE (40-59): ${analysis.agentQuality.bandDistribution.MODERATE}`);
  lines.push(`  - POOR (0-39): ${analysis.agentQuality.bandDistribution.POOR}`);
  lines.push('');

  if (analysis.agentQuality.failedAgents.length > 0) {
    lines.push(`**⚠️ Failed Agents (<40):** ${analysis.agentQuality.failedAgents.join(', ')}`);
    lines.push('');
  }

  // Domain Signals
  lines.push('## Domain Signals');
  lines.push('');
  if (analysis.domainSignals.signals.length > 0) {
    lines.push('| Domain | Strength | Keywords | Agents | Avg Quality |');
    lines.push('|--------|----------|----------|--------|-------------|');
    for (const signal of analysis.domainSignals.signals) {
      lines.push(
        `| ${signal.domain} | ${signal.strength} | ${signal.keywordMatches} | ${signal.agentCount} | ${signal.avgQuality} |`
      );
    }
  } else {
    lines.push('No significant domain signals detected.');
  }
  lines.push('');

  // Coverage Gaps
  lines.push('## Coverage Gaps');
  lines.push('');
  if (analysis.coverageGaps.gaps.length > 0) {
    lines.push(`- **HIGH Priority:** ${analysis.coverageGaps.highPriorityGaps.length}`);
    lines.push(`- **MEDIUM Priority:** ${analysis.coverageGaps.mediumPriorityGaps.length}`);
    lines.push(`- **LOW Priority:** ${analysis.coverageGaps.lowPriorityGaps.length}`);
    lines.push('');

    if (analysis.coverageGaps.highPriorityGaps.length > 0) {
      lines.push('### HIGH Priority Gaps');
      lines.push('');
      for (const gap of analysis.coverageGaps.highPriorityGaps) {
        lines.push(`- **${gap.description}**`);
        lines.push(`  - Type: ${gap.type}`);
        lines.push(`  - Reported by: ${gap.reportedBy.join(', ')}`);
        lines.push(
          `  - Specialist: ${gap.specialistType || 'None'} (${gap.specialistTrack || 'N/A'})`
        );
      }
      lines.push('');
    }
  } else {
    lines.push('No coverage gaps reported.');
  }
  lines.push('');

  // Pivot Decision
  lines.push('## Pivot Decision');
  lines.push('');
  lines.push(
    `- **Launch Wave 2:** ${analysis.pivotDecision.shouldLaunchWave2 ? '✅ YES' : '❌ NO'}`
  );
  lines.push(`- **Confidence:** ${analysis.pivotDecision.confidence}%`);
  lines.push('');
  lines.push('**Rationale:**');
  for (const reason of analysis.pivotDecision.rationale) {
    lines.push(`- ${reason}`);
  }
  lines.push('');

  if (analysis.pivotDecision.specialists.length > 0) {
    lines.push(`### Specialist Recommendations (${analysis.pivotDecision.specialists.length})`);
    lines.push('');
    lines.push('| Agent | Track | Priority | Source |');
    lines.push('|-------|-------|----------|--------|');
    for (const spec of analysis.pivotDecision.specialists) {
      lines.push(`| ${spec.agentType} | ${spec.track} | ${spec.priority} | ${spec.source} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// COMMANDS
// ============================================================================

async function runAnalyze(args: CLIArgs): Promise<void> {
  if (!args.sessionDir) {
    console.error('❌ Error: Missing session directory');
    console.log('Usage: quality-analyzer analyze <session-dir> [--wave N]');
    process.exit(1);
  }

  if (!existsSync(args.sessionDir)) {
    console.error(`❌ Error: Session directory not found: ${args.sessionDir}`);
    process.exit(1);
  }

  const wave = args.wave || 1;

  console.log(`🔍 Analyzing session: ${args.sessionDir} (Wave ${wave})`);
  console.log('');

  // Step 1: Score agents
  const quality = await scoreWave(args.sessionDir, wave);

  // Step 2: Detect domain signals
  const domainSignals = await detectWaveSignals(args.sessionDir, wave, quality.scores);

  // Step 3: Analyze coverage gaps
  const coverageGaps = await analyzeWaveGaps(args.sessionDir, wave, quality.scores);

  // Step 4: Validate platform coverage
  const platformCoverage = await validatePlatformCoverage(args.sessionDir, wave);

  // Step 5: Make pivot decision
  const pivotDecision = await makePivotDecision({
    sessionDir: args.sessionDir,
    wave,
    quality,
    domainSignals,
    coverageGaps,
    platformCoverage,
  });

  // Build output
  const analysisOutput: QualityAnalysisOutput = {
    agentQuality: quality,
    domainSignals,
    coverageGaps,
    platformCoverage: platformCoverage.coverage,
    sourceQuality: null,
    pivotDecision,
    metadata: {
      sessionDir: args.sessionDir,
      wave,
      analyzedAt: new Date().toISOString(),
      agentCount: quality.scores.length,
    },
  };

  // Save outputs
  const outputDir = `${args.sessionDir}/analysis`;

  if (args.output === 'json' || args.output === 'both') {
    const jsonPath = `${outputDir}/wave-${wave}-quality-analysis.json`;
    await writeFile(jsonPath, JSON.stringify(analysisOutput, null, 2));
    console.log(`\n💾 Saved JSON: ${jsonPath}`);
  }

  if (args.output === 'markdown' || args.output === 'both') {
    const mdPath = `${outputDir}/wave-${wave}-quality-analysis.md`;
    const markdown = formatMarkdown(analysisOutput);
    await writeFile(mdPath, markdown);
    console.log(`💾 Saved Markdown: ${mdPath}`);
  }

  // Also save pivot decision separately
  const pivotPath = `${outputDir}/wave-${wave}-pivot-decision.json`;
  await writeFile(pivotPath, JSON.stringify(pivotDecision, null, 2));
  console.log(`💾 Saved Pivot Decision: ${pivotPath}`);

  console.log('');
  console.log('✅ Analysis complete');
}

async function runScore(args: CLIArgs): Promise<void> {
  if (!args.sessionDir) {
    console.error('❌ Error: Missing session directory');
    process.exit(1);
  }

  const wave = args.wave || 1;
  const quality = await scoreWave(args.sessionDir, wave);

  console.log(JSON.stringify(quality, null, 2));
}

async function runSignals(args: CLIArgs): Promise<void> {
  if (!args.sessionDir) {
    console.error('❌ Error: Missing session directory');
    process.exit(1);
  }

  const wave = args.wave || 1;
  const quality = await scoreWave(args.sessionDir, wave);
  const signals = await detectWaveSignals(args.sessionDir, wave, quality.scores);

  console.log(JSON.stringify(signals, null, 2));
}

async function runGaps(args: CLIArgs): Promise<void> {
  if (!args.sessionDir) {
    console.error('❌ Error: Missing session directory');
    process.exit(1);
  }

  const wave = args.wave || 1;
  const quality = await scoreWave(args.sessionDir, wave);
  const gaps = await analyzeWaveGaps(args.sessionDir, wave, quality.scores);

  console.log(JSON.stringify(gaps, null, 2));
}

async function runPivot(args: CLIArgs): Promise<void> {
  if (!args.sessionDir) {
    console.error('❌ Error: Missing session directory');
    process.exit(1);
  }

  const wave = args.wave || 1;
  const quality = await scoreWave(args.sessionDir, wave);
  const domainSignals = await detectWaveSignals(args.sessionDir, wave, quality.scores);
  const coverageGaps = await analyzeWaveGaps(args.sessionDir, wave, quality.scores);
  const platformCoverage = await validatePlatformCoverage(args.sessionDir, wave);

  const pivotDecision = await makePivotDecision({
    sessionDir: args.sessionDir,
    wave,
    quality,
    domainSignals,
    coverageGaps,
    platformCoverage,
  });

  console.log(JSON.stringify(pivotDecision, null, 2));
}

function showHelp(): void {
  console.log(`
Quality Analyzer CLI

Usage:
  quality-analyzer <command> [options]

Commands:
  analyze <session-dir>        Run full quality analysis
  score <session-dir>          Score agents in a wave
  signals <session-dir>        Detect domain signals
  gaps <session-dir>           Analyze coverage gaps
  pivot <session-dir>          Make pivot decision
  help                         Show this help

Options:
  --wave N                     Wave number (1 or 2, default: 1)
  --output <format>            Output format: json, markdown, both (default: both)
  --verbose, -v                Verbose output

Examples:
  quality-analyzer analyze ./session-20251225-153655-10300 --wave 1
  quality-analyzer pivot ./session-20251225-153655-10300 --wave 1 --output json
  quality-analyzer score ./session-20251225-153655-10300 --wave 2
`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = parseArgs();

  try {
    switch (args.command) {
      case 'analyze':
        await runAnalyze(args);
        break;
      case 'score':
        await runScore(args);
        break;
      case 'signals':
        await runSignals(args);
        break;
      case 'gaps':
        await runGaps(args);
        break;
      case 'pivot':
        await runPivot(args);
        break;
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
