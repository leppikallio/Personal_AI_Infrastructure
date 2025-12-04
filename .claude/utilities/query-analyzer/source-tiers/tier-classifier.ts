/**
 * Source Tier Classifier
 * Part of M10: Source Quality Framework
 *
 * Classifies URLs/domains into quality tiers based on domain lists.
 * Implements robust URL parsing, subdomain matching, and aggregate statistics.
 */

import { TIER1_DOMAINS, TIER2_DOMAINS, TIER3_VENDORS, TIER4_SUSPECT } from './domain-lists';
import type { DomainClassification, SourceTier } from './types';

/**
 * Extract the base domain from a URL string
 * Handles various URL formats including those without protocol
 *
 * @param url - URL or domain string (with or without protocol)
 * @returns Normalized domain string (lowercase, without www)
 *
 * @example
 * extractDomain('https://www.arxiv.org/abs/123') // 'arxiv.org'
 * extractDomain('blog.crowdstrike.com') // 'blog.crowdstrike.com'
 * extractDomain('//github.com/user/repo') // 'github.com'
 */
export function extractDomain(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  let cleanUrl = url.trim().toLowerCase();

  // Handle protocol-relative URLs (//example.com)
  if (cleanUrl.startsWith('//')) {
    cleanUrl = `https:${cleanUrl}`;
  }

  // Add protocol if missing (for proper URL parsing)
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  try {
    const urlObj = new URL(cleanUrl);
    let domain = urlObj.hostname;

    // Remove www. prefix if present
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    return domain;
  } catch (_error) {
    // If URL parsing fails, try basic string extraction
    // Remove protocol
    let fallback = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
    // Take everything before first slash or query
    fallback = fallback.split(/[/?#]/)[0];
    return fallback || '';
  }
}

/**
 * Check if a URL matches a domain pattern
 * Handles subdomains: blog.example.com matches example.com
 *
 * @param extractedDomain - The normalized domain from extractDomain()
 * @param pattern - The pattern to match against (from domain lists)
 * @returns true if domain matches pattern (exact or subdomain)
 *
 * @example
 * domainMatches('blog.crowdstrike.com', 'crowdstrike.com') // true
 * domainMatches('crowdstrike.com', 'crowdstrike.com') // true
 * domainMatches('otherdomain.com', 'crowdstrike.com') // false
 */
function domainMatches(extractedDomain: string, pattern: string): boolean {
  // Exact match
  if (extractedDomain === pattern) {
    return true;
  }

  // Subdomain match: blog.example.com matches example.com
  if (extractedDomain.endsWith(`.${pattern}`)) {
    return true;
  }

  return false;
}

/**
 * Determine the specific category for a domain based on its tier
 *
 * @param domain - The domain being classified
 * @param tier - The tier it belongs to
 * @returns Category string describing the type of source
 */
function getDomainCategory(domain: string, tier: SourceTier): string {
  // Academic patterns
  if (
    domain.includes('arxiv') ||
    domain.includes('scholar') ||
    domain.includes('acm.org') ||
    domain.includes('ieee') ||
    domain.includes('nature') ||
    domain.includes('science')
  ) {
    return 'academic';
  }

  // Standards bodies
  if (
    domain.includes('nist') ||
    domain.includes('iso') ||
    domain.includes('w3.org') ||
    domain.includes('ietf') ||
    domain.includes('owasp')
  ) {
    return 'standards';
  }

  // Security researchers
  if (
    domain.includes('krebs') ||
    domain.includes('schneier') ||
    domain.includes('troyhunt') ||
    domain.includes('blog')
  ) {
    return 'researcher';
  }

  // Journalism
  if (
    domain.includes('wired') ||
    domain.includes('arstechnica') ||
    domain.includes('intercept') ||
    domain.includes('propublica')
  ) {
    return 'journalism';
  }

  // News outlets
  if (
    domain.includes('news') ||
    domain.includes('bleeping') ||
    domain.includes('register') ||
    domain.includes('zdnet')
  ) {
    return 'news';
  }

  // Developer communities
  if (
    domain.includes('github') ||
    domain.includes('stackoverflow') ||
    domain.includes('hackernews')
  ) {
    return 'community';
  }

  // Security vendors
  if (tier === 'tier3_vendor') {
    if (
      domain.includes('crowd') ||
      domain.includes('palo') ||
      domain.includes('sentinel') ||
      domain.includes('snyk')
    ) {
      return 'security_vendor';
    }

    // Cloud providers
    if (
      domain.includes('aws') ||
      domain.includes('azure') ||
      domain.includes('google.com') ||
      domain.includes('oracle')
    ) {
      return 'cloud_vendor';
    }

    // AI vendors
    if (
      domain.includes('openai') ||
      domain.includes('anthropic') ||
      domain.includes('huggingface') ||
      domain.includes('cohere')
    ) {
      return 'ai_vendor';
    }

    // Consulting
    if (
      domain.includes('mckinsey') ||
      domain.includes('gartner') ||
      domain.includes('forrester') ||
      domain.includes('deloitte')
    ) {
      return 'consulting';
    }

    return 'vendor';
  }

  // SEO farms and aggregators
  if (tier === 'tier4_suspect') {
    if (domain.includes('medium') || domain.includes('dev.to') || domain.includes('hackernoon')) {
      return 'aggregator';
    }

    if (domain.includes('geeks') || domain.includes('tutorial') || domain.includes('w3schools')) {
      return 'tutorial_mill';
    }

    if (domain.includes('quora') || domain.includes('reddit') || domain.includes('yahoo')) {
      return 'user_generated';
    }

    return 'seo_farm';
  }

  // Default categories by tier
  switch (tier) {
    case 'tier1_independent':
      return 'independent';
    case 'tier2_quasi':
      return 'quasi_independent';
    case 'tier3_vendor':
      return 'vendor';
    case 'tier4_suspect':
      return 'suspect';
  }
}

/**
 * Classify a domain or URL into a source tier
 *
 * @param urlOrDomain - A URL or domain string
 * @returns DomainClassification with tier, category, and confidence
 *
 * @example
 * classifyDomain('https://arxiv.org/abs/123')
 * // { domain: 'arxiv.org', tier: 'tier1_independent', category: 'academic', confidence: 'known' }
 *
 * classifyDomain('blog.crowdstrike.com')
 * // { domain: 'blog.crowdstrike.com', tier: 'tier3_vendor', category: 'security_vendor', confidence: 'known' }
 *
 * classifyDomain('unknown-site.xyz')
 * // { domain: 'unknown-site.xyz', tier: 'tier2_quasi', category: 'quasi_independent', confidence: 'default' }
 */
export function classifyDomain(urlOrDomain: string): DomainClassification {
  const domain = extractDomain(urlOrDomain);

  if (!domain) {
    return {
      domain: '',
      tier: 'tier2_quasi',
      category: 'unknown',
      confidence: 'default',
    };
  }

  // Check Tier 1 (Independent) - highest trust
  for (const pattern of TIER1_DOMAINS) {
    if (domainMatches(domain, pattern)) {
      return {
        domain,
        tier: 'tier1_independent',
        category: getDomainCategory(domain, 'tier1_independent'),
        confidence: 'known',
      };
    }
  }

  // Check Tier 4 (Suspect) - check before Tier 2 to catch known bad actors
  for (const pattern of TIER4_SUSPECT) {
    if (domainMatches(domain, pattern)) {
      return {
        domain,
        tier: 'tier4_suspect',
        category: getDomainCategory(domain, 'tier4_suspect'),
        confidence: 'known',
      };
    }
  }

  // Check Tier 3 (Vendor)
  for (const pattern of TIER3_VENDORS) {
    if (domainMatches(domain, pattern)) {
      return {
        domain,
        tier: 'tier3_vendor',
        category: getDomainCategory(domain, 'tier3_vendor'),
        confidence: 'known',
      };
    }
  }

  // Check Tier 2 (Quasi-Independent)
  for (const pattern of TIER2_DOMAINS) {
    if (domainMatches(domain, pattern)) {
      return {
        domain,
        tier: 'tier2_quasi',
        category: getDomainCategory(domain, 'tier2_quasi'),
        confidence: 'known',
      };
    }
  }

  // Default: Tier 2 with 'default' confidence
  return {
    domain,
    tier: 'tier2_quasi',
    category: 'unknown',
    confidence: 'default',
  };
}

/**
 * Classify multiple URLs and return aggregate statistics
 *
 * @param urls - Array of URLs or domains to classify
 * @returns Object with individual classifications and summary statistics
 *
 * @example
 * const results = classifyMultiple([
 *   'https://arxiv.org/abs/123',
 *   'blog.crowdstrike.com',
 *   'https://medium.com/@user'
 * ]);
 * // results.summary.byTier['tier1_independent'] === 1
 * // results.summary.vendorPercentage === 0.33
 */
export function classifyMultiple(urls: string[]): {
  classifications: DomainClassification[];
  summary: {
    total: number;
    byTier: Record<SourceTier, number>;
    vendorPercentage: number;
    independentPercentage: number;
  };
} {
  const classifications = urls.map((url) => classifyDomain(url));

  const byTier: Record<SourceTier, number> = {
    tier1_independent: 0,
    tier2_quasi: 0,
    tier3_vendor: 0,
    tier4_suspect: 0,
  };

  // Count classifications by tier
  for (const classification of classifications) {
    byTier[classification.tier]++;
  }

  const total = classifications.length;
  const vendorCount = byTier.tier3_vendor;
  const independentCount = byTier.tier1_independent;

  return {
    classifications,
    summary: {
      total,
      byTier,
      vendorPercentage: total > 0 ? vendorCount / total : 0,
      independentPercentage: total > 0 ? independentCount / total : 0,
    },
  };
}

/**
 * Get the category description for a tier
 *
 * @param tier - The source tier
 * @returns Human-readable description of the tier
 */
export function getTierCategory(tier: SourceTier): string {
  switch (tier) {
    case 'tier1_independent':
      return 'Independent (academic, standards, researchers)';
    case 'tier2_quasi':
      return 'Quasi-Independent (associations, news, non-profits)';
    case 'tier3_vendor':
      return 'Vendor (product vendors, platforms, consultants)';
    case 'tier4_suspect':
      return 'Suspect (SEO farms, affiliates, aggregators)';
  }
}
