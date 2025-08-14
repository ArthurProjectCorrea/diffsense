# DiffSense System Architecture

This document provides a comprehensive overview of the DiffSense system architecture, explaining how the different components work together to analyze code changes and generate semantic commit messages.

## High-Level Architecture

DiffSense follows a pipeline architecture where each component has a specific responsibility in the change analysis process:

```
Git Changes → ChangeDetector → ContextCorrelator → SemanticAnalyzer → RulesEngine → ScoringSystem → Reporter
```

## Design Principles

DiffSense is built on several key design principles:

1. **Single Responsibility**: Each component has a clear, focused purpose
2. **Pipeline Processing**: Data flows through the system in a well-defined sequence
3. **Extensibility**: Components can be extended or replaced with custom implementations
4. **Configuration-Driven**: Behavior can be customized through configuration files
5. **Language Agnostic**: Core design accommodates multiple programming languages

## Core Components

### Change Detection Layer

The change detection layer is responsible for identifying what files have changed between git references:

- **ChangeDetector** (`src/core/change-detector.ts`)
  - Uses `simple-git` to detect changes between branches/commits
  - Classifies changes as Added, Modified, Deleted, or Renamed
  - Provides initial metadata about each change

### Context Analysis Layer

The context analysis layer enriches the changes with additional information:

- **ContextCorrelator** (`src/core/context-correlator.ts`)
  - Identifies related files and dependencies
  - Adds contextual information to each change
  - Determines the scope of impact for each change

### Semantic Analysis Layer

The semantic analysis layer interprets the actual code changes:

- **SemanticAnalyzer** (`src/core/semantic-analyzer.ts`)
  - Parses code into Abstract Syntax Tree (AST)
  - Identifies key code constructs (functions, classes, etc.)
  - Determines the nature of the changes (new features, fixes, etc.)
  - Uses language-specific analyzers for optimal parsing

### Classification Layer

The classification layer applies rules to categorize changes:

- **RulesEngine** (`src/core/rules-engine.ts`)
  - Applies predefined and custom rules to changes
  - Determines change types based on conventional commits
  - Identifies breaking changes
  - Supports custom rule extensions

### Evaluation Layer

The evaluation layer prioritizes changes:

- **ScoringSystem** (`src/core/scoring.ts`)
  - Assigns priority scores to changes
  - Evaluates impact severity
  - Helps determine the primary change type

### Presentation Layer

The presentation layer formats and outputs results:

- **Reporter** (`src/core/reporter.ts`)
  - Generates formatted reports
  - Provides commit message suggestions
  - Supports multiple output formats (console, JSON, markdown)

## Communication Flow

Components communicate through well-defined interfaces:

1. **ChangeDetector** outputs `GitChange[]`
2. **ContextCorrelator** enriches to `EnrichedChange[]`
3. **SemanticAnalyzer** produces `AnalyzedChange[]`
4. **RulesEngine** generates `ClassifiedChange[]`
5. **ScoringSystem** creates `ScoredChange[]`
6. **Reporter** transforms to final `ChangeReport`

## System Boundaries

DiffSense interacts with several external systems:

- **Git**: Source of change data through simple-git
- **File System**: Access to code files for analysis
- **CI/CD Systems**: Integration with automated workflows
- **Terminal**: Command-line interface for user interaction

## Scalability and Performance

DiffSense architecture addresses scaling in several ways:

- **Parallel Processing**: Multiple files can be analyzed in parallel
- **Selective Analysis**: Only relevant files are deeply analyzed
- **Caching**: Results are cached to avoid redundant processing
- **Incremental Analysis**: Only changed files are processed when possible

## Future Architectural Directions

The system is designed to support the following future extensions:

1. **Plugin System**: For custom analyzers and reporters
2. **Remote Analysis**: Offloading analysis to server infrastructure
3. **Language Server Protocol**: Integration with IDEs
4. **Machine Learning Classification**: Enhanced change type detection

See also:
- [Core Components](Core-Components)
- [Data Flow](Data-Flow)
- [Development Setup](../Developer-Guide/Development-Setup)
