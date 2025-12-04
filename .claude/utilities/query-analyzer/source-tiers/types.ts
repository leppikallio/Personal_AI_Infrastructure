/**
 * Source Tier Classification Types
 * Part of M10: Source Quality Framework
 */

export type SourceTier = 'tier1_independent' | 'tier2_quasi' | 'tier3_vendor' | 'tier4_suspect';

export type PerspectiveTrack = 'standard' | 'independent' | 'contrarian';

export interface DomainClassification {
  domain: string;
  tier: SourceTier;
  category: string; // 'academic', 'standards', 'news', 'vendor', 'seo_farm', etc.
  confidence: 'known' | 'inferred' | 'default';
}

export interface SourceQualityReport {
  totalSources: number;
  tierBreakdown: Record<SourceTier, number>;
  vendorPercentage: number;
  independentPercentage: number;
  flags: string[];
  recommendations: string[];
}

export interface TrackAllocation {
  standard: number; // 50% - Normal diverse perspectives
  independent: number; // 25% - Tier 1 source emphasis
  contrarian: number; // 25% - Opposing viewpoints
}

export interface QualityGateResult {
  passed: boolean;
  triggers: string[];
  requiredAgents: AgentSpec[];
}

export interface AgentSpec {
  track: PerspectiveTrack;
  focus: string;
  sourcePriority: SourceTier[];
}

// Configuration constants
export const DEFAULT_TRACK_ALLOCATION: TrackAllocation = {
  standard: 0.5,
  independent: 0.25,
  contrarian: 0.25,
};

export const VENDOR_THRESHOLD = 0.4; // >40% triggers rebalancing
export const INDEPENDENT_MINIMUM = 0.1; // <10% triggers warning
export const TOOL_CALL_BUDGET = 15; // Max tool calls per research task
