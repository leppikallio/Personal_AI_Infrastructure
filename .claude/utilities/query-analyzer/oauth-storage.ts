/**
 * OAuth token storage for Anthropic API
 *
 * Stores tokens in ~/.config/PAI/.anthropic_oauth
 * PAI's independent OAuth token storage
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface OAuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  token_type: string;
  scope: string;
}

export class OAuthStorage {
  private configDir: string;

  constructor() {
    const homeDir = homedir();
    this.configDir = join(homeDir, '.config', 'PAI');
  }

  /**
   * Initialize storage (create directory if needed)
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.configDir)) {
      await mkdir(this.configDir, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * Get path to token file for a provider
   */
  getTokenPath(provider: string): string {
    return join(this.configDir, `.${provider}_oauth`);
  }

  /**
   * Save OAuth token to disk
   */
  async saveToken(provider: string, token: OAuthToken): Promise<void> {
    await this.initialize();

    const tokenPath = this.getTokenPath(provider);
    const tempPath = `${tokenPath}.tmp`;

    // Write to temp file first (atomic operation)
    const data = JSON.stringify(token, null, 2);
    await writeFile(tempPath, data, { mode: 0o600 });

    // Atomic rename
    await rename(tempPath, tokenPath);
  }

  /**
   * Load OAuth token from disk
   */
  async loadToken(provider: string): Promise<OAuthToken | null> {
    const tokenPath = this.getTokenPath(provider);

    if (!existsSync(tokenPath)) {
      return null;
    }

    try {
      const data = await readFile(tokenPath, 'utf-8');
      const token = JSON.parse(data) as OAuthToken;
      return token;
    } catch (error) {
      throw new Error(`Failed to parse token file: ${error}`);
    }
  }

  /**
   * Delete stored OAuth token
   */
  async deleteToken(provider: string): Promise<void> {
    const tokenPath = this.getTokenPath(provider);

    if (existsSync(tokenPath)) {
      await unlink(tokenPath);
    }
  }

  /**
   * Check if token is expired (with buffer)
   */
  isTokenExpired(token: OAuthToken, bufferMinutes = 5): boolean {
    if (!token.expires_at) {
      return true;
    }

    const bufferSeconds = bufferMinutes * 60;
    const now = Math.floor(Date.now() / 1000);
    return now + bufferSeconds >= token.expires_at;
  }

  /**
   * Check if a valid (non-expired) token exists
   */
  async hasValidToken(provider: string, bufferMinutes = 5): Promise<boolean> {
    const token = await this.loadToken(provider);
    if (!token) {
      return false;
    }

    return !this.isTokenExpired(token, bufferMinutes);
  }
}
