/**
 * Balance Analyzer
 * Part of M10: Source Quality Framework
 *
 * Analyzes source distribution and generates quality reports.
 */

import { classifyMultiple } from './tier-classifier';
import { INDEPENDENT_MINIMUM, type SourceQualityReport, VENDOR_THRESHOLD } from './types';

/**
 * Extract URLs from markdown/text content
 * Finds all http/https URLs in the text
 */
export function extractUrlsFromContent(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s\)\]\>\"\']+/gi;
  const matches = content.match(urlRegex) || [];
  // Clean trailing punctuation
  return matches.map((url) => url.replace(/[.,;:!?\)]+$/, ''));
}

/**
 * Analyze source balance from a list of URLs
 *
 * @param urls - Array of source URLs
 * @returns SourceQualityReport with tier breakdown and recommendations
 */
export function analyzeSourceBalance(urls: string[]): SourceQualityReport {
  if (urls.length === 0) {
    return {
      totalSources: 0,
      tierBreakdown: {
        tier1_independent: 0,
        tier2_quasi: 0,
        tier3_vendor: 0,
        tier4_suspect: 0,
      },
      vendorPercentage: 0,
      independentPercentage: 0,
      flags: ['NO_SOURCES'],
      recommendations: ['No sources to analyze'],
    };
  }

  const result = classifyMultiple(urls);
  const { byTier, vendorPercentage, independentPercentage } = result.summary;

  const flags: string[] = [];
  const recommendations: string[] = [];

  // Check vendor threshold (>40%)
  if (vendorPercentage > VENDOR_THRESHOLD) {
    flags.push('VENDOR_HEAVY');
    recommendations.push(
      `Vendor content at ${(vendorPercentage * 100).toFixed(0)}% exceeds ${VENDOR_THRESHOLD * 100}% threshold. Consider Wave 2 with independent track emphasis.`
    );
  }

  // Check independent minimum (<10%)
  if (independentPercentage < INDEPENDENT_MINIMUM) {
    flags.push('LOW_INDEPENDENT');
    recommendations.push(
      `Independent sources at ${(independentPercentage * 100).toFixed(0)}% below ${INDEPENDENT_MINIMUM * 100}% minimum. Seek more academic/standards sources.`
    );
  }

  // Check for suspect sources
  if (byTier.tier4_suspect > 0) {
    flags.push('SUSPECT_SOURCES');
    recommendations.push(
      `${byTier.tier4_suspect} sources from Tier 4 (suspect). Review and potentially remove SEO/affiliate content.`
    );
  }

  // Check for single-tier dominance (>60% any tier)
  const maxTierCount = Math.max(...Object.values(byTier));
  if (maxTierCount > urls.length * 0.6) {
    flags.push('SINGLE_TIER_DOMINANT');
    recommendations.push(
      'Over 60% of sources from single tier. Consider diversifying source types.'
    );
  }

  // Check for no Tier 1 sources
  if (byTier.tier1_independent === 0) {
    flags.push('NO_TIER1');
    recommendations.push(
      'No Tier 1 (independent) sources found. Consider adding academic or standards body references.'
    );
  }

  return {
    totalSources: urls.length,
    tierBreakdown: byTier,
    vendorPercentage,
    independentPercentage,
    flags,
    recommendations,
  };
}

/**
 * Analyze content directly (extracts URLs first)
 */
export function analyzeContentBalance(content: string): SourceQualityReport {
  const urls = extractUrlsFromContent(content);
  return analyzeSourceBalance(urls);
}

/**
 * Check if report passes quality gate
 */
export function passesQualityGate(report: SourceQualityReport): {
  passed: boolean;
  criticalFlags: string[];
  warningFlags: string[];
} {
  const criticalFlags = report.flags.filter((f) =>
    ['VENDOR_HEAVY', 'LOW_INDEPENDENT', 'NO_SOURCES'].includes(f)
  );
  const warningFlags = report.flags.filter((f) =>
    ['SUSPECT_SOURCES', 'SINGLE_TIER_DOMINANT', 'NO_TIER1'].includes(f)
  );

  return {
    passed: criticalFlags.length === 0,
    criticalFlags,
    warningFlags,
  };
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(report: SourceQualityReport): string {
  const {
    tierBreakdown,
    totalSources,
    vendorPercentage,
    independentPercentage,
    flags,
    recommendations,
  } = report;

  const lines: string[] = [
    '## Source Quality Report',
    '',
    '| Tier | Count | Percentage |',
    '|------|-------|------------|',
    `| Tier 1 (Independent) | ${tierBreakdown.tier1_independent} | ${((tierBreakdown.tier1_independent / totalSources) * 100 || 0).toFixed(0)}% |`,
    `| Tier 2 (Quasi-Independent) | ${tierBreakdown.tier2_quasi} | ${((tierBreakdown.tier2_quasi / totalSources) * 100 || 0).toFixed(0)}% |`,
    `| Tier 3 (Vendor) | ${tierBreakdown.tier3_vendor} | ${((tierBreakdown.tier3_vendor / totalSources) * 100 || 0).toFixed(0)}% |`,
    `| Tier 4 (Suspect) | ${tierBreakdown.tier4_suspect} | ${((tierBreakdown.tier4_suspect / totalSources) * 100 || 0).toFixed(0)}% |`,
    '',
    `**Total Sources:** ${totalSources}`,
    `**Vendor Percentage:** ${(vendorPercentage * 100).toFixed(0)}%`,
    `**Independent Percentage:** ${(independentPercentage * 100).toFixed(0)}%`,
    '',
  ];

  if (flags.length > 0) {
    lines.push(`**Flags:** ${flags.join(', ')}`);
  } else {
    lines.push('**Flags:** None');
  }

  if (recommendations.length > 0) {
    lines.push('', '**Recommendations:**');
    recommendations.forEach((r) => lines.push(`- ${r}`));
  }

  const gate = passesQualityGate(report);
  lines.push('', '### Quality Gate Assessment');
  lines.push(`- **Status:** ${gate.passed ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`- Vendor threshold (≤40%): ${vendorPercentage <= 0.4 ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(
    `- Independent minimum (≥10%): ${independentPercentage >= 0.1 ? '✅ PASS' : '❌ FAIL'}`
  );
  lines.push(
    `- Suspect sources (0): ${tierBreakdown.tier4_suspect === 0 ? '✅ PASS' : '⚠️ WARNING'}`
  );

  return lines.join('\n');
}
