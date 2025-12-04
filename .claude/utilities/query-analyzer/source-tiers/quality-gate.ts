/**
 * Quality Gate Evaluator
 * Part of M10: Source Quality Framework
 *
 * Evaluates research quality and determines rebalancing requirements.
 */

import {
  type AgentSpec,
  INDEPENDENT_MINIMUM,
  type QualityGateResult,
  type SourceQualityReport,
  VENDOR_THRESHOLD,
} from './types';

/**
 * Evaluate quality gate and determine required rebalancing agents
 *
 * @param report - SourceQualityReport from balance analyzer
 * @returns QualityGateResult with pass/fail and required agents
 */
export function evaluateQualityGate(report: SourceQualityReport): QualityGateResult {
  const triggers: string[] = [];
  const requiredAgents: AgentSpec[] = [];

  // Check vendor heavy (>40%)
  if (report.vendorPercentage > VENDOR_THRESHOLD) {
    triggers.push('vendor_heavy');
    requiredAgents.push({
      track: 'independent',
      focus:
        'Find independent sources to balance vendor-heavy research. Seek academic papers, standards body publications, and independent researcher perspectives.',
      sourcePriority: ['tier1_independent', 'tier2_quasi'],
    });
  }

  // Check low independent (<10%)
  if (report.independentPercentage < INDEPENDENT_MINIMUM) {
    triggers.push('low_independent');
    requiredAgents.push({
      track: 'independent',
      focus:
        'Specifically seek Tier 1 academic and standards body sources. Look in arxiv, NIST, IEEE, ACM, OWASP.',
      sourcePriority: ['tier1_independent'],
    });
  }

  // Check for suspect sources
  if (report.tierBreakdown.tier4_suspect > 0) {
    triggers.push('suspect_present');
    // Don't spawn agent, but flag for review
  }

  // Check for missing contrarian perspective
  // This requires checking if any contrarian track agents were spawned
  // For now, we'll add a contrarian agent if vendor content is high
  if (report.vendorPercentage > 0.5) {
    triggers.push('needs_contrarian');
    requiredAgents.push({
      track: 'contrarian',
      focus:
        'Find opposing viewpoints and critics. Search for skeptics, criticism, and failure analyses.',
      sourcePriority: ['tier1_independent', 'tier2_quasi'],
    });
  }

  // Check for no Tier 1 sources
  if (report.tierBreakdown.tier1_independent === 0 && report.totalSources > 0) {
    triggers.push('no_tier1');
    if (!requiredAgents.find((a) => a.track === 'independent')) {
      requiredAgents.push({
        track: 'independent',
        focus:
          'Add at least one Tier 1 source. Look for academic papers or standards body publications.',
        sourcePriority: ['tier1_independent'],
      });
    }
  }

  return {
    passed: triggers.length === 0,
    triggers,
    requiredAgents,
  };
}

/**
 * Generate agent specifications for rebalancing
 */
export function generateRebalancingAgentSpecs(
  triggers: string[],
  originalQuery: string
): AgentSpec[] {
  const specs: AgentSpec[] = [];

  if (triggers.includes('vendor_heavy') || triggers.includes('low_independent')) {
    specs.push({
      track: 'independent',
      focus: `Research "${originalQuery}" using ONLY Tier 1 sources. Look in academic databases, standards bodies, and independent researchers.`,
      sourcePriority: ['tier1_independent'],
    });
  }

  if (triggers.includes('needs_contrarian')) {
    specs.push({
      track: 'contrarian',
      focus: `Find contrarian perspectives on "${originalQuery}". Search for: "${originalQuery} criticism", "${originalQuery} risks", "${originalQuery} problems".`,
      sourcePriority: ['tier1_independent', 'tier2_quasi'],
    });
  }

  return specs;
}

/**
 * Check if rebalancing should be attempted
 * Max 1 retry to prevent loops
 */
export function shouldAttemptRebalancing(
  report: SourceQualityReport,
  previousAttempts = 0
): { shouldRebalance: boolean; reason: string } {
  if (previousAttempts >= 1) {
    return {
      shouldRebalance: false,
      reason: 'Maximum rebalancing attempts (1) reached. Proceeding with quality warnings.',
    };
  }

  const gate = evaluateQualityGate(report);

  if (gate.passed) {
    return {
      shouldRebalance: false,
      reason: 'Quality gate passed. No rebalancing needed.',
    };
  }

  if (gate.requiredAgents.length === 0) {
    return {
      shouldRebalance: false,
      reason: 'Quality issues detected but no actionable rebalancing available.',
    };
  }

  return {
    shouldRebalance: true,
    reason: `Quality gate failed: ${gate.triggers.join(', ')}. Spawning ${gate.requiredAgents.length} rebalancing agent(s).`,
  };
}

/**
 * Generate markdown summary for quality gate decision
 */
export function generateQualityGateMarkdown(
  report: SourceQualityReport,
  gateResult: QualityGateResult
): string {
  const lines: string[] = [
    '## Quality Gate Evaluation',
    '',
    `**Status:** ${gateResult.passed ? '✅ PASSED' : '❌ FAILED'}`,
    '',
    '### Checks Performed',
    `- Vendor ≤40%: ${report.vendorPercentage <= 0.4 ? '✅' : '❌'} (actual: ${(report.vendorPercentage * 100).toFixed(0)}%)`,
    `- Independent ≥10%: ${report.independentPercentage >= 0.1 ? '✅' : '❌'} (actual: ${(report.independentPercentage * 100).toFixed(0)}%)`,
    `- No Tier 4: ${report.tierBreakdown.tier4_suspect === 0 ? '✅' : '⚠️'} (count: ${report.tierBreakdown.tier4_suspect})`,
    '',
  ];

  if (gateResult.triggers.length > 0) {
    lines.push(`**Triggers:** ${gateResult.triggers.join(', ')}`);
    lines.push('');
  }

  if (gateResult.requiredAgents.length > 0) {
    lines.push('### Required Rebalancing Agents');
    gateResult.requiredAgents.forEach((agent, i) => {
      lines.push(`${i + 1}. **${agent.track.toUpperCase()} Track Agent**`);
      lines.push(`   - Focus: ${agent.focus}`);
      lines.push(`   - Source Priority: ${agent.sourcePriority.join(', ')}`);
    });
  }

  return lines.join('\n');
}
