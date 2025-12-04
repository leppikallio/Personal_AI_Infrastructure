/**
 * OAuth client for Anthropic API
 *
 * Implements PKCE OAuth 2.0 flow for Claude API access
 * Copied directly from claude-search implementation
 */

import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import process from 'node:process';
import readline from 'node:readline/promises';
import { OAuthStorage } from './oauth-storage.ts';
import type { OAuthToken } from './oauth-storage.ts';

const OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const OAUTH_AUTH_URL = 'https://claude.ai/oauth/authorize';
const OAUTH_TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';
const OAUTH_REDIRECT_URL = 'https://console.anthropic.com/oauth/code/callback';
const AUTH_SCOPES = ['org:create_api_key', 'user:profile', 'user:inference'];
const TOKEN_IDENTIFIER = 'anthropic';
const DEFAULT_EXPIRY_BUFFER_MINUTES = 5;

// Full path for error messages - resolved at runtime
const QUERY_ANALYZER_PATH = '${PAI_DIR}/utilities/query-analyzer/query-analyzer.ts';

/**
 * Print clear instructions when OAuth fails and no API key is set.
 * This prevents hanging indefinitely waiting for user input in non-interactive contexts.
 */
function printAuthFailureInstructions(reason: string): never {
  console.error(`\n${'═'.repeat(70)}`);
  console.error('🚨 AUTHENTICATION REQUIRED - OAuth token invalid/expired');
  console.error('═'.repeat(70));
  console.error(`\nReason: ${reason}`);
  console.error('\nNo ANTHROPIC_API_KEY environment variable found.');
  console.error('You must authenticate before using LLM features.\n');
  console.error('─'.repeat(70));
  console.error('Option A: Re-authenticate OAuth (interactive, opens browser)');
  console.error('─'.repeat(70));
  console.error(`\n  bun ${QUERY_ANALYZER_PATH} --auth\n`);
  console.error('  Then paste the authorization code when prompted.\n');
  console.error('─'.repeat(70));
  console.error('Option B: Use API key instead (non-interactive)');
  console.error('─'.repeat(70));
  console.error('\n  export ANTHROPIC_API_KEY="your-api-key-here"');
  console.error(`  bun ${QUERY_ANALYZER_PATH} --perspectives "your query"\n`);
  console.error(`${'═'.repeat(70)}\n`);
  process.exit(1);
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
}

const base64UrlEncode = (buffer: Buffer): string =>
  buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const generatePKCE = () => {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
};

const browserCommandsForPlatform = (url: string): string[][] => {
  if (process.platform === 'darwin') {
    return [['open', url]];
  }
  if (process.platform === 'win32') {
    return [['cmd', '/c', 'start', '', url]];
  }
  return [
    ['xdg-open', url],
    ['gio', 'open', url],
    ['wslview', url],
  ];
};

const tryLaunch = (command: string, args: string[]): Promise<boolean> =>
  new Promise((resolve) => {
    try {
      const child = spawn(command, args, { stdio: 'ignore', detached: true });
      let resolved = false;
      child.once('error', () => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });
      child.once('spawn', () => {
        if (!resolved) {
          resolved = true;
          child.unref();
          resolve(true);
        }
      });
    } catch {
      resolve(false);
    }
  });

const launchBrowser = async (url: string): Promise<boolean> => {
  for (const [command, ...args] of browserCommandsForPlatform(url)) {
    const launched = await tryLaunch(command, args);
    if (launched) {
      return true;
    }
  }
  return false;
};

const askForCode = async (): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    const code = await rl.question('📋 Paste the authorization code and press enter: ');
    return code.trim();
  } finally {
    rl.close();
  }
};

const toOAuthToken = (payload: TokenResponse): OAuthToken => ({
  access_token: payload.access_token,
  refresh_token: payload.refresh_token || '',
  expires_at: Math.floor(Date.now() / 1000) + payload.expires_in,
  token_type: payload.token_type || 'Bearer',
  scope: payload.scope || '',
});

const exchangeToken = async (
  identifier: string,
  params: Record<string, string>
): Promise<string> => {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as TokenResponse;
  const storage = new OAuthStorage();
  await storage.saveToken(identifier, toOAuthToken(payload));
  return payload.access_token;
};

export async function refreshToken(): Promise<string> {
  const storage = new OAuthStorage();
  const token = await storage.loadToken(TOKEN_IDENTIFIER);
  if (!token || !token.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
      client_id: OAUTH_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as TokenResponse;
  const refreshed: OAuthToken = {
    ...toOAuthToken(payload),
    refresh_token: payload.refresh_token || token.refresh_token,
  };
  await storage.saveToken(TOKEN_IDENTIFIER, refreshed);
  return refreshed.access_token;
}

export async function runOAuthFlow(): Promise<string> {
  const storage = new OAuthStorage();
  try {
    const existing = await storage.loadToken(TOKEN_IDENTIFIER);
    if (existing) {
      if (storage.isTokenExpired(existing, DEFAULT_EXPIRY_BUFFER_MINUTES)) {
        try {
          console.error('🔄 Existing OAuth token expired, attempting refresh...');
          return await refreshToken();
        } catch (error) {
          // Refresh failed - check if we have API key before interactive flow
          if (!hasApiKeyFallback()) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            printAuthFailureInstructions(`Token refresh failed: ${errorMsg}`);
          }
          console.error('⚠️ Refresh failed, continuing with a new OAuth flow.', error);
        }
      } else {
        return existing.access_token;
      }
    }
  } catch (error) {
    console.error('⚠️ Unable to load cached token, continuing with OAuth authorization.', error);
  }

  // About to start interactive flow - check if we should abort with instructions
  if (!hasApiKeyFallback()) {
    printAuthFailureInstructions(
      'OAuth token missing or invalid, interactive authentication required'
    );
  }

  const { verifier, challenge } = generatePKCE();
  const authURL = new URL(OAUTH_AUTH_URL);
  authURL.searchParams.set('client_id', OAUTH_CLIENT_ID);
  authURL.searchParams.set('redirect_uri', OAUTH_REDIRECT_URL);
  authURL.searchParams.set('response_type', 'code');
  authURL.searchParams.set('scope', AUTH_SCOPES.join(' '));
  authURL.searchParams.set('code_challenge', challenge);
  authURL.searchParams.set('code_challenge_method', 'S256');
  authURL.searchParams.set('code', 'true');
  authURL.searchParams.set('state', verifier);

  console.error('\n🔐 PAI would like to authorize with Anthropic:');
  console.error('📱 Opening authorization URL in your browser...\n');
  console.error(`   ${authURL.toString()}\n`);

  const browserOpened = await launchBrowser(authURL.toString());
  if (!browserOpened) {
    console.error('⚠️ Automatic browser launch failed. Please open the URL above manually.');
  }

  const codeInput = await askForCode();
  if (!codeInput) {
    throw new Error('No authorization code provided.');
  }

  const [code, providedState] = codeInput.split('#', 2);
  const tokenParams = {
    code,
    state: providedState ?? verifier,
    grant_type: 'authorization_code',
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URL,
    code_verifier: verifier,
  };

  return exchangeToken(TOKEN_IDENTIFIER, tokenParams);
}

/**
 * Check if we should abort with instructions instead of starting interactive OAuth.
 * Returns true if ANTHROPIC_API_KEY is set (meaning caller can use that instead).
 */
function hasApiKeyFallback(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function getValidToken(): Promise<string> {
  const storage = new OAuthStorage();
  const token = await storage.loadToken(TOKEN_IDENTIFIER);

  if (!token) {
    // No token at all - check if we have API key before starting interactive flow
    if (!hasApiKeyFallback()) {
      printAuthFailureInstructions('No OAuth token found and no ANTHROPIC_API_KEY set');
    }
    console.error('🔑 No cached OAuth token found, starting authentication flow...');
    return runOAuthFlow();
  }

  if (storage.isTokenExpired(token, DEFAULT_EXPIRY_BUFFER_MINUTES)) {
    console.error('🔄 Cached token expired, refreshing...');
    try {
      return await refreshToken();
    } catch (error) {
      // Refresh failed - check if we have API key before starting interactive flow
      if (!hasApiKeyFallback()) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        printAuthFailureInstructions(`Token refresh failed: ${errorMsg}`);
      }
      console.error('⚠️ Refreshing OAuth token failed, requesting a new authorization code.', error);
      return runOAuthFlow();
    }
  }

  return token.access_token;
}
