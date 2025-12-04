<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./pai-logo.png">
  <source media="(prefers-color-scheme: light)" srcset="./pai-logo.png">
  <img alt="PAI Logo" src="./pai-logo.png" width="600">
</picture>

<br/>
<br/>

# Personal AI Infrastructure

### Open-source scaffolding for building your own AI-powered operating system

<br/>

[![Version](https://img.shields.io/badge/version-0.9.1-blue?style=for-the-badge)](https://github.com/danielmiessler/Personal_AI_Infrastructure/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Powered-8B5CF6?style=for-the-badge)](https://claude.ai/code)

<br/>

[**Quick Start**](#-quick-start) · [**Documentation**](#-documentation) · [**Examples**](#-examples) · [**Updates**](#-updates) · [**Community**](#-community)

<br/>

[![PAI Overview Video](https://img.youtube.com/vi/iKwRWwabkEc/maxresdefault.jpg)](https://youtu.be/iKwRWwabkEc)

**[Watch the full PAI walkthrough](https://youtu.be/iKwRWwabkEc)** | **[Read: The Real Internet of Things](https://danielmiessler.com/blog/real-internet-of-things)**

---

**The best AI in the world should be available to everyone, not just companies with massive engineering teams.**

</div>

Right now the most powerful AI setups are being built inside companies for efficiency and profits.

That's all good, but I think the purpose of technology is to serve humans—not the other way around. These new AI frameworks should be available to everyone, including people not in technology, so that regular people can use it to help them flourish.

That's what PAI is. It's the foundation for building a Personal AI System that understands your larger goals and context, gets better over time, and that works for *you* because it's *yours*. Not some generic chatbot. Not some common assistant. A full platform for magnifying yourself and your impact on the world.

**Related reading:**
- [The Real Internet of Things](https://danielmiessler.com/blog/real-internet-of-things) — The vision behind PAI (full book)
- [AI's Predictable Path: 7 Components](https://danielmiessler.com/blog/ai-predictable-path-7-components-2024) — Visual walkthrough of where AI is heading

<br/>

## What is PAI?

PAI (Personal AI Infrastructure) is an open-source template for building your own AI-powered operating system. It's currently built on [Claude Code](https://claude.ai/code), but designed to be platform-independent — the architecture, skills, and workflows are structured so future migrations to other AI platforms are straightforward.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/pai-infrastructure.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/pai-infrastructure.png">
  <img alt="PAI Infrastructure Architecture" src="docs/images/pai-infrastructure.png" width="800">
</picture>

| Component | Description |
|-----------|-------------|
| **Skills** | Self-contained AI capabilities with routing, workflows, and documentation |
| **Agents** | Specialized AI personalities for different tasks (engineer, researcher, designer) |
| **Hooks** | Event-driven automation that captures work and manages state |
| **History** | Automatic documentation system (UOCS) that captures everything |

> [!TIP]
> **Start clean, small, and simple.** Build the scaffolding that makes AI reliable.

<br/>

## What's New in v0.9.1

Big updates! PAI is now fully **platform-agnostic** — your AI identity, your system. Plus improved cross-platform setup.

| Feature | Description |
|---------|-------------|
| 📊 **Observability Dashboard** | Real-time agent monitoring with live charts |
| 🎭 **Genericized Identity** | Configure your DA name, it flows everywhere |
| ⚙️ **Better Configuration** | Clear docs for all environment variables |

👉 [**See full changelog**](#-updates)

<br/>


## 🚀 Quick Start

### 1. Clone PAI

```bash
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git
cd Personal_AI_Infrastructure
```

### 2. Run the Setup Wizard

```bash
.claude/tools/setup/bootstrap.sh
```

The bootstrap script will:
- Check your shell (recommends zsh or bash)
- Install Bun if needed (PAI's package manager)
- Check for Claude Code
- Launch the interactive setup wizard

The setup wizard will:
- Ask where to install PAI (default: `~/.claude`)
- Configure your name and email
- Name your AI assistant (default: "Kai")
- Choose a color theme
- Set up voice server (macOS)
- Add environment variables to your shell

### 3. Add Your API Keys

```bash
# Copy environment template
cp ~/.claude/.env.example ~/.claude/.env

# Edit with your API keys
nano ~/.claude/.env
```

### 4. Start Claude Code

```bash
source ~/.zshrc  # Load PAI environment
claude
```

> [!TIP]
> **Non-interactive setup** for automation:
> ```bash
> bun run setup.ts --pai-dir ~/.claude --name "Your Name" --email you@example.com --force
> ```

📚 For detailed setup, see [`docs/QUICKSTART.md`](docs/QUICKSTART.md)

<br/>

## 📚 Documentation

All documentation lives in the CORE skill (`.claude/skills/CORE/`):

| Document | Description |
|----------|-------------|
| [**CONSTITUTION.md**](.claude/skills/CORE/CONSTITUTION.md) | System philosophy, architecture, operating principles |
| [**SkillSystem.md**](.claude/skills/CORE/SkillSystem.md) | **How to create your own skills** — the canonical skill structure guide |
| [**SKILL.md**](.claude/skills/CORE/SKILL.md) | Main PAI skill with identity, preferences, quick reference |
| [hook-system.md](.claude/skills/CORE/hook-system.md) | Event-driven automation |
| [history-system.md](.claude/skills/CORE/history-system.md) | Automatic work documentation (UOCS) |

<details>
<summary><strong>Additional Reference</strong></summary>

| Document | Description |
|----------|-------------|
| [prompting.md](.claude/skills/CORE/prompting.md) | Prompt engineering patterns |
| [aesthetic.md](.claude/skills/CORE/aesthetic.md) | Visual design system |
| [voice-server/README.md](.claude/voice-server/README.md) | Text-to-speech feedback |

</details>

<br/>

## 🎨 Examples

Explore example skills in `.claude/skills/`:

| Skill | Description |
|-------|-------------|
| **observability/** | Real-time agent monitoring dashboard with WebSocket streaming |
| **brightdata/** | Four-tier progressive web scraping with automatic fallback |
| **fabric/** | Integration with Fabric pattern system (242+ AI patterns) |
| **research/** | Multi-source research workflows |
| **create-skill/** | Templates for creating new skills |

Each skill demonstrates the skills-as-containers pattern with routing, workflows, and self-contained documentation.

<br/>

## 🏗️ Architecture

PAI is built on 12 foundational principles:

<table>
<tr>
<td width="50%" valign="top">

**π Scaffolding > Model**<br/>
The infrastructure matters more than any single model

**π ENG / SRE**<br/>
Treat AI systems like production engineering

**π As Deterministic as Possible**<br/>
Reduce randomness, increase reliability

**π Code Before Prompts**<br/>
Write code first, wrap with prompts second

**π UNIX Philosophy**<br/>
Small, composable tools that do one thing well

**π CLI as Interface**<br/>
Command line is the primary interaction layer

</td>
<td width="50%" valign="top">

**π Goal → Code → CLI → Prompts → Agent**<br/>
The implementation hierarchy

**π Spec / Test / Evals First**<br/>
Define success before building

**π Meta / Self Updates**<br/>
The system improves itself

**π Custom Skill Management**<br/>
3-tier architecture, routing, workflows, tools

**π History**<br/>
Automatic documentation of all work

**π Custom Agent Personalities / Voices**<br/>
Specialized agents for different tasks

</td>
</tr>
</table>

Complete architecture: [`.claude/skills/CORE/CONSTITUTION.md`](.claude/skills/CORE/CONSTITUTION.md)

### Core Systems

<details open>
<summary><strong>Skills Architecture</strong> — 3-tier progressive disclosure</summary>

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/skills-architecture.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/skills-architecture.png">
  <img alt="Skills Architecture" src="docs/images/skills-architecture.png" width="800">
</picture>

Skills are self-contained containers with SKILL.md as the entry point. Workflows handle multi-step operations, tools provide CLI scripts, and docs contain reference material — all progressively loaded only when needed.

</details>

<details>
<summary><strong>Hook System</strong> — Event-driven automation</summary>

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/hook-system.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/hook-system.png">
  <img alt="Hook System" src="docs/images/hook-system.png" width="800">
</picture>

Hooks capture everything automatically — before tool execution, after tool execution, and on user feedback. Scripts like `capture-all-events.ts` and `capture-session-summary.ts` run invisibly to build context.

</details>

<details>
<summary><strong>History System</strong> — Automatic documentation (UOCS)</summary>

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/history-system.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/history-system.png">
  <img alt="History System" src="docs/images/history-system.png" width="800">
</picture>

Everything is captured, nothing is lost. Session work, tool outputs, and agent results flow into the history system, producing markdown files, JSONL logs, and timestamped entries organized by date.

</details>

<br/>

## 🛠️ Technology Stack

| Category | Choice | Note |
|----------|--------|------|
| **Runtime** | Bun | NOT Node.js |
| **Language** | TypeScript | NOT Python |
| **Package Manager** | Bun | NOT npm/yarn/pnpm |
| **Format** | Markdown | NOT HTML for basic content |
| **Testing** | Vitest | When needed |
| **Voice** | ElevenLabs | TTS integration |

<br/>

## 💬 Community

Kai and I work hard to address issues and PRs throughout the week — we try not to get too far behind!

| Channel | Link |
|---------|------|
| 🐛 **Issues** | [Report bugs or request features](https://github.com/danielmiessler/Personal_AI_Infrastructure/issues) |
| 💬 **Discussions** | [Ask questions and share ideas](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions) |
| 🎥 **Video** | [Watch the full PAI walkthrough](https://youtu.be/iKwRWwabkEc) |
| 📝 **Blog** | [The Real Internet of Things](https://danielmiessler.com/blog/real-internet-of-things) |

<br/>

## 📝 Updates

<details>
<summary><strong>v0.9.0 (2025-12-01) — Platform Agnostic Release</strong></summary>

<br/>

This release focuses on making PAI fully portable and fork-friendly. Your AI, your identity, your system.

**Observability Dashboard**
- Complete real-time agent monitoring at `.claude/Observability/`
- WebSocket streaming of all agent activity
- Live pulse charts, event timelines, and swim lanes
- Multiple themes (Tokyo Night, Nord, Catppuccin, etc.)
- Security obfuscation for sensitive data

**Genericized Agent Identity**
- All agent references now use `process.env.DA || 'main'`
- No more hardcoded names — your DA name flows through the entire system
- Observability dashboard shows your configured identity

**Platform-Agnostic Configuration**
- Clear separation: `settings.json` for identity/paths, `.env` for API keys
- `DA` (Digital Assistant name) — your AI's identity
- `PAI_DIR` — root directory for all configuration
- `TIME_ZONE` — configurable timezone for timestamps

**Skill System Improvements**
- Canonical TitleCase file naming throughout
- Standardized skill-workflow-notification script for dashboard detection
- All paths use `${PAI_DIR}/` for location-agnostic installation

</details>

<details>
<summary><strong>v0.8.0 (2025-11-25) — Research & Documentation</strong></summary>

<br/>

**Research Skill**
- Comprehensive research skill with 10 specialized workflows
- Multi-source research with parallel agent execution
- Fabric pattern integration (242+ AI patterns)

**Infrastructure**
- Path standardization using `${PAI_DIR}/` throughout
- `PAI_CONTRACT.md` defining core guarantees
- Self-test validation system for health checks
- Protection system for PAI-specific files

</details>

<details>
<summary><strong>v0.7.0 (2025-11-20) — Protection & Clarity</strong></summary>

<br/>

**PAI Path Resolution System** (#112)
- Centralized `pai-paths.ts` library — single source of truth
- Smart detection with fallback to `~/.claude`
- Updated 7 hooks to use centralized paths

**PAI vs Kai Clarity** (#113)
- `PAI_CONTRACT.md` — official contract defining boundaries
- Self-test system (`bun ${PAI_DIR}/hooks/self-test.ts`)
- Clear README section distinguishing PAI from Kai

**Protection System**
- `.pai-protected.json` manifest of protected files
- `validate-protected.ts` script for pre-commit validation
- Pre-commit hook template for automated checks

</details>

<details>
<summary><strong>v0.6.5 (2025-11-18) — BrightData Integration</strong></summary>

<br/>

**Four-Tier Progressive Web Scraping**
- Tier 1: WebFetch (free, built-in)
- Tier 2: cURL with headers (free, more reliable)
- Tier 3: Playwright (free, JavaScript rendering)
- Tier 4: Bright Data MCP (paid, anti-bot bypass)

</details>

<details>
<summary><strong>v0.6.0 (2025-11-15) — Major Architecture Update</strong></summary>

<br/>

**Repository Restructure**
- Moved all configuration to `.claude/` directory
- Skills-as-containers architecture
- Three-tier progressive disclosure

**Skills System**
- Art skill with visual content generation
- Story-explanation skill for narrative summaries
- Create-skill and create-cli meta-skills

**Hook System**
- Comprehensive event capture system
- Session summary and tool output capture
- Tab title updates

**Voice Integration**
- Voice server with ElevenLabs TTS
- Session start notifications

</details>

<details>
<summary><strong>v0.5.0 and Earlier</strong></summary>

<br/>

**v0.5.0 — Foundation**
- CORE skill as central context loader
- Constitution defining system principles
- CLI-First Architecture pattern
- Initial skills: Fabric, FFUF, Alex Hormozi pitch

**Pre-v0.5.0 — Early Development**
- Initial repository setup
- Basic settings.json structure
- Agent personality definitions
- Foundational hook experiments

</details>

<br/>

## 📜 License

MIT License — see [`LICENSE`](LICENSE) for details.

<br/>

## 🙏 Acknowledgments

**Built on [Claude Code](https://code.claude.com) by Anthropic.**

PAI is the technical foundation for [Human 3.0](https://human3.unsupervised-learning.com) — a program I created to help people transform into a version of themselves that can thrive in the post-corporate world that's coming. Human 3.0 means AI-augmented humans who build and control their own AI systems.

Right now, the most sophisticated AI infrastructure exists inside corporations with massive engineering teams. PAI exists to change that. To give individuals the same scaffolding that companies spend millions building.

Your AI, knowing how you work, learning from your patterns, serving your goals — not some corporation's engagement metrics. That's what this enables.

<br/>

---

<div align="center">

**Start clean. Start small. Build the AI infrastructure you need.**

<br/>

[⬆ Back to Top](#personal-ai-infrastructure)

</div>
