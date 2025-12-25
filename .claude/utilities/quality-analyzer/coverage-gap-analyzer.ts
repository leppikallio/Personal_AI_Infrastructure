/**
 * Coverage Gap Analyzer
 *
 * Extracts and analyzes coverage gaps reported by agents in their metadata sections:
 * - Limited Coverage: Areas the agent couldn't fully research
 * - Alternative Domains: Related topics beyond scope
 * - Tool Gaps: Missing tools/capabilities that limited research
 * - Platform Gaps: Platforms that weren't accessible
 *
 * Gaps reported by multiple agents (or high-quality agents) trigger Wave 2 specialists.
 */

import { readFile } from 'node:fs/promises';
import type { PerspectiveTrack } from '../query-analyzer/source-tiers/types.ts';
import type { AgentType } from '../query-analyzer/types.ts';
import type { AgentQualityScore, CoverageGap, CoverageGapAnalysis } from './types.ts';

// ============================================================================
// GAP EXTRACTION
// ============================================================================

/**
 * Extract coverage gaps from agent metadata sections
 *
 * Looks for markdown sections:
 * - ## Limited Coverage
 * - ## Alternative Domains
 * - ## Tool Gaps
 * - ## Platform Gaps / Platforms Not Searched
 *
 * @param content - Agent output file content
 * @returns Extracted gaps with types
 */
function extractGaps(content: string): Array<{ type: CoverageGap['type']; description: string }> {
  const gaps: Array<{ type: CoverageGap['type']; description: string }> = [];

  // Extract Limited Coverage
  const limitedCoverageMatch = content.match(/##\s*Limited Coverage\s*\n\n([\s\S]*?)(?:\n##|$)/i);
  if (limitedCoverageMatch) {
    const lines = limitedCoverageMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());

    for (const line of lines) {
      if (line.length > 0) {
        gaps.push({ type: 'limited_coverage', description: line });
      }
    }
  }

  // Extract Alternative Domains
  const altDomainsMatch = content.match(/##\s*Alternative Domains?\s*\n\n([\s\S]*?)(?:\n##|$)/i);
  if (altDomainsMatch) {
    const lines = altDomainsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());

    for (const line of lines) {
      if (line.length > 0) {
        gaps.push({ type: 'alternative_domain', description: line });
      }
    }
  }

  // Extract Tool Gaps
  const toolGapsMatch = content.match(/##\s*Tool Gaps?\s*\n\n([\s\S]*?)(?:\n##|$)/i);
  if (toolGapsMatch) {
    const lines = toolGapsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());

    for (const line of lines) {
      if (line.length > 0) {
        gaps.push({ type: 'tool_gap', description: line });
      }
    }
  }

  // Extract Platform Gaps
  const platformGapsMatch = content.match(
    /##\s*(?:Platform Gaps?|Platforms? Not Searched)\s*\n\n([\s\S]*?)(?:\n##|$)/i
  );
  if (platformGapsMatch) {
    const lines = platformGapsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());

    for (const line of lines) {
      if (line.length > 0) {
        gaps.push({ type: 'platform_gap', description: line });
      }
    }
  }

  return gaps;
}

// ============================================================================
// GAP NORMALIZATION
// ============================================================================

/**
 * Normalize gap description for deduplication
 *
 * Converts descriptions to lowercase, removes punctuation,
 * and standardizes common variations.
 *
 * Examples:
 * - "No access to LinkedIn data" → "no access linkedin data"
 * - "LinkedIn not available." → "linkedin not available"
 * - "Missing LinkedIn coverage" → "missing linkedin coverage"
 *
 * @param description - Original gap description
 * @returns Normalized gap identifier
 */
function normalizeGap(description: string): string {
  return description
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Determine if two gaps are semantically similar
 *
 * Uses simple keyword overlap heuristic:
 * - If 70%+ of significant words match, gaps are considered similar
 *
 * @param gap1 - First gap description
 * @param gap2 - Second gap description
 * @returns True if gaps are similar
 */
function areSimilarGaps(gap1: string, gap2: string): boolean {
  const words1 = gap1.split(' ').filter((w) => w.length > 3); // Filter short words
  const words2 = gap2.split(' ').filter((w) => w.length > 3);

  if (words1.length === 0 || words2.length === 0) return false;

  // Count matching words
  const matches = words1.filter((w1) => words2.some((w2) => w2.includes(w1) || w1.includes(w2)));

  // Similar if 70%+ overlap
  const overlap = matches.length / Math.min(words1.length, words2.length);
  return overlap >= 0.7;
}

// ============================================================================
// SPECIALIST MAPPING
// ============================================================================

/**
 * Map gap to recommended specialist agent type
 *
 * Heuristics:
 * - LinkedIn/professional → perplexity-researcher (deep search)
 * - Academic/papers/citations → perplexity-researcher (academic focus)
 * - Code/technical/GitHub → claude-researcher (technical analysis)
 * - Video/visual/YouTube → gemini-researcher (multimodal)
 * - X/Twitter/social → grok-researcher (native X access)
 *
 * @param gap - Coverage gap
 * @returns Recommended specialist agent type
 */
function mapGapToSpecialist(gap: CoverageGap): {
  agentType: AgentType | null;
  track: PerspectiveTrack | null;
  focus: string;
} {
  const normalized = gap.gap;

  // LinkedIn / Professional networks
  if (normalized.includes('linkedin') || normalized.includes('professional network')) {
    return {
      agentType: 'perplexity-researcher',
      track: 'standard',
      focus: `LinkedIn and professional network coverage for: ${gap.description}`,
    };
  }

  // Academic / Papers / Citations
  if (
    normalized.includes('academic') ||
    normalized.includes('paper') ||
    normalized.includes('arxiv') ||
    normalized.includes('citation') ||
    normalized.includes('peer-reviewed')
  ) {
    return {
      agentType: 'perplexity-researcher',
      track: 'independent',
      focus: `Academic research and papers for: ${gap.description}`,
    };
  }

  // Code / Technical / GitHub
  if (
    normalized.includes('code') ||
    normalized.includes('github') ||
    normalized.includes('implementation') ||
    normalized.includes('technical') ||
    normalized.includes('api')
  ) {
    return {
      agentType: 'claude-researcher',
      track: 'standard',
      focus: `Technical implementation and code for: ${gap.description}`,
    };
  }

  // Video / Visual / YouTube
  if (
    normalized.includes('video') ||
    normalized.includes('youtube') ||
    normalized.includes('visual') ||
    normalized.includes('tutorial') ||
    normalized.includes('demo')
  ) {
    return {
      agentType: 'gemini-researcher',
      track: 'standard',
      focus: `Video tutorials and visual content for: ${gap.description}`,
    };
  }

  // X / Twitter / Social media
  if (
    normalized.includes('twitter') ||
    normalized.includes('x.com') ||
    normalized.includes('social media') ||
    normalized.includes('community discussion')
  ) {
    return {
      agentType: 'grok-researcher',
      track: 'standard',
      focus: `Social media and community discussions for: ${gap.description}`,
    };
  }

  // News / Current events
  if (
    normalized.includes('news') ||
    normalized.includes('latest') ||
    normalized.includes('recent') ||
    normalized.includes('current')
  ) {
    return {
      agentType: 'perplexity-researcher',
      track: 'standard',
      focus: `Latest news and developments for: ${gap.description}`,
    };
  }

  // Default: No specific specialist recommended
  return {
    agentType: null,
    track: null,
    focus: gap.description,
  };
}

// ============================================================================
// PRIORITY ASSIGNMENT
// ============================================================================

/**
 * Determine gap priority based on frequency and agent quality
 *
 * Rules:
 * - HIGH: Reported by 2+ agents OR single high-quality agent (score ≥80)
 * - MEDIUM: Reported by 1 agent with good quality (score 60-79)
 * - LOW: Reported by 1 agent with moderate quality (score <60)
 *
 * @param reportedBy - Agent IDs that reported this gap
 * @param qualityScores - Quality scores map
 * @returns Priority level
 */
function determinePriority(
  reportedBy: string[],
  qualityScores: Map<string, AgentQualityScore>
): 'HIGH' | 'MEDIUM' | 'LOW' {
  // Multiple agents reporting = HIGH
  if (reportedBy.length >= 2) return 'HIGH';

  // Single agent - check quality
  const agentId = reportedBy[0];
  const quality = qualityScores.get(agentId);

  if (!quality) return 'LOW';

  if (quality.totalScore >= 80) return 'HIGH';
  if (quality.totalScore >= 60) return 'MEDIUM';
  return 'LOW';
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Analyze coverage gaps across multiple agent outputs
 *
 * @param filePaths - Paths to agent output files
 * @param qualityScores - Quality scores for each agent
 * @returns Coverage gap analysis
 */
export async function analyzeCoverageGaps(
  filePaths: string[],
  qualityScores: AgentQualityScore[]
): Promise<CoverageGapAnalysis> {
  console.log(`🔍 Analyzing coverage gaps across ${filePaths.length} agents...`);

  // Build quality score lookup
  const qualityMap = new Map<string, AgentQualityScore>();
  for (const score of qualityScores) {
    qualityMap.set(score.agentId, score);
  }

  // Extract gaps from all agents
  const allGaps: Array<{
    agentId: string;
    type: CoverageGap['type'];
    description: string;
    normalized: string;
  }> = [];

  for (const filePath of filePaths) {
    const agentId = filePath.split('/').pop()?.replace('.md', '') || filePath;
    const content = await readFile(filePath, 'utf-8');
    const gaps = extractGaps(content);

    for (const gap of gaps) {
      allGaps.push({
        agentId,
        type: gap.type,
        description: gap.description,
        normalized: normalizeGap(gap.description),
      });
    }
  }

  // Group similar gaps
  const gapGroups: Map<
    string,
    {
      descriptions: string[];
      type: CoverageGap['type'];
      reportedBy: string[];
    }
  > = new Map();

  for (const gap of allGaps) {
    let foundGroup = false;

    // Check if this gap is similar to any existing group
    for (const [groupKey, group] of gapGroups.entries()) {
      if (areSimilarGaps(gap.normalized, groupKey)) {
        group.descriptions.push(gap.description);
        if (!group.reportedBy.includes(gap.agentId)) {
          group.reportedBy.push(gap.agentId);
        }
        foundGroup = true;
        break;
      }
    }

    // Create new group if no match found
    if (!foundGroup) {
      gapGroups.set(gap.normalized, {
        descriptions: [gap.description],
        type: gap.type,
        reportedBy: [gap.agentId],
      });
    }
  }

  // Convert to CoverageGap objects
  const gaps: CoverageGap[] = [];

  for (const [normalized, group] of gapGroups.entries()) {
    const priority = determinePriority(group.reportedBy, qualityMap);

    // Use the most detailed description (longest)
    const description = group.descriptions.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    );

    const gap: CoverageGap = {
      gap: normalized,
      description,
      type: group.type,
      reportedBy: group.reportedBy,
      priority,
      specialistType: null,
      specialistTrack: null,
      specialistFocus: '',
    };

    // Map to specialist
    const specialist = mapGapToSpecialist(gap);
    gap.specialistType = specialist.agentType;
    gap.specialistTrack = specialist.track;
    gap.specialistFocus = specialist.focus;

    gaps.push(gap);
  }

  // Sort by priority then by frequency
  gaps.sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.reportedBy.length - a.reportedBy.length;
  });

  // Categorize by priority
  const highPriorityGaps = gaps.filter((g) => g.priority === 'HIGH');
  const mediumPriorityGaps = gaps.filter((g) => g.priority === 'MEDIUM');
  const lowPriorityGaps = gaps.filter((g) => g.priority === 'LOW');

  // Generate recommendations (only for HIGH and MEDIUM priority gaps with specialists)
  const recommendations = gaps
    .filter(
      (g) =>
        (g.priority === 'HIGH' || g.priority === 'MEDIUM') && g.specialistType && g.specialistTrack
    )
    .map((g) => ({
      gap: g.gap,
      agentType: g.specialistType as AgentType,
      track: g.specialistTrack as PerspectiveTrack,
      focus: g.specialistFocus,
    }));

  console.log(`✅ Found ${gaps.length} unique coverage gaps`);
  console.log(`   HIGH priority: ${highPriorityGaps.length}`);
  console.log(`   MEDIUM priority: ${mediumPriorityGaps.length}`);
  console.log(`   LOW priority: ${lowPriorityGaps.length}`);

  return {
    gaps,
    highPriorityGaps,
    mediumPriorityGaps,
    lowPriorityGaps,
    recommendations,
  };
}

/**
 * Analyze coverage gaps for a wave directory
 *
 * @param sessionDir - Session directory path
 * @param wave - Wave number
 * @param qualityScores - Quality scores for agents in this wave
 * @returns Coverage gap analysis
 */
export async function analyzeWaveGaps(
  sessionDir: string,
  wave: 1 | 2,
  qualityScores: AgentQualityScore[]
): Promise<CoverageGapAnalysis> {
  const { glob } = await import('glob');
  const waveDir = `${sessionDir}/wave-${wave}`;

  const files = await glob(`${waveDir}/*.md`, {
    ignore: ['**/README.md', '**/*summary*.md', '**/*validation*.md'],
  });

  return analyzeCoverageGaps(files, qualityScores);
}
