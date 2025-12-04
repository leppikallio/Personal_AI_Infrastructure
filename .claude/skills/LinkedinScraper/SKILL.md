---
name: LinkedinScraper
description: LinkedIn content extraction using Apify MCP. Retrieves posts, profiles, and company data without cookies or authentication. USE WHEN user requests LinkedIn content, provides LinkedIn URLs, or needs LinkedIn data for research/archiving. Works for main agent and all sub-agents.
---

# LinkedIn Content Extractor

## When to Activate This Skill

**Automatic activation for:**
- "Get LinkedIn content from [URL]"
- "Extract data from LinkedIn post"
- "Retrieve LinkedIn profile/company information"
- Any message containing LinkedIn URLs when context suggests data extraction
- Research requiring LinkedIn data
- Content archiving to local storage

**URL Pattern Detection:**
- `linkedin.com/posts/` - Individual posts
- `linkedin.com/in/` - Personal profiles
- `linkedin.com/company/` - Company pages
- `linkedin.com/search/results/content/` - Post searches

## Quick Start

### Single Post Extraction
```
Input: LinkedIn post URL
Output: JSON with content, author, engagement, images, reactions
Cost: $0.001 per post
```

### Batch Processing
```
Input: File with URLs (one per line) or array of URLs
Output: Dataset with all extracted posts
Cost: $0.001-0.002 per post depending on deepScrape setting
```

### Available Actors

| Actor | Use Case | Cost | Success Rate |
|-------|----------|------|--------------|
| `supreme_coder/linkedin-post` | Posts (direct URLs, profiles, companies, search) | $0.001/post | 99.9% |
| `apimaestro/linkedin-profile-posts` | Posts from specific profiles | $5/1k posts | 98.4% |
| `harvestapi/linkedin-post-search` | Advanced search with filters | $2/1k posts | 99.9% |
| `apimaestro/linkedin-profile-detail` | Profile data + email | $5/1k profiles | 100% |
| `apimaestro/linkedin-company-posts` | Company posts | $5/1k posts | 97.5% |

**Recommended default:** `supreme_coder/linkedin-post` (best value, highest reliability)

## Core Workflow

### 1. Detect LinkedIn Content Need
- Check if user provided LinkedIn URLs
- Determine type: post, profile, company, search
- Identify output format needed: JSON, markdown, or both

### 2. Select Appropriate Actor
```typescript
if (url.includes('/posts/')) {
  actor = 'supreme_coder/linkedin-post'
} else if (url.includes('/in/')) {
  actor = 'apimaestro/linkedin-profile-detail'
} else if (url.includes('/company/')) {
  actor = 'apimaestro/linkedin-company-posts'
}
```

### 3. Call Apify MCP
```typescript
// Fetch actor details first (if needed)
mcp__apify__fetch-actor-details(actor: "supreme_coder/linkedin-post")

// Call actor with input
mcp__apify__call-actor(
  actor: "supreme_coder/linkedin-post",
  step: "call",
  input: {
    urls: ["https://linkedin.com/posts/..."],
    limitPerSource: 10,
    deepScrape: true,  // Get likes, comments, reactions
    rawData: false
  }
)

// Retrieve results
mcp__apify__get-actor-output(datasetId: "...")
```

### 4. Process Results
- Parse JSON output
- Extract relevant fields
- Convert to markdown if requested
- Download images if needed
- Save to specified location

## Data Structure (supreme_coder/linkedin-post)

```json
{
  "type": "image",
  "images": ["https://media.licdn.com/..."],
  "url": "https://www.linkedin.com/posts/...",
  "text": "Post content...",
  "author": {
    "firstName": "...",
    "lastName": "...",
    "occupation": "...",
    "publicId": "...",
    "picture": "..."
  },
  "numLikes": 20,
  "numComments": 0,
  "numShares": 1,
  "reactions": [
    {
      "type": "LIKE",
      "profile": {...}
    }
  ],
  "postedAtISO": "2025-11-24T17:14:32.439Z",
  "inputUrl": "..."
}
```

## Common Use Cases

### 1. Research & Analysis
- Extract posts from industry professionals
- Track company announcements
- Monitor professional discussions
- Archive reference material

### 2. Content Archiving
- Convert posts to markdown
- Download images locally
- Preserve engagement data
- Create knowledge base entries

### 3. Market Intelligence
- Extract posts from target profiles
- Analyze engagement patterns
- Find relevant discussions
- Build research databases

### 4. Competitive Analysis
- Monitor competitor posts
- Track industry thought leaders
- Analyze content strategies
- Measure engagement metrics

## Output Format Options

### JSON (Default)
Raw structured data from Apify - best for programmatic processing

### Markdown (For Local Storage)
```markdown
---
title: "Post title or excerpt"
author: Yaara Shriki
author_title: Threat Researcher @ Wiz
date: 2025-11-24
linkedin_url: https://...
engagement:
  likes: 20
  comments: 0
  shares: 1
tags: [security, npm, supply-chain]
---

# Post Content

[Post text here...]

![Image](./attachments/image.jpg)

**Links:** [Blog](https://...)
```

## Error Handling

**Common issues:**
- **Post deleted/private**: Actor returns empty or error
- **Rate limiting**: Apify handles automatically with built-in throttling
- **Invalid URL**: Actor fails with clear error message
- **Insufficient credits**: Check Apify account balance

**Best practices:**
- Always set `limitPerSource` for batch operations
- Use `deepScrape: true` for complete data
- Handle missing fields gracefully (posts may lack images/links)
- Cache results to avoid redundant requests

## Cost Management

**Typical costs:**
- Single post: $0.001-0.002
- 100 posts: $0.10-0.20
- 1000 posts: $1.00-2.00

**Apify free tier:** Includes some credits for testing

## Sub-Agent Usage

When delegating LinkedIn extraction to sub-agents (interns, engineers):

```markdown
Task: "Extract these 50 LinkedIn posts and convert to markdown"

Instructions:
1. Use linkedin-scraper skill
2. Actor: supreme_coder/linkedin-post
3. Input: [provide URL list]
4. Output: Save markdown files to ~/vault/linkedin/
5. Include: images (download locally), metadata, engagement stats
```

Sub-agents automatically inherit this skill and can use Apify MCP independently.

## Supplementary Resources

**For detailed workflows:**
- Read: `${PAI_DIR}/skills/LinkedinScraper/CLAUDE.md`

**For actor comparison:**
- All LinkedIn actors: `mcp__apify__search-actors(keywords: "LinkedIn")`

**For specific actor details:**
- `mcp__apify__fetch-actor-details(actor: "supreme_coder/linkedin-post")`

## Quick Examples

### Example 1: Single Post
```
User: "Get this LinkedIn post: [URL]"

Action:
1. Detect skill trigger
2. Call supreme_coder/linkedin-post
3. Return JSON with content, author, engagement
```

### Example 2: Batch Processing
```
User: "Extract all URLs in linkedin-posts.txt"

Action:
1. Read file
2. Batch URLs (max 100 per request)
3. Call actor with all URLs
4. Save results as JSON dataset
```

### Example 3: Markdown Conversion
```
User: "Extract these posts and save as markdown"

Action:
1. Extract via Apify
2. Convert JSON to markdown
3. Download images to attachments/
4. Save to specified directory
```

## Integration with Other Skills

- **fabric**: Process extracted content with fabric patterns
- **research**: Aggregate LinkedIn posts for research analysis
- **art**: Create visualizations from engagement data
- **prompting**: Use extracted content as context for AI prompts

---

**This skill enables automatic, reliable LinkedIn data extraction across all {{DA}} agents using Apify MCP.**
