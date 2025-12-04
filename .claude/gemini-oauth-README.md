# Gemini OAuth Client

A lightweight TypeScript CLI client for Google's Gemini API using OAuth2 "Login with Google" authentication. This client replicates the authentication pattern used by the official [Gemini CLI](https://github.com/google-gemini/gemini-cli), providing seamless access to the Code Assist API backend.

Developed as part of a Personal AI (PAI) infrastructure project for AI-powered research workflows. This project represents a collaboration between human direction and AI-assisted development (Claude), focused on creating practical tools for AI-augmented research.

## Features

- Browser-based OAuth2 authentication (same flow as official Gemini CLI)
- Automatic token caching and refresh
- Uses Google's Code Assist API backend
- Multiple model support (gemini-2.0-flash, gemini-1.5-pro, etc.)
- Debug mode with timing and token usage

## Installation

```bash
cd ${PAI_DIR}/agents/clients/gemini-oauth
bun install
```

**Dependencies:**
- [Bun](https://bun.sh/) runtime
- `google-auth-library` - OAuth2 authentication
- `open` - Browser launching

## Usage

```bash
# First-time authentication
./gemini-oauth --login

# Check authentication status
./gemini-oauth --status

# Make queries
./gemini-oauth "What is quantum computing?"
./gemini-oauth -m gemini-1.5-pro "Explain neural networks"
./gemini-oauth -d "Debug mode query"  # Shows timing and token usage
```

## Options

- `-m, --model <model>` - Model selection (default: gemini-2.0-flash)
- `-t, --tokens <num>` - Max output tokens (default: 8192)
- `--temp <num>` - Temperature 0-2 (default: 0.7)
- `--login` - Force re-authentication
- `--status` - Check auth status
- `-d, --debug` - Show debug information

## Technical Notes

### OAuth Client Credentials

This client uses the same OAuth2 client credentials as the official Gemini CLI. These credentials are intentionally embedded in the source code, which is standard practice for "installed applications" (desktop apps, CLI tools, mobile apps).

**Why this is secure:**

Per [Google's OAuth2 documentation](https://developers.google.com/identity/protocols/oauth2#installed):

> "The process results in a client ID and, in some cases, a client secret, which you embed in the source code of your application. **In this context, the client secret is obviously not treated as a secret.**"

For installed applications, security is maintained through:
- Redirect URI restricted to `localhost` (cannot be intercepted remotely)
- Short-lived authorization codes
- Explicit user consent at Google's authentication screen
- Tokens stored locally on user's machine with restricted permissions

This differs from web server applications where the client secret must remain confidential on the server.

### Credential Storage

OAuth credentials are cached at `~/.config/gemini-oauth/credentials.json` with `0600` permissions (owner read/write only). Tokens are automatically refreshed when expired.

### API Endpoint

This client uses Google's Code Assist API backend (`https://cloudcode-pa.googleapis.com/v1internal`), the same endpoint used by the official Gemini CLI for authenticated requests.

## Attribution

This client is derived from the authentication patterns in [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli), licensed under Apache 2.0.

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.

---

*Built for the PAI (Personal AI) infrastructure project.*
