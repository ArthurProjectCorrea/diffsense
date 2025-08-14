# CLI Commands Reference

This document provides a comprehensive reference for all command-line interface (CLI) commands available in DiffSense.

## Command Overview

DiffSense offers several commands through its CLI:

| Command | Description |
|---------|-------------|
| `run` | Analyze changes and generate commit suggestions |
| `commit` | Interactive commit creation by type |
| `suggest` | Generate commit suggestions without committing |
| `init` | Initialize DiffSense configuration |
| `version` | Display DiffSense version information |
| `help` | Show help information |

## Global Options

These options apply to all DiffSense commands:

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--config` | `-c` | Path to config file | `.diffsenserc.yaml` |
| `--debug` | | Enable debug logging | `false` |
| `--help` | `-h` | Display help information | |
| `--version` | `-v` | Display version information | |

## `diffsense run`

Analyze changes between git references and generate commit suggestions.

### Usage

```bash
diffsense run [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--base` | `-b` | Base git reference | `HEAD~1` |
| `--head` | `-h` | Head git reference | `HEAD` |
| `--format` | `-f` | Output format (console, json, markdown) | `console` |
| `--output` | `-o` | Output file path | |
| `--rules` | `-r` | Path to custom rules file | |
| `--verbose` | | Show detailed information | `false` |
| `--silent` | | Suppress all output except errors | `false` |

### Examples

```bash
# Compare current state with previous commit
diffsense run

# Compare feature branch with main branch
diffsense run --base main --head feature/new-feature

# Generate markdown report
diffsense run --format markdown --output changes.md

# Use custom rules
diffsense run --rules ./my-rules.yaml
```

## `diffsense commit`

Interactive commit creation by change type.

### Usage

```bash
diffsense commit [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--interactive` | `-i` | Use interactive mode | `true` |
| `--message` | `-m` | Commit message template | |
| `--scope` | `-s` | Commit scope | |
| `--verify` | | Run pre-commit verification | `true` |
| `--no-verify` | | Skip pre-commit hooks | `false` |

### Examples

```bash
# Interactive commit with guided process
diffsense commit

# Create commit with specific scope
diffsense commit --scope auth

# Commit with custom message template
diffsense commit --message "{{type}}({{scope}}): {{description}}"

# Skip pre-commit hooks
diffsense commit --no-verify
```

## `diffsense suggest`

Generate commit suggestions without actually committing.

### Usage

```bash
diffsense suggest [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--base` | `-b` | Base git reference | `HEAD~1` |
| `--head` | `-h` | Head git reference | `HEAD` |
| `--format` | `-f` | Output format (console, json, markdown) | `console` |
| `--count` | | Number of suggestions to generate | `3` |

### Examples

```bash
# Generate commit suggestions for current changes
diffsense suggest

# Compare specific commits
diffsense suggest --base abc1234 --head def5678

# Generate more suggestions
diffsense suggest --count 5
```

## `diffsense init`

Initialize DiffSense configuration in the current project.

### Usage

```bash
diffsense init [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--force` | `-f` | Overwrite existing configuration | `false` |
| `--template` | `-t` | Configuration template (basic, advanced) | `basic` |

### Examples

```bash
# Create default configuration
diffsense init

# Force overwrite existing configuration
diffsense init --force

# Use advanced template
diffsense init --template advanced
```

## `diffsense version`

Display DiffSense version information.

### Usage

```bash
diffsense version
```

## `diffsense help`

Display help information for DiffSense commands.

### Usage

```bash
diffsense help [command]
```

### Examples

```bash
# General help
diffsense help

# Help for specific command
diffsense help commit
```

## Environment Variables

DiffSense respects the following environment variables:

| Variable | Description |
|----------|-------------|
| `DIFFSENSE_CONFIG_PATH` | Path to configuration file |
| `DIFFSENSE_DEBUG` | Enable debug logging when set |
| `DIFFSENSE_NO_COLOR` | Disable colored output when set |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Git operation error |
| 4 | Analysis error |

See also:
- [Basic Usage](../Basic-Usage)
- [Configuration Options](Configuration-Options)
- [Automated Commit Workflow](../Advanced/Automated-Commits-Workflow)
