# Core Components

This document details the core components of DiffSense and explains how each component functions in the system.

## ChangeDetector

**Purpose**: Identifies all file changes between git references.

**Key Features**:
- Uses simple-git to extract git differences
- Determines change types (added, modified, deleted, renamed)
- Collects initial metadata (file paths, extension types)
- Filters changes based on configuration rules

**Implementation**: `src/core/change-detector.ts`

**Usage Example**:
```typescript
const detector = new ChangeDetector();
const changes = await detector.detectChanges({
  base: 'main',
  head: 'feature/new-feature'
});
```

**Key Methods**:
- `detectChanges()`: Primary method to find differences between git references
- `filterChanges()`: Applies path filters based on configuration
- `categorizeChange()`: Determines the type of each change

## ContextCorrelator

**Purpose**: Adds contextual information to detected changes.

**Key Features**:
- Identifies related files and dependencies
- Determines functional areas affected by changes
- Associates changes with project components
- Enhances changes with import/require relationships

**Implementation**: `src/core/context-correlator.ts`

**Usage Example**:
```typescript
const correlator = new ContextCorrelator();
const enrichedChanges = await correlator.correlate(changes, options);
```

**Key Methods**:
- `correlate()`: Primary method to enrich changes with context
- `findRelatedFiles()`: Identifies files connected to the changed files
- `determineScope()`: Establishes the scope of impact for each change

## SemanticAnalyzer

**Purpose**: Analyzes code changes to understand their meaning.

**Key Features**:
- Parses code into Abstract Syntax Trees (AST)
- Identifies significant syntax constructs
- Compares before/after versions of code
- Determines the semantic nature of changes

**Implementation**: `src/core/semantic-analyzer.ts`

**Usage Example**:
```typescript
const analyzer = new SemanticAnalyzer();
const analyzedChanges = await analyzer.analyze(enrichedChanges);
```

**Key Methods**:
- `analyze()`: Primary method to semantically analyze changes
- `parseFile()`: Transforms code into AST representation
- `compareASTs()`: Identifies differences between AST versions
- `inferChangeType()`: Determines the type of change based on AST differences

## RulesEngine

**Purpose**: Applies classification rules to categorize changes.

**Key Features**:
- Applies both built-in and custom rules
- Classifies changes according to conventional commit types
- Identifies breaking changes
- Supports customizable rule priorities

**Implementation**: `src/core/rules-engine.ts`

**Usage Example**:
```typescript
const engine = new RulesEngine();
const classifiedChanges = engine.classify(analyzedChanges, userRules);
```

**Key Methods**:
- `classify()`: Primary method to classify changes using rules
- `applyRule()`: Applies a specific rule to a change
- `evaluateCondition()`: Checks if a condition is met
- `determineChangeType()`: Finalizes the conventional commit type

## ScoringSystem

**Purpose**: Evaluates and prioritizes changes.

**Key Features**:
- Assigns priority scores to changes
- Evaluates impact severity
- Weights changes by importance
- Helps determine the primary change type

**Implementation**: `src/core/scoring.ts`

**Usage Example**:
```typescript
const scorer = new ScoringSystem();
const scoredChanges = scorer.score(classifiedChanges);
```

**Key Methods**:
- `score()`: Primary method to score changes
- `calculatePriority()`: Determines the importance of a change
- `evaluateImpact()`: Assesses the impact level of a change
- `aggregateScores()`: Combines scores for final evaluation

## Reporter

**Purpose**: Formats and presents analysis results.

**Key Features**:
- Generates commit message suggestions
- Creates formatted reports
- Supports multiple output formats
- Provides summary statistics

**Implementation**: `src/core/reporter.ts`

**Usage Example**:
```typescript
const reporter = new Reporter();
const report = reporter.generateReport(scoredChanges, {
  format: 'markdown',
  verbose: true
});
```

**Key Methods**:
- `generateReport()`: Primary method to create reports
- `suggestCommitMessage()`: Creates commit message suggestions
- `formatOutput()`: Formats results based on requested format
- `summarizeChanges()`: Creates a summary of all changes

## Integration Points

These components integrate through a unified pipeline:

```typescript
// Simplified pipeline example
async function analyzeChanges(options) {
  const detector = new ChangeDetector();
  const correlator = new ContextCorrelator();
  const analyzer = new SemanticAnalyzer();
  const engine = new RulesEngine();
  const scorer = new ScoringSystem();
  const reporter = new Reporter();

  const changes = await detector.detectChanges(options);
  const enrichedChanges = await correlator.correlate(changes, options);
  const analyzedChanges = await analyzer.analyze(enrichedChanges);
  const classifiedChanges = engine.classify(analyzedChanges, options.rules);
  const scoredChanges = scorer.score(classifiedChanges);
  
  return reporter.generateReport(scoredChanges, options);
}
```

See also:
- [System Architecture](System-Architecture)
- [Data Flow](Data-Flow)
- [API Reference](../API-Reference/Core-API)
