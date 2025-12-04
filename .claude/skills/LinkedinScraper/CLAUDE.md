# LinkedIn Content Extractor - Complete Documentation

## Overview

This skill provides comprehensive LinkedIn data extraction capabilities using Apify MCP. It enables automatic retrieval of posts, profiles, and company data without requiring LinkedIn cookies or authentication credentials.

**Core Philosophy:**
- Automatic routing of LinkedIn URLs to appropriate Apify actors
- Transparent cost tracking and error handling
- Multi-format output (JSON, markdown, custom)
- Sub-agent compatible (interns, engineers can use independently)
- Research-focused with emphasis on data preservation

## Architecture

```
User/Agent Request
    ↓
LinkedIn URL Detection & Type Classification
    ↓
Actor Selection (Posts/Profiles/Companies)
    ↓
Apify MCP Integration
    ↓
Data Retrieval & Processing
    ↓
Format Conversion (JSON → Markdown/Custom)
    ↓
Output Delivery (Dataset/Files/Inline)
```

## Apify Actors Detailed Comparison

### Post Extractors

#### 1. supreme_coder/linkedin-post ⭐ RECOMMENDED
**Use when:** General post extraction, batch processing, mixed URL types

**Strengths:**
- Handles multiple input types (post URLs, profiles, companies, searches)
- Lowest cost per post ($0.001)
- Highest success rate (99.9%)
- Fast execution
- No cookies required

**Input Schema:**
```json
{
  "urls": [
    "https://linkedin.com/posts/username-postid",
    "https://linkedin.com/in/username",
    "https://linkedin.com/company/companyname"
  ],
  "limitPerSource": 10,
  "scrapeUntil": "2025-01-01",
  "deepScrape": true,
  "rawData": false
}
```

**Output Fields:**
- `type`: "image", "video", "article", "text"
- `text`: Full post content
- `images`: Array of image URLs
- `url`: LinkedIn post URL
- `author`: {firstName, lastName, occupation, publicId, picture}
- `numLikes`, `numComments`, `numShares`
- `reactions`: Array of detailed reactions with profiles
- `postedAtISO`: ISO timestamp
- `timeSincePosted`: Human-readable time

**Limitations:**
- Comments not included (only comment count)
- Video content limited to URL only

#### 2. apimaestro/linkedin-profile-posts
**Use when:** Focused profile extraction with high volume

**Strengths:**
- Reliable for profile-specific posts
- Good documentation
- Large user base (10,699 users)

**Cost:** $5 per 1000 posts
**Success Rate:** 98.4%

#### 3. harvestapi/linkedin-post-search
**Use when:** Advanced search with filters

**Strengths:**
- 5.0 rating (highest)
- Advanced filtering
- Fast concurrency
- Clean data structure

**Cost:** $2 per 1000 posts
**Success Rate:** 99.9%

### Profile Extractors

#### apimaestro/linkedin-profile-detail
**Use when:** Need detailed profile info + email

**Output includes:**
- Work experience (complete history)
- Education details
- Skills and endorsements
- Certifications
- Location data
- Contact information (email when available)
- Recommendations

**Cost:** $5 per 1000 profiles
**Success Rate:** 100%

### Company Extractors

#### apimaestro/linkedin-company-posts
**Use when:** Monitoring company announcements

**Output includes:**
- All company posts
- Post content and media
- Engagement metrics
- Company metadata

**Cost:** $5 per 1000 posts
**Success Rate:** 97.5%
**Rating:** 4.99/5

## Workflow Patterns

### Pattern 1: Single Post Quick Extraction

**Trigger:** User provides single LinkedIn post URL

```typescript
// 1. Detect URL type
const urlType = detectLinkedInUrlType(url)

// 2. Call actor
const result = await mcp__apify__call_actor({
  actor: "supreme_coder/linkedin-post",
  step: "call",
  input: {
    urls: [url],
    limitPerSource: 1,
    deepScrape: true,
    rawData: false
  }
})

// 3. Return structured data immediately
return result.data[0]
```

**Expected duration:** 5-15 seconds
**Cost:** $0.001

### Pattern 2: Batch Processing from File

**Trigger:** User provides file with multiple URLs

```typescript
// 1. Read file
const urls = readFileLines('linkedin-posts.txt')

// 2. Validate URLs
const validUrls = urls.filter(isValidLinkedInUrl)

// 3. Batch in groups of 100 (Apify recommendation)
const batches = chunk(validUrls, 100)

// 4. Process each batch
for (const batch of batches) {
  const result = await mcp__apify__call_actor({
    actor: "supreme_coder/linkedin-post",
    step: "call",
    input: {
      urls: batch,
      limitPerSource: 1,
      deepScrape: true
    }
  })

  // 5. Retrieve and store results
  const data = await mcp__apify__get_actor_output({
    datasetId: result.datasetId,
    limit: 100
  })

  processAndStore(data)
}
```

**Expected duration:** ~1 second per post
**Cost:** $0.001 per post

### Pattern 3: Profile Post History Extraction

**Trigger:** User wants all posts from specific LinkedIn profile

```typescript
// 1. Call with profile URL
const result = await mcp__apify__call_actor({
  actor: "supreme_coder/linkedin-post",
  step: "call",
  input: {
    urls: ["https://linkedin.com/in/username"],
    limitPerSource: 100,  // Adjust based on need
    scrapeUntil: "2024-01-01",  // Optional date filter
    deepScrape: true
  }
})

// 2. Get all posts
const posts = await mcp__apify__get_actor_output({
  datasetId: result.datasetId
})
```

**Expected duration:** ~2-5 seconds per post
**Cost:** $0.001-0.002 per post

### Pattern 4: Company Monitoring

**Trigger:** User wants to monitor company updates

```typescript
// 1. Call with company URL
const result = await mcp__apify__call_actor({
  actor: "supreme_coder/linkedin-post",
  step: "call",
  input: {
    urls: ["https://linkedin.com/company/company-name"],
    limitPerSource: 50,
    deepScrape: true
  }
})

// 2. Process and filter for announcements
const posts = await mcp__apify__get_actor_output({
  datasetId: result.datasetId
})

// 3. Filter for official announcements vs reposts
const announcements = posts.filter(p => p.rootShare === true)
```

### Pattern 5: Search-Based Extraction

**Trigger:** User wants posts by keyword/topic

```typescript
// 1. Build LinkedIn search URL
const searchUrl = buildLinkedInSearchUrl({
  keywords: "artificial intelligence",
  datePosted: "past-24h",
  sortBy: "relevance"
})

// 2. Extract search results
const result = await mcp__apify__call_actor({
  actor: "supreme_coder/linkedin-post",
  step: "call",
  input: {
    urls: [searchUrl],
    limitPerSource: 100,
    deepScrape: true
  }
})
```

## Markdown Conversion

### Standard Format

```markdown
---
title: "[First 60 chars of post or extracted title]"
author: [Author Name]
author_title: [Author Occupation]
author_profile: [LinkedIn Profile URL]
date: [YYYY-MM-DD]
posted_at: [ISO Timestamp]
linkedin_url: [Original Post URL]
post_id: [Extracted Post ID]
engagement:
  likes: [Count]
  comments: [Count]
  shares: [Count]
  total_reactions: [Count]
type: [image/video/article/text]
has_media: [true/false]
tags: [auto-extracted or manual]
extracted_at: [ISO Timestamp]
---

# [Post Title or First Line]

[Post content with proper paragraph breaks]

## Media

![Image 1](./attachments/[post-id]-1.jpg)
![Image 2](./attachments/[post-id]-2.jpg)

## Links

- [Link 1 Title](URL)
- [Link 2 Title](URL)

## Engagement

**Reactions:** [likes count] likes, [comments count] comments, [shares count] shares

### Top Reactions
- [Name 1] ([Title 1]) - [Reaction Type]
- [Name 2] ([Title 2]) - [Reaction Type]
- ...

---

*Posted by [Author Name] ([Author Title]) on [Human-readable date]*
*Extracted: [Human-readable date]*
```

### Filename Convention

**Default:** `[YYYY-MM-DD]-[author-username]-[post-id].md`

**Examples:**
- `2025-11-24-johndoe-7398771014769459200.md`
- `2025-11-24-company-announcement.md`

**Alternative patterns available:**
- Post ID only: `7398771014769459200.md`
- Date + topic: `2025-11-24-ai-announcement.md`
- Custom via template

### Image Handling

**Download strategy:**
```typescript
async function downloadImages(post, outputDir) {
  const imageDir = path.join(outputDir, 'attachments')
  await fs.mkdir(imageDir, { recursive: true })

  const localImages = []

  for (const [index, imageUrl] of post.images.entries()) {
    const filename = `${post.urn}-${index}.jpg`
    const filepath = path.join(imageDir, filename)

    await downloadFile(imageUrl, filepath)
    localImages.push(`./attachments/${filename}`)
  }

  return localImages
}
```

**Video handling:**
- Videos not downloaded (large files)
- Keep as external LinkedIn CDN links
- Include video thumbnail if available

## Error Handling & Edge Cases

### Common Errors

#### 1. Post Deleted or Made Private
```json
{
  "error": "Post not found",
  "url": "...",
  "status": "failed"
}
```

**Response:** Log error, skip post, continue processing

#### 2. Rate Limiting
Apify handles automatically with:
- Built-in throttling
- Request queuing
- Automatic retries

**Response:** Trust Apify, don't implement custom rate limiting

#### 3. Insufficient Credits
```
Error: Insufficient Apify credits
```

**Response:** Alert user, provide credit balance, suggest topping up

#### 4. Invalid URL Format
```
Error: Invalid LinkedIn URL
```

**Response:** Validate URLs before sending to Apify, provide clear feedback

### Edge Cases

#### Empty or Minimal Posts
Some posts have no text, just images/video:
```json
{
  "text": "",
  "images": ["..."],
  "type": "image"
}
```

**Handling:** Use image alt text or first comment as title

#### Reposts Without Commentary
```json
{
  "text": "",
  "repostAuthor": "...",
  "originalText": "..."
}
```

**Handling:** Include both reposter info and original content

#### Deleted Author Profiles
```json
{
  "author": {
    "firstName": "LinkedIn",
    "lastName": "Member"
  }
}
```

**Handling:** Mark as "[Deleted User]" in markdown

#### Non-English Content
Actor returns text as-is, no translation

**Handling:** Preserve original, optionally add language tag to frontmatter

## Cost Tracking

### Real-Time Cost Calculation

```typescript
interface CostTracker {
  totalPosts: number
  successfulExtractions: number
  failedExtractions: number
  estimatedCost: number
  actualCost?: number  // from Apify API
}

function calculateCost(extractCount: number, actor: string): number {
  const rates = {
    'supreme_coder/linkedin-post': 0.001,
    'apimaestro/linkedin-profile-posts': 0.005,
    'harvestapi/linkedin-post-search': 0.002
  }

  return extractCount * rates[actor]
}
```

### Batch Cost Reporting

After each batch, report:
```
✓ Extracted 47 posts
✗ Failed: 3 posts (deleted/private)
💰 Cost: $0.047
⏱️  Duration: 52 seconds
📊 Success rate: 94%
```

## Sub-Agent Integration

### Delegating to Interns

```markdown
Task: Extract and archive LinkedIn posts about technology trends

Context:
- File: ~/data/tech-posts.txt (contains 150 URLs)
- Output: ~/vault/research/technology/

Instructions:
1. Use linkedin-scraper skill
2. Actor: supreme_coder/linkedin-post
3. Batch size: 50 posts at a time
4. deepScrape: true
5. Convert to markdown with images
6. Filename: [date]-[author]-[topic].md
7. Report errors and cost after each batch

Expected cost: ~$0.15 total
Expected duration: 3-5 minutes
```

### Engineer Agent Usage

```markdown
Task: Build automated LinkedIn monitoring system

Requirements:
1. Monitor 20 industry profiles
2. Extract new posts daily
3. Save to local storage
4. Generate weekly summary report

Implementation:
- Use linkedin-scraper skill for extraction
- Store last_extracted timestamp per profile
- Use scrapeUntil parameter for efficient updates
- Generate markdown summary with engagement stats
```

## Research Use Cases

### 1. Industry Intelligence Gathering

**Objective:** Monitor industry professionals for new insights

```typescript
const industryExperts = [
  'https://linkedin.com/in/expert1',
  'https://linkedin.com/in/expert2',
  // ...
]

// Extract recent posts (last 7 days)
const posts = await extractProfiles(industryExperts, {
  scrapeUntil: sevenDaysAgo(),
  limitPerSource: 50
})

// Filter for relevant content
const insights = posts.filter(p =>
  containsKeywords(p.text, ['innovation', 'trends', 'technology'])
)

// Archive with categorization
await archiveWithTags(insights, ['industry-insights', 'research'])
```

### 2. Company Intelligence

**Objective:** Track competitor announcements and activity

```typescript
const competitors = [
  'https://linkedin.com/company/competitor1',
  'https://linkedin.com/company/competitor2'
]

// Extract company posts
const posts = await extractPosts(competitors, {
  limitPerSource: 100,
  deepScrape: true
})

// Categorize by type
const announcements = posts.filter(isProductAnnouncement)
const updates = posts.filter(isCompanyUpdate)

// Generate intelligence report
await generateReport({
  announcements,
  updates,
  engagementTrends: calculateEngagement(posts)
})
```

### 3. Topic Tracking

**Objective:** Archive posts related to specific topic/event

```typescript
// Search for topic-related posts
const searchUrl = buildSearchUrl({
  keywords: 'machine learning deployment',
  datePosted: 'past-week'
})

const posts = await extractPosts([searchUrl], {
  limitPerSource: 200
})

// Build timeline
const timeline = posts
  .sort((a, b) => a.postedAtTimestamp - b.postedAtTimestamp)
  .map(createTimelineEntry)

await saveTimeline('ml-deployment-trends', timeline)
```

## Best Practices

### 1. Always Use deepScrape for Complete Data
```typescript
// ✅ Good
input: { deepScrape: true }

// ❌ Bad (missing reactions, detailed engagement)
input: { deepScrape: false }
```

### 2. Set Reasonable Limits
```typescript
// ✅ Good - prevents runaway costs
input: { limitPerSource: 50 }

// ❌ Bad - could extract thousands of posts
input: { limitPerSource: 99999 }
```

### 3. Validate URLs Before Processing
```typescript
// ✅ Good
const validUrls = urls.filter(isValidLinkedInUrl)
await extract(validUrls)

// ❌ Bad - wastes API calls on invalid URLs
await extract(urls)
```

### 4. Cache Results Appropriately
```typescript
// ✅ Good - cache for 24 hours
const cacheKey = `linkedin:${postId}`
const cached = await cache.get(cacheKey)
if (cached) return cached

const data = await extract(url)
await cache.set(cacheKey, data, '24h')
```

### 5. Handle Errors Gracefully
```typescript
// ✅ Good
try {
  const data = await extract(url)
  return data
} catch (error) {
  log.error('Extraction failed', { url, error })
  return null  // Continue processing other URLs
}

// ❌ Bad - crashes entire batch
const data = await extract(url)  // No error handling
```

## Troubleshooting

### Issue: "Actor not found"
**Cause:** Typo in actor name or actor removed from Apify Store

**Solution:**
```typescript
// Verify actor exists
await mcp__apify__fetch_actor_details({ actor: "supreme_coder/linkedin-post" })
```

### Issue: Empty dataset returned
**Cause:** Post deleted, private, or invalid URL

**Solution:** Check actor logs in Apify console for specific error

### Issue: Incomplete data (missing fields)
**Cause:** `deepScrape: false` or post type doesn't support certain fields

**Solution:** Always use `deepScrape: true`, handle missing fields gracefully

### Issue: Slow extraction (>5 seconds per post)
**Cause:** Network latency, Apify server load, or LinkedIn throttling

**Solution:** Normal behavior, no action needed. Apify handles optimization.

### Issue: High failure rate
**Cause:** Many deleted/private posts in input list

**Solution:** Filter results, track failures separately, report to user

## Integration Examples

### With Fabric Patterns

```typescript
// Extract post
const post = await extractLinkedInPost(url)

// Extract insights with fabric
const insights = await fabric('extract_wisdom', post.text)

// Save enriched markdown
await saveMarkdown({
  ...post,
  fabricInsights: insights
})
```

### With Research Skill

```typescript
// Research task needs LinkedIn context
const task = "Research AI deployment strategies"

// Automatically extract relevant posts
const linkedinPosts = await searchLinkedInPosts('AI deployment')

// Provide as context to research agents
await conductResearch(task, {
  additionalContext: linkedinPosts
})
```

### With Local Storage

```typescript
// Auto-organize by topic
const post = await extractLinkedInPost(url)
const topic = extractTopic(post.text)
const vault_path = `~/vault/linkedin/${topic}/`

await saveMarkdown(post, vault_path)
```

---

## Quick Reference Card

```
🎯 Recommended Actor: supreme_coder/linkedin-post
💰 Cost: $0.001 per post
✅ Success Rate: 99.9%
⚡ Speed: ~5-15 seconds per post
🔧 Use deepScrape: true
📦 Batch size: 50-100 URLs
🏷️  Output: JSON → Markdown
💾 Cache: 24 hours recommended
```

**MCP Tools:**
- `mcp__apify__search-actors` - Find actors
- `mcp__apify__fetch-actor-details` - Get schema
- `mcp__apify__call-actor` - Run extraction
- `mcp__apify__get-actor-output` - Retrieve data

**File Locations:**
- Skill: `${PAI_DIR}/skills/LinkedinScraper/`
- Output default: `~/vault/linkedin/`
- Cache: `.cache/linkedin/`

---

**This documentation provides complete context for automatic LinkedIn data extraction across all {{DA}} agents and use cases.**
