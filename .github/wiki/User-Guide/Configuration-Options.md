# Configuration Options

This document details all available configuration options for customizing DiffSense behavior.

## Configuration File

DiffSense uses a YAML configuration file (`.diffsenserc.yaml` by default) to customize its behavior. You can also use JSON format (`.diffsenserc.json`).

## Configuration Location

DiffSense looks for configuration in the following locations (in order of precedence):

1. Path specified by `--config` CLI option
2. Path specified by `DIFFSENSE_CONFIG_PATH` environment variable
3. `.diffsenserc.yaml` or `.diffsenserc.json` in the current directory
4. `.diffsenserc.yaml` or `.diffsenserc.json` in the repository root
5. Default built-in configuration

## Basic Configuration Structure

```yaml
# Basic DiffSense configuration
version: 1
rules:
  strictness: medium
  customRules: []
paths:
  include: ["src/**", "tests/**"]
  exclude: ["node_modules/**", "dist/**"]
analysis:
  detectBreakingChanges: true
  considerTestChanges: true
output:
  format: console
  verbose: false
```

## Complete Configuration Reference

### Top-Level Configuration

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `version` | number | Configuration schema version | `1` |
| `rules` | object | Classification rules configuration | |
| `paths` | object | Path inclusion/exclusion settings | |
| `analysis` | object | Analysis behavior settings | |
| `output` | object | Output formatting options | |
| `git` | object | Git-related settings | |
| `advanced` | object | Advanced configuration options | |

### Rules Configuration

```yaml
rules:
  strictness: medium         # low, medium, high
  breakingChangePatterns:    # Patterns to identify breaking changes
    - "BREAKING CHANGE:"
    - "BREAKING-CHANGE:"
  customRules:               # Custom classification rules
    - name: "api-change"
      pattern: "src/api/**"
      commitType: "feat"
      score: 100
  ruleWeights:               # Weights for different rule types
    filePattern: 1.0
    codePattern: 1.5
    semanticPattern: 2.0
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `strictness` | string | Rule strictness level (low, medium, high) | `medium` |
| `breakingChangePatterns` | array | Patterns to identify breaking changes in commit messages | |
| `customRules` | array | Custom classification rules | `[]` |
| `ruleWeights` | object | Relative weights for different rule types | |

### Paths Configuration

```yaml
paths:
  include:                   # Paths to include in analysis
    - "src/**"
    - "tests/**"
    - "packages/**"
  exclude:                   # Paths to exclude from analysis
    - "node_modules/**"
    - "dist/**"
    - "**/*.min.js"
  relevantForVersioning:     # Paths relevant for semantic versioning
    - "src/**"
    - "!src/types/**"
  mainPackage: "src/"        # Main package directory for monorepos
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `include` | array | Glob patterns for paths to include | `["**"]` |
| `exclude` | array | Glob patterns for paths to exclude | `["node_modules/**", "dist/**"]` |
| `relevantForVersioning` | array | Paths that affect semantic versioning | |
| `mainPackage` | string | Main package directory | `"src/"` |

### Analysis Configuration

```yaml
analysis:
  detectBreakingChanges: true        # Identify breaking changes
  considerTestChanges: true          # Consider test file changes
  ignoreFormatting: true             # Ignore formatting-only changes
  maxFilesToAnalyze: 100             # Maximum files to analyze in detail
  fileAnalysisTimeout: 5000          # Timeout for file analysis in ms
  contextDepth: 2                    # Depth for context correlation
  semanticAnalysis:                  # Language-specific semantic analysis
    typescript: true
    javascript: true
    python: false
    java: false
  priorityFactors:                   # Factors for priority calculation
    coverage: 1.0
    complexity: 1.0
    recentActivity: 0.8
    dependencies: 1.2
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `detectBreakingChanges` | boolean | Enable breaking change detection | `true` |
| `considerTestChanges` | boolean | Include test changes in analysis | `true` |
| `ignoreFormatting` | boolean | Ignore formatting-only changes | `true` |
| `maxFilesToAnalyze` | number | Maximum files to analyze in detail | `100` |
| `fileAnalysisTimeout` | number | Timeout for file analysis in ms | `5000` |
| `contextDepth` | number | Depth for context correlation | `2` |
| `semanticAnalysis` | object | Language-specific semantic analysis options | |
| `priorityFactors` | object | Weighting factors for priority calculation | |

### Output Configuration

```yaml
output:
  format: "console"          # console, json, markdown
  verbose: false             # Detailed output
  silent: false              # Minimal output
  colors: true               # Use colored output
  commitMessageTemplate:     # Custom commit message template
    "{{type}}{{#scope}}({{scope}}){{/scope}}: {{description}}"
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `format` | string | Output format (console, json, markdown) | `"console"` |
| `verbose` | boolean | Show detailed output | `false` |
| `silent` | boolean | Minimal output | `false` |
| `colors` | boolean | Use colored output | `true` |
| `commitMessageTemplate` | string | Custom commit message template | |

### Git Configuration

```yaml
git:
  baseRef: "HEAD~1"          # Default base reference
  headRef: "HEAD"            # Default head reference
  includeMergeCommits: false # Include merge commits in analysis
  maxCommitHistory: 100      # Maximum commit history depth
  fetchRemote: false         # Fetch remote before analysis
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `baseRef` | string | Default base git reference | `"HEAD~1"` |
| `headRef` | string | Default head git reference | `"HEAD"` |
| `includeMergeCommits` | boolean | Include merge commits in analysis | `false` |
| `maxCommitHistory` | number | Maximum commit history depth | `100` |
| `fetchRemote` | boolean | Fetch from remote before analysis | `false` |

### Advanced Configuration

```yaml
advanced:
  cacheResults: true         # Cache analysis results
  cacheDirectory: ".diffsense-cache" # Cache directory
  parallelAnalysis: true     # Run analysis in parallel
  maxParallelProcesses: 4    # Maximum parallel processes
  debugMode: false           # Enable debug logging
  experimentalFeatures:      # Experimental features
    machineLearn: false
    languageHeuristics: true
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `cacheResults` | boolean | Cache analysis results | `true` |
| `cacheDirectory` | string | Directory for cached results | `".diffsense-cache"` |
| `parallelAnalysis` | boolean | Run analysis in parallel | `true` |
| `maxParallelProcesses` | number | Maximum parallel processes | `4` |
| `debugMode` | boolean | Enable debug logging | `false` |
| `experimentalFeatures` | object | Enable experimental features | |

## Configuration Examples

### Basic Configuration

```yaml
version: 1
rules:
  strictness: medium
paths:
  include: ["src/**"]
  exclude: ["node_modules/**", "dist/**"]
analysis:
  detectBreakingChanges: true
output:
  format: console
```

### Advanced Configuration for Monorepo

```yaml
version: 1
rules:
  strictness: high
  customRules:
    - name: "ui-component"
      pattern: "packages/ui/**"
      commitType: "feat"
      scope: "ui"
      score: 90
    - name: "api-fix"
      pattern: "packages/api/**/*.fix.ts"
      commitType: "fix"
      scope: "api"
      score: 85
paths:
  include: ["packages/**"]
  exclude: ["**/node_modules/**", "**/dist/**"]
  relevantForVersioning: 
    - "packages/core/**"
    - "packages/api/**"
    - "!packages/**/tests/**"
  mainPackage: "packages/core/"
analysis:
  detectBreakingChanges: true
  considerTestChanges: true
  contextDepth: 3
  semanticAnalysis:
    typescript: true
    javascript: true
output:
  format: "markdown"
  verbose: true
  commitMessageTemplate: "{{type}}({{scope}}): {{description}}"
git:
  includeMergeCommits: false
advanced:
  parallelAnalysis: true
  maxParallelProcesses: 8
```

See also:
- [CLI Commands](CLI-Commands)
- [Custom Rules](../Advanced/Custom-Rules)
- [System Architecture](../Architecture/System-Architecture)
