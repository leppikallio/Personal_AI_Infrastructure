/**
 * Agent Quality Scorer
 *
 * Implements 0-100 scoring algorithm for research agent outputs:
 * - Length Score (0-40 pts): Based on content size
 * - Source Score (0-30 pts): Based on citation count
 * - Confidence Score (0-30 pts): Based on agent self-assessment
 *
 * Replaces ad-hoc bash scripts with proper TypeScript implementation.
 */

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { AgentType, PerspectiveTrack } from '../query-analyzer/types.ts';
import type {
  AgentMetadata,
  AgentQualityAggregate,
  AgentQualityScore,
  QualityBand,
} from './types.ts';

// ============================================================================
// SCORING CONSTANTS
// ============================================================================

/** Length scoring thresholds (in bytes) */
const LENGTH_THRESHOLDS = {
  EXCELLENT: 2000, // 40 points
  GOOD: 1000, // 25 points
  MODERATE: 500, // 15 points
  POOR: 0, // 5 points
} as const;

/** Source count scoring thresholds */
const SOURCE_THRESHOLDS = {
  EXCELLENT: 5, // 30 points
  GOOD: 3, // 20 points
  MODERATE: 1, // 10 points
  POOR: 0, // 0 points
} as const;

/** Quality band score ranges */
const BAND_RANGES = {
  EXCELLENT: 80,
  GOOD: 60,
  MODERATE: 40,
  POOR: 0,
} as const;

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

/**
 * Extract metadata from agent output file
 *
 * Looks for:
 * - YAML frontmatter (between --- delimiters)
 * - Metadata section markers (## Research Metadata, ## Agent Metadata)
 * - Source citations (IEEE format [N], URLs)
 * - Confidence statements
 */
async function extractMetadata(filePath: string): Promise<AgentMetadata> {
  const content = await readFile(filePath, 'utf-8');
  const agentId = basename(filePath, '.md');

  // Default values
  let confidence = 75; // Default if not found
  const sources: string[] = [];
  let agentType: AgentType = 'claude-researcher'; // Default
  let track: PerspectiveTrack = 'standard'; // Default

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    // Extract confidence
    const confMatch = frontmatter.match(/confidence:\s*(\d+)/i);
    if (confMatch) {
      confidence = Number.parseInt(confMatch[1], 10);
    }

    // Extract agent type
    const agentMatch = frontmatter.match(/agent:\s*['"]?([^'" {2}\n]+)/i);
    if (agentMatch) {
      agentType = agentMatch[1] as AgentType;
    }

    // Extract track
    const trackMatch = frontmatter.match(/track:\s*['"]?([^'" {2}\n]+)/i);
    if (trackMatch) {
      track = trackMatch[1] as PerspectiveTrack;
    }
  }

  // Extract confidence from metadata section if not in frontmatter
  if (confidence === 75) {
    const confMatch = content.match(/\*\*Confidence:\*\*\s*(\d+)\/100/i);
    if (confMatch) {
      confidence = Number.parseInt(confMatch[1], 10);
    }
  }

  // Extract sources from IEEE citations [N]
  const citationMatches = content.matchAll(/\[(\d+)\][^:](?!:\/\/)/g);
  const citationNumbers = new Set<number>();
  for (const match of citationMatches) {
    citationNumbers.add(Number.parseInt(match[1], 10));
  }

  // Extract URLs from References section
  const urlMatches = content.matchAll(/https?:\/\/[^\s\)]+/g);
  for (const match of urlMatches) {
    const url = match[0].replace(/[.,;]$/, ''); // Remove trailing punctuation
    if (!sources.includes(url)) {
      sources.push(url);
    }
  }

  // If we found citation numbers, use that count (more accurate than URL count)
  const sourceCount = citationNumbers.size > 0 ? citationNumbers.size : sources.length;

  // Extract limited coverage notes
  let limitedCoverage: string | undefined;
  const limitedCoverageMatch = content.match(/##\s*Limited Coverage\s*\n\n([\s\S]*?)(?:\n##|$)/i);
  if (limitedCoverageMatch) {
    limitedCoverage = limitedCoverageMatch[1].trim();
  }

  // Extract alternative domains
  const alternativeDomains: string[] = [];
  const altDomainsMatch = content.match(/##\s*Alternative Domains\s*\n\n([\s\S]*?)(?:\n##|$)/i);
  if (altDomainsMatch) {
    const domains = altDomainsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());
    alternativeDomains.push(...domains);
  }

  // Extract tool gaps
  const toolGaps: string[] = [];
  const toolGapsMatch = content.match(/##\s*Tool Gaps\s*\n\n([\s\S]*?)(?:\n##|$)/i);
  if (toolGapsMatch) {
    const gaps = toolGapsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());
    toolGaps.push(...gaps);
  }

  // Extract platforms searched
  const platformsSearched: string[] = [];
  const platformsMatch = content.match(
    /##\s*Platforms?\s+(?:Searched|Covered)\s*\n\n([\s\S]*?)(?:\n##|$)/i
  );
  if (platformsMatch) {
    const platforms = platformsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());
    platformsSearched.push(...platforms);
  }

  return {
    agentId,
    agentType,
    track,
    confidence,
    sources: sources.slice(0, sourceCount), // Use actual URLs up to citation count
    limitedCoverage,
    alternativeDomains: alternativeDomains.length > 0 ? alternativeDomains : undefined,
    toolGaps: toolGaps.length > 0 ? toolGaps : undefined,
    platformsSearched: platformsSearched.length > 0 ? platformsSearched : undefined,
  };
}

// ============================================================================
// SCORING ALGORITHM
// ============================================================================

/**
 * Calculate length score (0-40 points)
 *
 * Thresholds:
 * - ≥2000 bytes: 40 points (EXCELLENT)
 * - ≥1000 bytes: 25 points (GOOD)
 * - ≥500 bytes: 15 points (MODERATE)
 * - <500 bytes: 5 points (POOR)
 */
function calculateLengthScore(contentLength: number): number {
  if (contentLength >= LENGTH_THRESHOLDS.EXCELLENT) return 40;
  if (contentLength >= LENGTH_THRESHOLDS.GOOD) return 25;
  if (contentLength >= LENGTH_THRESHOLDS.MODERATE) return 15;
  return 5;
}

/**
 * Calculate source count score (0-30 points)
 *
 * Thresholds:
 * - ≥5 sources: 30 points (EXCELLENT)
 * - ≥3 sources: 20 points (GOOD)
 * - ≥1 source: 10 points (MODERATE)
 * - 0 sources: 0 points (POOR)
 */
function calculateSourceScore(sourceCount: number): number {
  if (sourceCount >= SOURCE_THRESHOLDS.EXCELLENT) return 30;
  if (sourceCount >= SOURCE_THRESHOLDS.GOOD) return 20;
  if (sourceCount >= SOURCE_THRESHOLDS.MODERATE) return 10;
  return 0;
}

/**
 * Calculate confidence score (0-30 points)
 *
 * Formula: (agent_confidence / 100) × 30
 *
 * Examples:
 * - 100% confidence = 30 points
 * - 75% confidence = 22.5 points
 * - 50% confidence = 15 points
 */
function calculateConfidenceScore(agentConfidence: number): number {
  return Math.round((agentConfidence / 100) * 30);
}

/**
 * Determine quality band from total score
 *
 * Bands:
 * - EXCELLENT: 80-100
 * - GOOD: 60-79
 * - MODERATE: 40-59
 * - POOR: 0-39
 */
function determineQualityBand(totalScore: number): QualityBand {
  if (totalScore >= BAND_RANGES.EXCELLENT) return 'EXCELLENT';
  if (totalScore >= BAND_RANGES.GOOD) return 'GOOD';
  if (totalScore >= BAND_RANGES.MODERATE) return 'MODERATE';
  return 'POOR';
}

// ============================================================================
// AGENT SCORING
// ============================================================================

/**
 * Score a single agent output file
 *
 * @param filePath - Path to agent output markdown file
 * @returns Quality score for this agent
 */
export async function scoreAgent(filePath: string): Promise<AgentQualityScore> {
  // Read file and extract metadata
  const content = await readFile(filePath, 'utf-8');
  const metadata = await extractMetadata(filePath);

  // Calculate raw metrics
  const contentLength = Buffer.byteLength(content, 'utf-8');
  const sourceCount = metadata.sources.length;
  const agentConfidence = metadata.confidence;

  // Calculate component scores
  const lengthScore = calculateLengthScore(contentLength);
  const sourceScore = calculateSourceScore(sourceCount);
  const confidenceScore = calculateConfidenceScore(agentConfidence);

  // Calculate total score
  const totalScore = lengthScore + sourceScore + confidenceScore;

  // Determine quality band
  const band = determineQualityBand(totalScore);

  return {
    agentId: metadata.agentId,
    agentType: metadata.agentType,
    track: metadata.track,
    lengthScore,
    sourceScore,
    confidenceScore,
    totalScore,
    band,
    metrics: {
      contentLength,
      sourceCount,
      agentConfidence,
    },
  };
}

/**
 * Score multiple agent output files
 *
 * @param filePaths - Paths to agent output markdown files
 * @returns Array of quality scores
 */
export async function scoreAgents(filePaths: string[]): Promise<AgentQualityScore[]> {
  const scores = await Promise.all(filePaths.map(scoreAgent));
  return scores;
}

// ============================================================================
// AGGREGATE STATISTICS
// ============================================================================

/**
 * Calculate aggregate statistics for a set of agent scores
 *
 * @param scores - Individual agent quality scores
 * @returns Aggregate statistics
 */
export function calculateAggregate(scores: AgentQualityScore[]): AgentQualityAggregate {
  if (scores.length === 0) {
    return {
      scores: [],
      averageScore: 0,
      minScore: 0,
      maxScore: 0,
      bandDistribution: {
        EXCELLENT: 0,
        GOOD: 0,
        MODERATE: 0,
        POOR: 0,
      },
      failedAgents: [],
      marginalAgents: [],
      passingAgents: [],
    };
  }

  // Calculate basic stats
  const totalScores = scores.map((s) => s.totalScore);
  const averageScore = Math.round(
    totalScores.reduce((sum, score) => sum + score, 0) / scores.length
  );
  const minScore = Math.min(...totalScores);
  const maxScore = Math.max(...totalScores);

  // Count band distribution
  const bandDistribution: Record<QualityBand, number> = {
    EXCELLENT: 0,
    GOOD: 0,
    MODERATE: 0,
    POOR: 0,
  };

  for (const score of scores) {
    bandDistribution[score.band]++;
  }

  // Categorize agents
  const failedAgents = scores.filter((s) => s.totalScore < 40).map((s) => s.agentId);

  const marginalAgents = scores
    .filter((s) => s.totalScore >= 40 && s.totalScore < 60)
    .map((s) => s.agentId);

  const passingAgents = scores.filter((s) => s.totalScore >= 60).map((s) => s.agentId);

  return {
    scores,
    averageScore,
    minScore,
    maxScore,
    bandDistribution,
    failedAgents,
    marginalAgents,
    passingAgents,
  };
}

/**
 * Score all agents in a session directory wave
 *
 * @param sessionDir - Session directory path
 * @param wave - Wave number (1 or 2)
 * @returns Aggregate quality statistics
 */
export async function scoreWave(sessionDir: string, wave: 1 | 2): Promise<AgentQualityAggregate> {
  const { glob } = await import('glob');
  const waveDir = `${sessionDir}/wave-${wave}`;

  // Find all markdown files in wave directory
  const files = await glob(`${waveDir}/*.md`, {
    ignore: ['**/README.md', '**/*summary*.md', '**/*validation*.md'],
  });

  if (files.length === 0) {
    console.warn(`⚠️ No agent output files found in ${waveDir}`);
    return calculateAggregate([]);
  }

  console.log(`📊 Scoring ${files.length} agents from Wave ${wave}...`);

  const scores = await scoreAgents(files);
  const aggregate = calculateAggregate(scores);

  console.log(`✅ Average quality score: ${aggregate.averageScore}/100`);
  console.log(`   Range: ${aggregate.minScore}-${aggregate.maxScore}`);
  console.log(
    `   Bands: ${aggregate.bandDistribution.EXCELLENT} excellent, ${aggregate.bandDistribution.GOOD} good, ${aggregate.bandDistribution.MODERATE} moderate, ${aggregate.bandDistribution.POOR} poor`
  );

  if (aggregate.failedAgents.length > 0) {
    console.warn(`⚠️ Failed agents (<40): ${aggregate.failedAgents.join(', ')}`);
  }

  return aggregate;
}
