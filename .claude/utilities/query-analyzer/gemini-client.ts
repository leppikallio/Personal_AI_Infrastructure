/**
 * Gemini OAuth Client Module
 *
 * Importable module for Gemini API calls via Code Assist API.
 * Extracted from gemini-oauth CLI for direct use in ensemble-analyzer.
 *
 * Usage:
 *   import { generateGeminiContent, GeminiConfig } from './gemini-client.ts';
 *   const response = await generateGeminiContent("Your prompt", { model: "gemini-2.5-flash" });
 */

import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { OAuth2Client } from 'google-auth-library';

// OAuth2 client credentials - loaded from environment
const OAUTH_CLIENT_ID = process.env.GEMINI_OAUTH_CLIENT_ID || '';
const OAUTH_CLIENT_SECRET = process.env.GEMINI_OAUTH_CLIENT_SECRET || '';

// Code Assist API endpoint
const CODE_ASSIST_ENDPOINT = 'https://cloudcode-pa.googleapis.com';
const CODE_ASSIST_API_VERSION = 'v1internal';

// Config paths - same location as Gemini CLI
const CONFIG_DIR = join(homedir(), '.config', 'gemini-oauth');
const CREDENTIALS_PATH = join(CONFIG_DIR, 'credentials.json');

// User-Agent header
const USER_AGENT = `GeminiOAuthClient/1.0.0 (${process.platform}; ${process.arch})`;

// Full path for error messages
const GEMINI_OAUTH_PATH = '${PAI_DIR}/agents/clients/gemini-oauth/gemini-oauth';

/**
 * Print clear instructions when Gemini OAuth fails.
 * @param reason - Why auth failed
 * @param exitOnFailure - If true, exits process. If false, just prints and returns (for ensemble mode)
 */
function printGeminiAuthFailureInstructions(reason: string, exitOnFailure = false): void {
  console.error(`\n${'═'.repeat(70)}`);
  console.error('🚨 GEMINI AUTHENTICATION REQUIRED - OAuth credentials invalid/missing');
  console.error('═'.repeat(70));
  console.error(`\nReason: ${reason}`);
  console.error('\nYou must authenticate with Google before using Gemini features.\n');
  console.error('─'.repeat(70));
  console.error('Authenticate via OAuth (opens browser):');
  console.error('─'.repeat(70));
  console.error(`\n  ${GEMINI_OAUTH_PATH} --login\n`);
  console.error('  Follow the browser prompts to authorize with Google.\n');
  if (!exitOnFailure) {
    console.error('─'.repeat(70));
    console.error('NOTE: Gemini will be skipped in ensemble mode. Claude + Keyword will continue.');
    console.error('─'.repeat(70));
  }
  console.error(`${'═'.repeat(70)}\n`);

  if (exitOnFailure) {
    process.exit(1);
  }
}

/**
 * Get the full path to gemini-oauth CLI for error messages
 */
export function getGeminiOAuthPath(): string {
  return GEMINI_OAUTH_PATH;
}

export interface GeminiConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  debug?: boolean;
}

interface Credentials {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  project_id?: string;
}

// Singleton client instance
let cachedClient: OAuth2Client | null = null;
let cachedProjectId: string | null = null;

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function saveCredentials(credentials: Credentials): void {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
  chmodSync(CREDENTIALS_PATH, 0o600);
}

function loadCredentials(): Credentials | null {
  try {
    if (existsSync(CREDENTIALS_PATH)) {
      const data = readFileSync(CREDENTIALS_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Ignore errors, return null
  }
  return null;
}

function createOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    'http://localhost:0/oauth2callback'
  );
}

async function validateAndRefreshCredentials(
  client: OAuth2Client,
  credentials: Credentials,
  debug = false
): Promise<boolean> {
  try {
    client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
    });

    // Check if token is expired
    if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
      if (debug) {
        console.error('[gemini-client] Access token expired, attempting refresh...');
      }

      if (credentials.refresh_token) {
        const { credentials: newTokens } = await client.refreshAccessToken();
        const newCredentials: Credentials = {
          access_token: newTokens.access_token!,
          refresh_token: newTokens.refresh_token || credentials.refresh_token,
          scope: newTokens.scope || credentials.scope,
          token_type: newTokens.token_type || credentials.token_type,
          expiry_date: newTokens.expiry_date || undefined,
          project_id: credentials.project_id,
        };

        saveCredentials(newCredentials);
        client.setCredentials(newTokens);

        if (debug) {
          console.error('[gemini-client] Token refreshed successfully');
        }

        return true;
      }

      return false;
    }

    // Verify token is valid
    const { token } = await client.getAccessToken();
    if (token) {
      await client.getTokenInfo(token);
      return true;
    }

    return false;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[gemini-client] Credential validation failed: ${message}`);
    return false;
  }
}

async function getAuthenticatedClient(debug = false): Promise<OAuth2Client> {
  // Return cached client if available
  if (cachedClient) {
    return cachedClient;
  }

  const client = createOAuthClient();

  // Set up token refresh handler
  client.on('tokens', (tokens) => {
    const credentials = loadCredentials();
    const newCredentials: Credentials = {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || credentials?.refresh_token,
      scope: tokens.scope || credentials?.scope,
      token_type: tokens.token_type || credentials?.token_type,
      expiry_date: tokens.expiry_date || undefined,
      project_id: credentials?.project_id,
    };
    saveCredentials(newCredentials);
  });

  // Check for existing credentials
  const credentials = loadCredentials();
  if (credentials) {
    const isValid = await validateAndRefreshCredentials(client, credentials, debug);
    if (isValid) {
      if (debug) {
        console.error('[gemini-client] Using cached credentials');
      }
      cachedClient = client;
      cachedProjectId = credentials.project_id || null;
      return client;
    }
  }

  // No valid credentials - print instructions and throw with full path
  printGeminiAuthFailureInstructions('No valid credentials found or refresh failed');
  throw new Error(
    `No valid Gemini OAuth credentials found. Run '${GEMINI_OAUTH_PATH} --login' to authenticate.`
  );
}

async function setupUser(client: OAuth2Client, debug = false): Promise<string> {
  const { token } = await client.getAccessToken();

  if (!token) {
    throw new Error('No access token available');
  }

  const url = `${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:loadCodeAssist`;

  const requestBody = {
    metadata: {
      ideType: 'IDE_UNSPECIFIED',
      platform: 'PLATFORM_UNSPECIFIED',
      pluginType: 'GEMINI',
    },
  };

  if (debug) {
    console.error('[gemini-client] Setting up user with Code Assist API...');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Setup failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  let projectId = data.cloudaicompanionProject;

  if (!projectId && data.allowedTiers) {
    if (debug) {
      console.error('[gemini-client] User not onboarded, initiating onboarding...');
    }

    const defaultTier = data.allowedTiers.find((t: any) => t.isDefault) || data.allowedTiers[0];

    const onboardUrl = `${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:onboardUser`;
    const onboardBody = {
      tierId: defaultTier.id,
      metadata: {
        ideType: 'IDE_UNSPECIFIED',
        platform: 'PLATFORM_UNSPECIFIED',
        pluginType: 'GEMINI',
      },
    };

    let onboardResponse = await fetch(onboardUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(onboardBody),
    });

    if (!onboardResponse.ok) {
      const errorText = await onboardResponse.text();
      throw new Error(`Onboarding failed (${onboardResponse.status}): ${errorText}`);
    }

    let onboardData = await onboardResponse.json();

    // Poll for completion
    while (!onboardData.done) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onboardResponse = await fetch(onboardUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify(onboardBody),
      });

      if (!onboardResponse.ok) {
        const errorText = await onboardResponse.text();
        throw new Error(`Onboarding poll failed (${onboardResponse.status}): ${errorText}`);
      }

      onboardData = await onboardResponse.json();
    }

    projectId = onboardData.response?.cloudaicompanionProject?.id;
  }

  if (!projectId) {
    throw new Error('Could not obtain project ID from Code Assist API');
  }

  return projectId;
}

async function getProjectId(client: OAuth2Client, debug = false): Promise<string> {
  // Return cached project ID if available
  if (cachedProjectId) {
    return cachedProjectId;
  }

  // Check credentials for cached project ID
  const credentials = loadCredentials();
  if (credentials?.project_id) {
    cachedProjectId = credentials.project_id;
    return credentials.project_id;
  }

  // Setup user to get project ID
  const projectId = await setupUser(client, debug);

  // Save project ID to credentials
  if (credentials) {
    credentials.project_id = projectId;
    saveCredentials(credentials);
  }

  cachedProjectId = projectId;
  return projectId;
}

/**
 * Generate content using Gemini API via Code Assist
 *
 * @param prompt - The prompt to send to Gemini
 * @param config - Configuration options
 * @returns Promise<string> - The generated content
 */
export async function generateGeminiContent(
  prompt: string,
  config: GeminiConfig = {}
): Promise<string> {
  const { model = 'gemini-2.5-flash', maxTokens = 8192, temperature = 0.7, debug = false } = config;

  // Get authenticated client
  const client = await getAuthenticatedClient(debug);

  // Get project ID
  const projectId = await getProjectId(client, debug);

  // Get access token
  const { token } = await client.getAccessToken();

  if (!token) {
    throw new Error('No access token available');
  }

  const url = `${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:generateContent`;
  const userPromptId = randomBytes(16).toString('hex');

  const requestBody = {
    model,
    project: projectId,
    user_prompt_id: userPromptId,
    request: {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    },
  };

  if (debug) {
    console.error('[gemini-client] Making request to:', url);
    console.error('[gemini-client] Model:', model);
    console.error('[gemini-client] Prompt length:', prompt.length);
  }

  const startTime = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(requestBody),
  });

  const duration = Date.now() - startTime;

  if (debug) {
    console.error(`[gemini-client] Response status: ${response.status} (${duration}ms)`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API request failed (${response.status})`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      errorMessage += `: ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();

  const content = data.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error('No content in response');
  }

  return content;
}

/**
 * Check if Gemini credentials are valid
 */
export async function checkGeminiAuth(): Promise<boolean> {
  try {
    const credentials = loadCredentials();
    if (!credentials) {
      return false;
    }

    const client = createOAuthClient();
    return await validateAndRefreshCredentials(client, credentials);
  } catch {
    return false;
  }
}

/**
 * Clear cached client (useful for testing or forcing re-auth)
 */
export function clearGeminiCache(): void {
  cachedClient = null;
  cachedProjectId = null;
}
