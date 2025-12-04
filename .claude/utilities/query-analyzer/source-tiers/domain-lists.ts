/**
 * Domain Classification Lists
 * Part of M10: Source Quality Framework
 *
 * TIER 1: Independent (highest trust) - academic, standards, researchers, journalism
 * TIER 2: Quasi-Independent (trust with context) - associations, news, non-profits
 * TIER 3: Vendor (valuable but biased) - product vendors, platforms, consultants
 * TIER 4: Suspect (flag for review) - SEO farms, affiliates, aggregators
 */

import type { SourceTier } from './types';

export const TIER1_DOMAINS: string[] = [
  // Academic & Research Institutions
  'arxiv.org',
  'scholar.google.com',
  'acm.org',
  'ieee.org',
  'nature.com',
  'science.org',
  'sciencedirect.com',
  'springer.com',
  'wiley.com',
  'pnas.org',
  'ssrn.com',
  'researchgate.net',
  'semanticscholar.org',
  'pubmed.ncbi.nlm.nih.gov',
  'biorxiv.org',
  'jstor.org',
  'dl.acm.org',
  'papers.nips.cc',
  'openreview.net',
  'jmlr.org',

  // Standards Bodies & Government Research
  'nist.gov',
  'iso.org',
  'w3.org',
  'ietf.org',
  'owasp.org',
  'cisa.gov',
  'enisa.europa.eu',
  'ncsc.gov.uk',
  'nsa.gov',
  'gao.gov',
  'rand.org',
  'cert.org',
  'us-cert.gov',
  'nvd.nist.gov',
  'cve.mitre.org',

  // Independent Security Researchers
  'krebsonsecurity.com',
  'schneier.com',
  'troyhunt.com',
  'simonwillison.net',
  'rachelbythebay.com',
  'lcamtuf.blogspot.com',
  'mattblaze.org',
  'blog.cryptographyengineering.com',
  'trailofbits.github.io',
  'googleprojectzero.blogspot.com',

  // Investigative Journalism & Technical Reporting
  'theintercept.com',
  'propublica.org',
  'wired.com',
  'arstechnica.com',
  'bellingcat.com',
  'citizenlab.ca',

  // University Research Centers
  'ai.stanford.edu',
  'csail.mit.edu',
  'ml.cmu.edu',
  'bair.berkeley.edu',
  'ttic.edu',
];

export const TIER2_DOMAINS: string[] = [
  // Industry Associations (member-funded but open process)
  'cloudsecurityalliance.org',
  'isaca.org',
  'sans.org',
  'isc2.org',
  'mitre.org',
  'cncf.io',
  'linuxfoundation.org',
  'openssf.org',
  'coreinfrastructure.org',
  'apache.org',
  'mozilla.org',
  'python.org',
  'rust-lang.org',
  'nodejs.org',

  // News & Technical Analysis Sites
  'darkreading.com',
  'theregister.com',
  'bleepingcomputer.com',
  'securityweek.com',
  'scmagazine.com',
  'cyberscoop.com',
  'zdnet.com',
  'theverge.com',
  'techcrunch.com',
  'venturebeat.com',
  'protocol.com',
  'siliconangle.com',
  'infoq.com',
  'thenewstack.io',
  'devclass.com',

  // Non-Profit Research & Advocacy
  'eff.org',
  'epic.org',
  'accessnow.org',
  'ainowinstitute.org',
  'algorithmwatch.org',
  'dataprivacyandsecurityinsider.com',

  // Conference Proceedings & Events
  'blackhat.com',
  'defcon.org',
  'usenix.org',
  'rsaconference.com',
  'nipsconference.cc',
  'icml.cc',
  'cvpr.thecvf.com',

  // Developer Communities & Resources
  'stackoverflow.com',
  'github.com',
  'news.ycombinator.com',
  'lobste.rs',
  'lwn.net',
  'phoronix.com',

  // Professional Publications
  'acmqueue.com',
  'ieeexplore.ieee.org',
  'communications.acm.org',
  'dl.acm.org/magazine',
];

export const TIER3_VENDORS: string[] = [
  // Security Vendors
  'crowdstrike.com',
  'paloaltonetworks.com',
  'fortinet.com',
  'checkpoint.com',
  'sentinelone.com',
  'trendmicro.com',
  'mcafee.com',
  'symantec.com',
  'kaspersky.com',
  'sophos.com',
  'zscaler.com',
  'cloudflare.com',
  'snyk.io',
  'tenable.com',
  'rapid7.com',
  'qualys.com',
  'veracode.com',
  'checkmarx.com',
  'imperva.com',
  'proofpoint.com',
  'okta.com',
  'duo.com',
  'auth0.com',

  // Cloud & Infrastructure Vendors
  'aws.amazon.com',
  'cloud.google.com',
  'azure.microsoft.com',
  'docs.microsoft.com',
  'developers.google.com',
  'oracle.com',
  'ibm.com',
  'salesforce.com',
  'vmware.com',
  'redhat.com',
  'hashicorp.com',
  'databricks.com',
  'snowflake.com',
  'mongodb.com',
  'elastic.co',
  'confluent.io',
  'splunk.com',
  'datadog.com',
  'newrelic.com',

  // AI & ML Vendors
  'openai.com',
  'anthropic.com',
  'cohere.com',
  'huggingface.co',
  'deepmind.com',
  'scale.com',
  'wandb.ai',
  'weights-biases.com',
  'roboflow.com',
  'replicate.com',

  // Consulting/Research Firms
  'mckinsey.com',
  'gartner.com',
  'forrester.com',
  'idc.com',
  'deloitte.com',
  'accenture.com',
  'pwc.com',
  'kpmg.com',
  'ey.com',
  'bain.com',
  'bcg.com',

  // AI Security & Specialized Vendors
  'lasso.security',
  'lakera.ai',
  'protectai.com',
  'robust.ai',
  'calypsoai.com',
  'hidden-layer.com',
  'adversa.ai',
  'arthurai.com',
  'fiddler.ai',
];

export const TIER4_SUSPECT: string[] = [
  // SEO Content Farms / Affiliate-Heavy
  'techradar.com',
  'tomsguide.com',
  'pcmag.com',
  'cnet.com',
  'makeuseof.com',
  'howtogeek.com',
  'lifehacker.com',
  'digitaltrends.com',
  'techopedia.com',
  'simplilearn.com',
  'guru99.com',
  'softwaretestinghelp.com',

  // Aggregators with Variable Quality
  'medium.com',
  'dev.to',
  'hackernoon.com',
  'dzone.com',
  'hashnode.com',
  'codementor.io',

  // Known Thin Content / Tutorial Mills
  'geeksforgeeks.org',
  'tutorialspoint.com',
  'w3schools.com',
  'javatpoint.com',
  'programiz.com',
  'studytonight.com',
  'beginnersbook.com',
  'baeldung.com',
  'journaldev.com',
  'mkyong.com',

  // Listicle/Clickbait Focused
  'businessinsider.com',
  'forbes.com/sites', // Contributor network (note: forbes.com main may be tier 2)
  'entrepreneur.com',
  'inc.com',
  'mashable.com',
  'buzzfeed.com',

  // User-Generated with No Review
  'quora.com',
  'reddit.com', // Note: Specific subreddits may be valuable
  'answers.yahoo.com',
  'ask.com',

  // Promotional/Advertorial Sites
  'techrepublic.com',
  'computerworld.com',
  'informationweek.com',
  'itprotoday.com',

  // AI-Generated Content Farms
  'toolify.ai',
  'futuretools.io',
  'aitools.fyi',
  'theresanaiforthat.com',
];

// Helper to get all domains for a tier
export function getDomainsForTier(tier: SourceTier): string[] {
  switch (tier) {
    case 'tier1_independent':
      return TIER1_DOMAINS;
    case 'tier2_quasi':
      return TIER2_DOMAINS;
    case 'tier3_vendor':
      return TIER3_VENDORS;
    case 'tier4_suspect':
      return TIER4_SUSPECT;
  }
}

// Helper to classify a domain by checking all tier lists
export function classifyDomain(domain: string): SourceTier | null {
  const normalizedDomain = domain.toLowerCase().trim();

  if (TIER1_DOMAINS.some((d) => normalizedDomain.includes(d) || d.includes(normalizedDomain))) {
    return 'tier1_independent';
  }
  if (TIER2_DOMAINS.some((d) => normalizedDomain.includes(d) || d.includes(normalizedDomain))) {
    return 'tier2_quasi';
  }
  if (TIER3_VENDORS.some((d) => normalizedDomain.includes(d) || d.includes(normalizedDomain))) {
    return 'tier3_vendor';
  }
  if (TIER4_SUSPECT.some((d) => normalizedDomain.includes(d) || d.includes(normalizedDomain))) {
    return 'tier4_suspect';
  }

  return null;
}

// Get domain counts for reporting
export function getDomainCounts(): Record<SourceTier, number> {
  return {
    tier1_independent: TIER1_DOMAINS.length,
    tier2_quasi: TIER2_DOMAINS.length,
    tier3_vendor: TIER3_VENDORS.length,
    tier4_suspect: TIER4_SUSPECT.length,
  };
}
