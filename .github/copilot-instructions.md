# DiffSense - AI Agent Instructions

## Project Overview

DiffSense is an intelligent framework for code change analysis and automatic semantic commit generation. It analyzes git changes between branches/commits, semantically classifies them, and suggests commit messages following conventional commits format.

## Architecture

DiffSense follows a pipeline architecture with these core components:

- **ChangeDetector** (`src/core/change-detector.ts`): Detects file changes between git references
- **ContextCorrelator** (`src/core/context-correlator.ts`): Adds contextual information to changes
- **SemanticAnalyzer** (`src/core/semantic-analyzer.ts`): Parses code via AST to understand change meaning
- **RulesEngine** (`src/core/rules-engine.ts`): Applies classification rules to changes
- **ScoringSystem** (`src/core/scoring.ts`): Assigns priority scores to changes
- **Reporter** (`src/core/reporter.ts`): Formats analysis results

Data flow: Git changes → Context correlation → Semantic analysis → Rule application → Scoring → Report generation

## Key Concepts

- **Change Types**: Added, Modified, Deleted, Renamed (see `src/types/index.ts`)
- **Commit Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore` (conventional commits)
- **Breaking Changes**: Marked with `!` suffix (e.g., `feat!: breaking change`)
- **File Classification**: Files are automatically classified based on path patterns and content

## Development Workflow

### Setup
```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

### CLI Commands
- `diffsense run --base main --head HEAD`: Analyze changes between branches
- `diffsense commit`: Interactive commit by type
- `diffsense suggest`: Generate commit suggestion

### Testing
- `pnpm test`: Run all tests
- `pnpm test:ci`: Run CI tests

## Important Conventions

1. **TypeScript Modules**: Uses ES modules (`import/export`) with `.js` extension in imports
2. **File Organization**:
   - `src/core/`: Core analysis components
   - `src/cli/`: Command-line interface
   - `src/types/`: Type definitions
   - `bin/`: Executable scripts

3. **Git Integration**: Uses simple-git for Git operations
4. **Breaking Change Detection**: Special handling in commit messages with `!` suffix

## Common Patterns

- **Configuration**: Custom rules in `.diffsenserc.yaml`
- **Error Handling**: Try-catch with specific error types and logging
- **Testing**: Unit tests with fixtures in `tests/` directory
- **Commit Analysis**: Focus on file type, path patterns and semantic content

## Key Files

- `src/index.ts`: Main entry point and orchestration
- `bin/commit-by-type-direct.js`: Interactive commit tool
- `src/core/change-detector.ts`: Core change detection logic
- `src/types/index.ts`: Type definitions for the entire system
