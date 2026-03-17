# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Pi Monorepo, a collection of tools for building AI agents and managing LLM deployments. The main product is the "pi" coding agent, an interactive CLI tool for coding with AI.

**Repository**: https://github.com/badlogic/pi-mono
**Node Version**: >= 20.0.0
**License**: MIT

## Packages

| Package | Description |
|---------|-------------|
| **[@mariozechner/pi-ai](packages/ai)** | Unified multi-provider LLM API (OpenAI, Anthropic, Google, etc.) |
| **[@mariozechner/pi-agent-core](packages/agent)** | Agent runtime with tool calling and state management |
| **[@mariozechner/pi-coding-agent](packages/coding-agent)** | Interactive coding agent CLI (main product) |
| **[@mariozechner/pi-mom](packages/mom)** | Slack bot that delegates messages to the pi coding agent |
| **[@mariozechner/pi-tui](packages/tui)** | Terminal UI library with differential rendering |
| **[@mariozechner/pi-web-ui](packages/web-ui)** | Web components for AI chat interfaces |
| **[@mariozechner/pi-pods](packages/pods)** | CLI for managing vLLM deployments on GPU pods |

## Package Dependency Graph

```
pi-coding-agent (main product)
├── pi-agent-core
│   └── pi-ai
├── pi-tui
└── (other tool dependencies)

pi-web-ui
└── pi-ai

pi-mom
├── pi-coding-agent
├── pi-agent-core
└── pi-ai
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run build` | Build all packages in order (tui → ai → agent → coding-agent → mom → web-ui → pods) |
| `npm run dev` | Concurrent watch mode for development |
| `npm run check` | Lint, format, and type check (requires `npm run build` first) |
| `npm test` | Run all package tests |
| `./test.sh` | Run tests (skips LLM-dependent tests without API keys) |
| `./pi-test.sh` | Run pi from sources (must be run from repo root) |
| `npm run release:patch` | Release patch version (bug fixes, new features) |
| `npm run release:minor` | Release minor version (API breaking changes) |

**Important Notes**:
- `npm run check` must be run after `npm run build` (web-ui needs compiled `.d.ts` files)
- From `AGENTS.md`: NEVER run `npm run dev`, `npm run build`, or `npm test` unless specifically instructed
- After code changes, run `npm run check` and fix all errors/warnings before committing
- Run specific tests from the package root: `npx tsx ../../node_modules/vitest/dist/cli.js --run test/specific.test.ts`

## Code Quality

**Linting/Formatting**: Biome (config in `biome.json`)
- Indentation: Tabs, width 3
- Line width: 120
- Rules: Recommended set with `noNonNullAssertion`, `noExplicitAny`, and `useNodejsImportProtocol` disabled

**TypeScript**: Strict mode enabled

From `AGENTS.md`:
- No `any` types unless absolutely necessary
- **NEVER use inline imports** (no `await import()`, no dynamic imports for types)
- Never remove or downgrade code to fix type errors; upgrade dependencies instead
- All keybindings must be configurable (add to `DEFAULT_EDITOR_KEYBINDINGS` or `DEFAULT_APP_KEYBINDINGS`)

## Changelog

Location: `packages/*/CHANGELOG.md` (each package has its own)

- New entries **ALWAYS** go under `## [Unreleased]`
- Append to existing subsections: `### Breaking Changes`, `### Added`, `### Changed`, `### Fixed`, `### Removed`
- **NEVER** modify already-released version sections
- Internal changes: `Fixed foo bar ([#123](https://github.com/badlogic/pi-mono/issues/123))`
- External contributions: `Added feature X ([#456](https://github.com/badlogic/pi-mono/pull/456) by [@username](https://github.com/username))`

## Releasing

**Lockstep versioning**: All packages share the same version number.

- `patch`: Bug fixes and new features
- `minor`: API breaking changes

Release steps are handled by scripts: `npm run release:patch` or `npm run release:minor`

## Git Rules (from AGENTS.md)

**CRITICAL**: Multiple agents may work in parallel. Follow these rules:

- **ONLY commit files YOU changed in THIS session**
- NEVER use `git add -A` or `git add .` - use `git add <specific-file-paths>`
- Always run `git status` before committing to verify only your files are staged
- Include `fixes #<number>` or `closes #<number>` in commit messages for related issues

**Forbidden Operations**:
- `git reset --hard` - destroys uncommitted changes
- `git checkout .` - destroys uncommitted changes
- `git clean -fd` - deletes untracked files
- `git stash` - stashes ALL changes including other agents' work
- `git commit --no-verify` - bypasses required checks

## Important Files

| Path | Purpose |
|------|---------|
| `AGENTS.md` | **CRITICAL**: Full rules for AI agents working on this repo |
| `CONTRIBUTING.md` | Contribution guidelines |
| `biome.json` | Biome lint/format configuration |
| `tsconfig.json` | TypeScript configuration |
| `packages/coding-agent/src/cli.ts` | Main pi CLI entry point |
| `packages/ai/src/index.ts` | pi-ai library entry point |
| `packages/agent/src/index.ts` | pi-agent-core library entry point |

## Adding a New LLM Provider (packages/ai)

Requires changes across multiple files:

1. **Core Types** (`packages/ai/src/types.ts`): Add API identifier, options interface, provider name
2. **Provider Implementation** (`packages/ai/src/providers/`): Create stream function, message conversion, event parsing
3. **Stream Integration** (`packages/ai/src/stream.ts`): Import, credential detection, options mapping, add to `streamFunctions`
4. **Model Generation** (`packages/ai/scripts/generate-models.ts`): Fetch/parse models
5. **Tests**: Add provider to all test files in `packages/ai/test/`
6. **Coding Agent**: `model-resolver.ts`, `args.ts`, README
7. **Documentation**: `packages/ai/README.md` and CHANGELOG

See `AGENTS.md` for full details.
