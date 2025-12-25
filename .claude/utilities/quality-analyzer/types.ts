/**
 * Quality Analyzer Types
 * Part of M13 Research Workflow - Quality Scoring & Pivot Decision System
 *
 * Integrates with:
 * - M10 Source Quality Framework (source-tiers/)
 * - Query Analyzer types (../query-analyzer/types.ts)
 * - Research workflow commands (/_research-collect-execute.md)
 */

import type {
  PerspectiveTrack,
  QualityGateResult,
  SourceQualityReport,
} from '../query-analyzer/source-tiers/types.ts';
import type {
  AgentType,
  DomainName,
  EnhancedPerspective,
  PlatformCoverageResult,
} from '../query-analyzer/types.ts';

// ============================================================================
// AGENT QUALITY SCORING TYPES
// ============================================================================

/**
 * Quality score for a single agent output
 * Algorithm: Length (40pts) + Sources (30pts) + Confidence (30pts) = 0-100
 */
export interface AgentQualityScore {
  /** Agent identifier (file name or ID) */
  agentId: string;
  /** Agent type */
  agentType: AgentType;
  /** Perspective track (standard, independent, contrarian) */
  track: PerspectiveTrack;
  /** Length score: 0-40 pts */
  lengthScore: number;
  /** Source count score: 0-30 pts */
  sourceScore: number;
  /** Confidence score: 0-30 pts (from agent metadata) */
  confidenceScore: number;
  /** Total score: 0-100 */
  totalScore: number;
  /** Quality band classification */
  band: QualityBand;
  /** Raw metrics used for scoring */
  metrics: {
    /** Content length in bytes */
    contentLength: number;
    /** Number of unique sources cited */
    sourceCount: number;
    /** Agent's self-reported confidence (0-100) */
    agentConfidence: number;
  };
}

/**
 * Quality band classification based on total score
 */
export type QualityBand = 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';

/**
 * Aggregate quality statistics for all agents in a wave
 */
export interface AgentQualityAggregate {
  /** All individual agent scores */
  scores: AgentQualityScore[];
  /** Average total score across all agents */
  averageScore: number;
  /** Minimum total score */
  minScore: number;
  /** Maximum total score */
  maxScore: number;
  /** Number of agents in each quality band */
  bandDistribution: Record<QualityBand, number>;
  /** Agents below retry threshold (<40) */
  failedAgents: string[];
  /** Agents in moderate range (40-59) */
  marginalAgents: string[];
  /** Agents with good/excellent quality (≥60) */
  passingAgents: string[];
}

// ============================================================================
// DOMAIN SIGNAL DETECTION TYPES
// ============================================================================

/**
 * Keyword dictionaries for domain signal detection
 * Organized by research domain - used to detect cross-domain themes
 */
export interface KeywordDictionaries {
  social_media: string[];
  academic: string[];
  technical: string[];
  multimodal: string[];
  security: string[];
  news: string[];
}

/**
 * Default keyword dictionaries
 * Extend these based on observed patterns in research sessions
 */
export const DEFAULT_KEYWORD_DICTIONARIES: KeywordDictionaries = {
  social_media: [
    'twitter',
    'x.com',
    'reddit',
    'linkedin',
    'facebook',
    'instagram',
    'tiktok',
    'youtube comments',
    'discord',
    'slack',
    'telegram',
    'community discussions',
    'user feedback',
    'social engagement',
    'influencer',
    'trending',
    'viral',
    'hashtag',
    'meme',
    'discourse',
  ],
  academic: [
    'arxiv',
    'doi:',
    'peer-reviewed',
    'journal',
    'conference paper',
    'research study',
    'methodology',
    'empirical',
    'statistical analysis',
    'hypothesis',
    'experiment',
    'citation',
    'bibliography',
    'IEEE',
    'ACM',
    'springer',
    'elsevier',
    'scholar.google',
    'pubmed',
    'systematic review',
    'meta-analysis',
    'dataset',
    'benchmark',
  ],
  technical: [
    'github',
    'gitlab',
    'stackoverflow',
    'API',
    'SDK',
    'library',
    'framework',
    'implementation',
    'code',
    'repository',
    'npm',
    'pypi',
    'docker',
    'kubernetes',
    'architecture',
    'microservices',
    'database',
    'authentication',
    'REST',
    'GraphQL',
    'TypeScript',
    'Python',
    'performance',
    'latency',
    'throughput',
    'scalability',
    'deployment',
  ],
  multimodal: [
    'youtube',
    'video',
    'tutorial',
    'demo',
    'walkthrough',
    'screenshot',
    'visualization',
    'diagram',
    'infographic',
    'animation',
    'GIF',
    'conference talk',
    'presentation',
    'webinar',
    'podcast',
    'audio',
    'image',
    'visual',
    'graphic',
    'chart',
    'graph',
    'illustration',
  ],
  security: [
    'vulnerability',
    'CVE',
    'exploit',
    'penetration test',
    'security audit',
    'threat',
    'malware',
    'ransomware',
    'phishing',
    'OWASP',
    'CVSS',
    'zero-day',
    'patch',
    'firewall',
    'encryption',
    'authentication',
    'authorization',
    'XSS',
    'SQL injection',
    'CSRF',
    'privilege escalation',
  ],
  news: [
    'breaking news',
    'latest',
    'recent',
    'announcement',
    'press release',
    'article',
    'report',
    'journalist',
    'news outlet',
    'coverage',
    'development',
    'update',
    'launched',
    'released',
    'unveiled',
    'today',
    'yesterday',
    'this week',
    'this month',
    '2024',
    '2025',
  ],
};

/**
 * Domain signal detected from agent outputs
 */
export interface DomainSignal {
  /** Domain category */
  domain: DomainName;
  /** Signal strength (weighted count of keyword occurrences) */
  strength: number;
  /** Number of unique keywords matched */
  keywordMatches: number;
  /** Number of agents that contributed to this signal */
  agentCount: number;
  /** Average quality score of contributing agents */
  avgQuality: number;
  /** Recommended specialist agent types for Wave 2 */
  recommendedAgents: AgentType[];
}

/**
 * Aggregate domain signal analysis across all agents
 */
export interface DomainSignalAnalysis {
  /** All detected domain signals */
  signals: DomainSignal[];
  /** Strongest signal (highest strength) */
  primarySignal: DomainSignal | null;
  /** Secondary signals (strength > threshold) */
  secondarySignals: DomainSignal[];
  /** Total signal strength across all domains */
  totalStrength: number;
  /** Recommendations for Wave 2 specialist allocation */
  recommendations: {
    domain: DomainName;
    agentType: AgentType;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
  }[];
}

// ============================================================================
// COVERAGE GAP ANALYSIS TYPES
// ============================================================================

/**
 * Coverage gap reported by an agent in its metadata
 * Extracted from sections: Limited Coverage, Alternative Domains, Tool Gaps
 */
export interface CoverageGap {
  /** Gap identifier (normalized text) */
  gap: string;
  /** Original gap description from agent metadata */
  description: string;
  /** Type of gap */
  type: 'limited_coverage' | 'alternative_domain' | 'tool_gap' | 'platform_gap';
  /** Agent IDs that reported this gap */
  reportedBy: string[];
  /** Priority based on frequency and agent quality */
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Recommended specialist agent type to address this gap */
  specialistType: AgentType | null;
  /** Recommended specialist track */
  specialistTrack: PerspectiveTrack | null;
  /** Specific focus for the specialist perspective */
  specialistFocus: string;
}

/**
 * Aggregate coverage gap analysis
 */
export interface CoverageGapAnalysis {
  /** All identified coverage gaps */
  gaps: CoverageGap[];
  /** High-priority gaps (reported by 2+ agents or single high-quality agent) */
  highPriorityGaps: CoverageGap[];
  /** Medium-priority gaps */
  mediumPriorityGaps: CoverageGap[];
  /** Low-priority gaps */
  lowPriorityGaps: CoverageGap[];
  /** Recommended Wave 2 specialists to fill gaps */
  recommendations: {
    gap: string;
    agentType: AgentType;
    track: PerspectiveTrack;
    focus: string;
  }[];
}

// ============================================================================
// PIVOT DECISION ENGINE TYPES
// ============================================================================

/**
 * Configuration for pivot decision thresholds
 */
export interface PivotDecisionConfig {
  /** Quality score below which agent should be retried/replaced */
  retryThreshold: number; // Default: 40
  /** Average quality below which Wave 2 is considered */
  wave2ConsiderationThreshold: number; // Default: 60
  /** Domain signal strength triggering 3 specialists */
  highSignalThreshold: number; // Default: 150
  /** Domain signal strength triggering 2 specialists */
  mediumSignalThreshold: number; // Default: 100
  /** Minimum number of coverage gaps triggering specialists */
  gapCountThreshold: number; // Default: 2
  /** Platform coverage % below which Wave 2 is triggered */
  platformCoverageThreshold: number; // Default: 0 (any perspective uncovered)
  /** Vendor % threshold (from M10) for rebalancing */
  vendorPercentageThreshold: number; // Default: 40
  /** Independent % minimum (from M10) */
  independentMinimum: number; // Default: 10
}

/**
 * Default pivot decision configuration
 */
export const DEFAULT_PIVOT_CONFIG: PivotDecisionConfig = {
  retryThreshold: 40,
  wave2ConsiderationThreshold: 60,
  highSignalThreshold: 150,
  mediumSignalThreshold: 100,
  gapCountThreshold: 2,
  platformCoverageThreshold: 0,
  vendorPercentageThreshold: 40,
  independentMinimum: 10,
};

/**
 * Specialist perspective recommendation for Wave 2
 */
export interface SpecialistRecommendation {
  /** Agent type to launch */
  agentType: AgentType;
  /** Perspective track */
  track: PerspectiveTrack;
  /** Specific research focus */
  focus: string;
  /** Platforms to prioritize */
  platforms: string[];
  /** Rationale for this specialist */
  rationale: string;
  /** Priority level */
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  /** Source of recommendation */
  source:
    | 'quality_failure'
    | 'domain_signal'
    | 'coverage_gap'
    | 'platform_gap'
    | 'source_imbalance';
}

/**
 * Pivot decision result - whether to launch Wave 2 and with what specialists
 */
export interface PivotDecision {
  /** Whether to launch Wave 2 */
  shouldLaunchWave2: boolean;
  /** Confidence in this decision (0-100) */
  confidence: number;
  /** Rationale for decision (list of reasons) */
  rationale: string[];
  /** All recommended specialists for Wave 2 */
  specialists: SpecialistRecommendation[];
  /** Agent allocation for Wave 2 */
  specialistAllocation: Record<AgentType, number>;
  /** Specific perspectives for Wave 2 specialists */
  perspectives: EnhancedPerspective[];
  /** Decision breakdown by component */
  components: {
    /** Component 1: Agent quality assessment */
    quality: {
      triggered: boolean;
      reason: string;
      failedAgents: string[];
      recommendations: SpecialistRecommendation[];
    };
    /** Component 2: Domain signal detection */
    domainSignals: {
      triggered: boolean;
      reason: string;
      strongSignals: DomainSignal[];
      recommendations: SpecialistRecommendation[];
    };
    /** Component 3: Coverage gap analysis */
    coverageGaps: {
      triggered: boolean;
      reason: string;
      criticalGaps: CoverageGap[];
      recommendations: SpecialistRecommendation[];
    };
    /** Component 4: Platform coverage validation (AD-008) */
    platformCoverage: {
      triggered: boolean;
      reason: string;
      uncoveredPerspectives: string[];
      recommendations: SpecialistRecommendation[];
    };
    /** Component 5: Source quality (M10) */
    sourceQuality: {
      triggered: boolean;
      reason: string;
      qualityGate: QualityGateResult | null;
      recommendations: SpecialistRecommendation[];
    };
  };
}

// ============================================================================
// FILE INPUT/OUTPUT TYPES
// ============================================================================

/**
 * Agent output file metadata (extracted from markdown frontmatter/metadata)
 */
export interface AgentMetadata {
  /** Agent identifier */
  agentId: string;
  /** Agent type */
  agentType: AgentType;
  /** Perspective track */
  track: PerspectiveTrack;
  /** Self-reported confidence (0-100) */
  confidence: number;
  /** Sources cited (URLs) */
  sources: string[];
  /** Limited coverage notes (if any) */
  limitedCoverage?: string;
  /** Alternative domains mentioned */
  alternativeDomains?: string[];
  /** Tool gaps reported */
  toolGaps?: string[];
  /** Platforms searched */
  platformsSearched?: string[];
}

/**
 * Quality analysis input - all files from a research session
 */
export interface QualityAnalysisInput {
  /** Session directory path */
  sessionDir: string;
  /** Wave number (1 or 2) */
  wave: 1 | 2;
  /** Agent output file paths */
  agentFiles: string[];
  /** Track allocation file (from query-analyzer) */
  trackAllocationFile?: string;
  /** Platform coverage file (AD-008) */
  platformCoverageFile?: string;
  /** Source quality file (M10) */
  sourceQualityFile?: string;
}

/**
 * Quality analysis output - comprehensive quality report + pivot decision
 */
export interface QualityAnalysisOutput {
  /** Agent quality scores */
  agentQuality: AgentQualityAggregate;
  /** Domain signal analysis */
  domainSignals: DomainSignalAnalysis;
  /** Coverage gap analysis */
  coverageGaps: CoverageGapAnalysis;
  /** Platform coverage result (if available) */
  platformCoverage: PlatformCoverageResult | null;
  /** Source quality report (if available) */
  sourceQuality: SourceQualityReport | null;
  /** Pivot decision result */
  pivotDecision: PivotDecision;
  /** Session metadata */
  metadata: {
    sessionDir: string;
    wave: number;
    analyzedAt: string;
    agentCount: number;
  };
}

// ============================================================================
// CLI TYPES
// ============================================================================

/**
 * CLI command types
 */
export type CLICommand = 'analyze' | 'score' | 'signals' | 'gaps' | 'pivot' | 'help';

/**
 * CLI arguments
 */
export interface CLIArgs {
  command: CLICommand;
  sessionDir?: string;
  agentFile?: string;
  wave?: 1 | 2;
  output?: 'json' | 'markdown' | 'both';
  verbose?: boolean;
}
