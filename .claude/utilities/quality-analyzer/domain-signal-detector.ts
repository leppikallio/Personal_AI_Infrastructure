/**
 * Domain Signal Detector
 *
 * Detects cross-domain themes by analyzing keyword patterns across agent outputs.
 * Used in pivot decision to identify emergent research directions that warrant
 * specialist follow-up in Wave 2.
 *
 * Signal strength is weighted by agent quality - high-quality agents contribute
 * more to signal detection than low-quality outputs.
 */

import { readFile } from 'node:fs/promises';
import { DOMAIN_AGENT_MAP } from '../query-analyzer/domain-keywords.ts';
import type { AgentType, DomainName } from '../query-analyzer/types.ts';
import type {
  AgentQualityScore,
  DomainSignal,
  DomainSignalAnalysis,
  KeywordDictionaries,
} from './types.ts';
import { DEFAULT_KEYWORD_DICTIONARIES } from './types.ts';

// ============================================================================
// SIGNAL DETECTION CONFIGURATION
// ============================================================================

/** Minimum signal strength to be considered secondary signal */
const SECONDARY_SIGNAL_THRESHOLD = 50;

/** Signal strength thresholds for Wave 2 recommendations */
const WAVE2_THRESHOLDS = {
  HIGH: 150, // Launch 3 specialists
  MEDIUM: 100, // Launch 2 specialists
  LOW: 50, // Launch 1 specialist
} as const;

/**
 * Domain-to-agent mapping for specialist recommendations
 * Imported from query-analyzer domain-keywords.ts
 */
const DOMAIN_SPECIALISTS: Record<DomainName, AgentType> = DOMAIN_AGENT_MAP as Record<
  DomainName,
  AgentType
>;

// ============================================================================
// KEYWORD MATCHING
// ============================================================================

/**
 * Count occurrences of keywords in text (case-insensitive)
 *
 * @param text - Text to search
 * @param keywords - Keywords to search for
 * @returns Map of keyword → occurrence count
 */
function countKeywords(text: string, keywords: string[]): Map<string, number> {
  const lowerText = text.toLowerCase();
  const counts = new Map<string, number>();

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();

    // Use word boundary regex to avoid partial matches
    // Example: "twitter" matches "twitter" but not "twitterati"
    const pattern = new RegExp(
      `\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'gi'
    );
    const matches = lowerText.match(pattern);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      counts.set(keyword, count);
    }
  }

  return counts;
}

/**
 * Calculate domain signal strength from keyword counts and agent quality
 *
 * Signal strength = Σ(keyword_count × quality_weight)
 * Quality weight = (agent_score / 100) to prioritize high-quality agents
 *
 * @param keywordCounts - Keyword occurrence counts
 * @param qualityScore - Agent quality score (0-100)
 * @returns Weighted signal strength
 */
function calculateSignalStrength(keywordCounts: Map<string, number>, qualityScore: number): number {
  const totalCount = Array.from(keywordCounts.values()).reduce((sum, count) => sum + count, 0);
  const qualityWeight = qualityScore / 100;
  return Math.round(totalCount * qualityWeight);
}

// ============================================================================
// AGENT ANALYSIS
// ============================================================================

/**
 * Analyze a single agent output for domain signals
 *
 * @param filePath - Path to agent output file
 * @param qualityScore - Agent's quality score (for weighting)
 * @param dictionaries - Keyword dictionaries to use
 * @returns Domain signals detected in this agent
 */
async function analyzeAgentSignals(
  filePath: string,
  qualityScore: AgentQualityScore,
  dictionaries: KeywordDictionaries = DEFAULT_KEYWORD_DICTIONARIES
): Promise<Map<DomainName, { strength: number; keywordMatches: number }>> {
  const content = await readFile(filePath, 'utf-8');
  const signals = new Map<DomainName, { strength: number; keywordMatches: number }>();

  // Analyze each domain
  for (const domain of Object.keys(dictionaries) as DomainName[]) {
    const keywords = dictionaries[domain];
    const keywordCounts = countKeywords(content, keywords);

    if (keywordCounts.size > 0) {
      const strength = calculateSignalStrength(keywordCounts, qualityScore.totalScore);
      signals.set(domain, {
        strength,
        keywordMatches: keywordCounts.size,
      });
    }
  }

  return signals;
}

// ============================================================================
// AGGREGATE ANALYSIS
// ============================================================================

/**
 * Aggregate domain signals across multiple agents
 *
 * @param agentSignals - Map of agent ID → domain signals
 * @param qualityScores - Agent quality scores for averaging
 * @returns Aggregated domain signals
 */
function aggregateSignals(
  agentSignals: Map<string, Map<DomainName, { strength: number; keywordMatches: number }>>,
  qualityScores: Map<string, AgentQualityScore>
): DomainSignal[] {
  const aggregated = new Map<
    DomainName,
    {
      totalStrength: number;
      totalKeywords: number;
      agentIds: string[];
      qualityScores: number[];
    }
  >();

  // Aggregate signals per domain
  for (const [agentId, signals] of agentSignals.entries()) {
    for (const [domain, { strength, keywordMatches }] of signals.entries()) {
      const existing = aggregated.get(domain) || {
        totalStrength: 0,
        totalKeywords: 0,
        agentIds: [],
        qualityScores: [],
      };

      existing.totalStrength += strength;
      existing.totalKeywords += keywordMatches;
      existing.agentIds.push(agentId);

      const qualityScore = qualityScores.get(agentId);
      if (qualityScore) {
        existing.qualityScores.push(qualityScore.totalScore);
      }

      aggregated.set(domain, existing);
    }
  }

  // Convert to DomainSignal array
  const domainSignals: DomainSignal[] = [];

  for (const [domain, data] of aggregated.entries()) {
    const avgQuality =
      data.qualityScores.length > 0
        ? Math.round(data.qualityScores.reduce((sum, q) => sum + q, 0) / data.qualityScores.length)
        : 0;

    const recommendedAgents: AgentType[] = [];
    const specialist = DOMAIN_SPECIALISTS[domain];
    if (specialist) {
      recommendedAgents.push(specialist);
    }

    domainSignals.push({
      domain,
      strength: data.totalStrength,
      keywordMatches: data.totalKeywords,
      agentCount: data.agentIds.length,
      avgQuality,
      recommendedAgents,
    });
  }

  // Sort by strength (highest first)
  return domainSignals.sort((a, b) => b.strength - a.strength);
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

/**
 * Generate Wave 2 specialist recommendations based on signal strength
 *
 * Rules:
 * - Strength ≥150: HIGH priority (launch 3 specialists)
 * - Strength 100-149: MEDIUM priority (launch 2 specialists)
 * - Strength 50-99: LOW priority (launch 1 specialist)
 * - Strength <50: Skip (below threshold)
 *
 * @param signals - Domain signals
 * @returns Specialist recommendations
 */
function generateRecommendations(signals: DomainSignal[]): DomainSignalAnalysis['recommendations'] {
  const recommendations: DomainSignalAnalysis['recommendations'] = [];

  for (const signal of signals) {
    if (signal.strength < WAVE2_THRESHOLDS.LOW) continue;

    let priority: 'HIGH' | 'MEDIUM' | 'LOW';
    let rationale: string;

    if (signal.strength >= WAVE2_THRESHOLDS.HIGH) {
      priority = 'HIGH';
      rationale = `Strong ${signal.domain} signal (${signal.strength} strength) from ${signal.agentCount} agents with ${signal.keywordMatches} keyword matches. Launch 3 specialists.`;
    } else if (signal.strength >= WAVE2_THRESHOLDS.MEDIUM) {
      priority = 'MEDIUM';
      rationale = `Moderate ${signal.domain} signal (${signal.strength} strength) from ${signal.agentCount} agents. Launch 2 specialists.`;
    } else {
      priority = 'LOW';
      rationale = `Emerging ${signal.domain} signal (${signal.strength} strength). Launch 1 specialist to investigate.`;
    }

    for (const agentType of signal.recommendedAgents) {
      recommendations.push({
        domain: signal.domain,
        agentType,
        priority,
        rationale,
      });
    }
  }

  return recommendations;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Detect domain signals across multiple agent outputs
 *
 * @param filePaths - Paths to agent output files
 * @param qualityScores - Quality scores for each agent
 * @param dictionaries - Optional custom keyword dictionaries
 * @returns Domain signal analysis
 */
export async function detectDomainSignals(
  filePaths: string[],
  qualityScores: AgentQualityScore[],
  dictionaries: KeywordDictionaries = DEFAULT_KEYWORD_DICTIONARIES
): Promise<DomainSignalAnalysis> {
  console.log(`🔍 Detecting domain signals across ${filePaths.length} agents...`);

  // Build quality score lookup
  const qualityMap = new Map<string, AgentQualityScore>();
  for (const score of qualityScores) {
    qualityMap.set(score.agentId, score);
  }

  // Analyze each agent
  const agentSignals = new Map<
    string,
    Map<DomainName, { strength: number; keywordMatches: number }>
  >();

  for (const filePath of filePaths) {
    const agentId = filePath.split('/').pop()?.replace('.md', '') || filePath;
    const qualityScore = qualityMap.get(agentId);

    if (!qualityScore) {
      console.warn(`⚠️ No quality score found for ${agentId}, skipping signal detection`);
      continue;
    }

    const signals = await analyzeAgentSignals(filePath, qualityScore, dictionaries);
    if (signals.size > 0) {
      agentSignals.set(agentId, signals);
    }
  }

  // Aggregate signals
  const signals = aggregateSignals(agentSignals, qualityMap);

  // Determine primary and secondary signals
  const primarySignal = signals.length > 0 ? signals[0] : null;
  const secondarySignals = signals.filter(
    (s) => s.strength >= SECONDARY_SIGNAL_THRESHOLD && s !== primarySignal
  );

  // Calculate total signal strength
  const totalStrength = signals.reduce((sum, s) => sum + s.strength, 0);

  // Generate recommendations
  const recommendations = generateRecommendations(signals);

  console.log(`✅ Detected ${signals.length} domain signals`);
  if (primarySignal) {
    console.log(`   Primary: ${primarySignal.domain} (${primarySignal.strength} strength)`);
  }
  if (secondarySignals.length > 0) {
    console.log(`   Secondary: ${secondarySignals.map((s) => s.domain).join(', ')}`);
  }

  return {
    signals,
    primarySignal,
    secondarySignals,
    totalStrength,
    recommendations,
  };
}

/**
 * Detect domain signals for a wave directory
 *
 * @param sessionDir - Session directory path
 * @param wave - Wave number
 * @param qualityScores - Quality scores for agents in this wave
 * @param dictionaries - Optional custom keyword dictionaries
 * @returns Domain signal analysis
 */
export async function detectWaveSignals(
  sessionDir: string,
  wave: 1 | 2,
  qualityScores: AgentQualityScore[],
  dictionaries?: KeywordDictionaries
): Promise<DomainSignalAnalysis> {
  const { glob } = await import('glob');
  const waveDir = `${sessionDir}/wave-${wave}`;

  const files = await glob(`${waveDir}/*.md`, {
    ignore: ['**/README.md', '**/*summary*.md', '**/*validation*.md'],
  });

  return detectDomainSignals(files, qualityScores, dictionaries);
}
