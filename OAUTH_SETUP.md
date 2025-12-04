# PAI OAuth Setup Guide

This document covers OAuth authentication setup for LLM-powered tools in PAI.

---

## CRITICAL: First Thing After Cloning

**Before using any LLM-powered features, you MUST authenticate with BOTH Anthropic AND Google:**

### Step 1: Anthropic OAuth (for Claude)

```bash
bun <your-path>/.claude/utilities/query-analyzer/query-analyzer.ts --auth
```

This opens your browser for Anthropic OAuth. Paste the authorization code when prompted.

**Alternative:** Set API key instead (no interactive auth needed):
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Step 2: Google OAuth (for Gemini)

```bash
<your-path>/.claude/agents/clients/gemini-oauth/gemini-oauth --login
```

This opens your browser for Google OAuth. Follow the prompts to authorize.

**Note:** Gemini is optional for ensemble mode - if auth fails, the system continues with Claude + Keyword only.

### Why This Matters

Without authentication, LLM-powered commands will either:
- Hang indefinitely waiting for input (legacy behavior)
- Exit with clear instructions (current behavior after 2025-11-27 fix)

The system now prints actionable instructions with full paths when auth fails.

---

## Query Analyzer OAuth Setup

The Query Analyzer tool (`.claude/utilities/query-analyzer/`) uses Claude Haiku for semantic query analysis. This requires OAuth authentication with Anthropic.

### Prerequisites

- Bun runtime installed
- Anthropic account with OAuth access

### First-Time Setup

**IMPORTANT:** Run OAuth setup BEFORE launching Claude Code. The authentication flow requires terminal access for pasting the authorization code.

```bash
# Navigate to the query analyzer directory
cd <your-path>/.claude/utilities/query-analyzer

# Run OAuth setup
bun query-analyzer.ts --auth
```

This will:
1. Open your browser to Anthropic's authorization page
2. Prompt you to paste the authorization code
3. Save the OAuth token to `~/.config/PAI/.anthropic_oauth`

### What Happens During Auth

1. **Browser opens** to `https://claude.ai/oauth/authorize`
2. **Log in** to your Anthropic account (if not already)
3. **Authorize** the PAI application
4. **Copy** the authorization code shown on the callback page
5. **Paste** the code into the terminal when prompted
6. **Done!** Token is saved and you're ready to use the query analyzer

### Token Storage

OAuth tokens are stored at:
```
~/.config/PAI/.anthropic_oauth
```

The token includes:
- `access_token` - Used for API calls
- `refresh_token` - Used to get new access tokens when they expire
- `expires_at` - Unix timestamp when the token expires

Tokens are automatically refreshed when they expire.

### Alternative: API Key

If you prefer not to use OAuth, you can set the `ANTHROPIC_API_KEY` environment variable instead:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Troubleshooting

**AUTHENTICATION REQUIRED - OAuth token invalid/expired**

As of 2025-11-27, the system now prints clear instructions when auth fails instead of hanging:

```
══════════════════════════════════════════════════════════════════════
AUTHENTICATION REQUIRED - OAuth token invalid/expired
══════════════════════════════════════════════════════════════════════

Reason: [specific reason shown here]

No ANTHROPIC_API_KEY environment variable found.
You must authenticate before using LLM features.

──────────────────────────────────────────────────────────────────────
Option A: Re-authenticate OAuth (interactive, opens browser)
──────────────────────────────────────────────────────────────────────

  bun <your-path>/.claude/utilities/query-analyzer/query-analyzer.ts --auth

  Then paste the authorization code when prompted.

──────────────────────────────────────────────────────────────────────
Option B: Use API key instead (non-interactive)
──────────────────────────────────────────────────────────────────────

  export ANTHROPIC_API_KEY="your-api-key-here"
  bun <your-path>/.claude/utilities/query-analyzer/query-analyzer.ts --perspectives "your query"

══════════════════════════════════════════════════════════════════════
```

**"No OAuth token found and no API key set"**
- Run the full path command to complete OAuth setup:
  ```bash
  bun <your-path>/.claude/utilities/query-analyzer/query-analyzer.ts --auth
  ```
- Or set `ANTHROPIC_API_KEY` environment variable

**"Token exchange failed"**
- The authorization code may have expired (they're single-use)
- Run `--auth` again to get a fresh code

**"Token refresh failed" / "Refresh token not found or invalid"**
- Your refresh token may have been revoked or expired
- Delete the token file and re-authenticate:
  ```bash
  rm ~/.config/PAI/.anthropic_oauth
  bun <your-path>/.claude/utilities/query-analyzer/query-analyzer.ts --auth
  ```

**Browser doesn't open automatically**
- Copy the URL printed in the terminal
- Paste it into your browser manually

**Command hangs with no output (legacy behavior)**
- This was fixed in the 2025-11-27 update
- If you see this, your oauth-client.ts may need updating
- The system now exits with clear instructions instead of hanging

### Using the Query Analyzer

After authentication, you can analyze queries:

```bash
# Perspective-first routing (RECOMMENDED)
bun query-analyzer.ts --perspectives "Research AI agents for enterprise productivity"

# Semantic analysis with Claude Haiku (requires auth)
bun query-analyzer.ts "Research OSINT tools for threat intelligence"

# Multi-model ensemble analysis (Claude + Gemini + Keyword)
bun query-analyzer.ts --ensemble "What's trending on Twitter about AI agents?"

# Keyword-only analysis (no auth required)
bun query-analyzer.ts --fallback "What's trending on Twitter about AI agents?"

# Cache management
bun query-analyzer.ts --cache-stats   # View cache statistics
bun query-analyzer.ts --cache-clear   # Clear cache
bun query-analyzer.ts --no-cache "..."  # Skip cache for this query
```

---

## Analysis Modes

### Perspective-First Routing - RECOMMENDED

The `--perspectives` flag enables intelligent routing that generates research perspectives BEFORE allocating agents:

1. **Single LLM call** generates 4-8 research perspectives with domain classifications
2. **Keyword validation** provides instant sanity check (no API cost)
3. **Selective ensemble** only for uncertain perspectives
4. **Optimal agent allocation** based on perspective-to-agent mapping

**Why it's better:** Routing on raw query is "blind" to research breadth. Perspectives reveal the full surface area, ensuring emergent research paths get proper coverage.

**Performance:** 3-5 seconds typical, 1-4 API calls

### Ensemble Analysis

The `--ensemble` flag runs all three analyzers in parallel (Claude + Gemini + Keyword) for maximum accuracy (~97-98%) through consensus voting.

### Standard Analysis

Without flags, runs Claude Haiku with automatic keyword fallback if LLM fails.

---

**Last Updated:** 2025-12-04
