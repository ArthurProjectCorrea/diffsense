# Data Flow in DiffSense

This document explains how data flows through the DiffSense system, detailing the transformations that occur at each stage of the pipeline.

## Overview of Data Flow

DiffSense follows a sequential data flow model where information about code changes is progressively enriched, analyzed, and transformed through multiple stages:

```
Raw Git Changes → Filtered Changes → Enriched Changes → Analyzed Changes → Classified Changes → Scored Changes → Formatted Report
```

Each stage adds more context and meaning to the data, ultimately resulting in a comprehensive analysis of the code changes.

## Data Transformation Stages

### Stage 1: Raw Git Changes

**Input**: Git references (branches, commits)
**Output**: `GitChange[]`

The ChangeDetector extracts raw information from the git repository:

```typescript
interface GitChange {
  path: string;         // File path
  type: ChangeType;     // Added, Modified, Deleted, Renamed
  oldPath?: string;     // Original path (for renamed files)
  extension: string;    // File extension
  size: number;         // File size
}
```

### Stage 2: Filtered Changes

**Input**: `GitChange[]`
**Output**: `GitChange[]` (filtered)

Changes are filtered based on configuration rules:
- Excluded paths (e.g., `node_modules/`, `.git/`)
- Included paths (e.g., `src/`, `tests/`)
- File type filters (e.g., only `.ts` files)

### Stage 3: Enriched Changes

**Input**: `GitChange[]`
**Output**: `EnrichedChange[]`

The ContextCorrelator adds contextual information:

```typescript
interface EnrichedChange extends GitChange {
  content?: string;      // File content
  oldContent?: string;   // Previous content (for modified files)
  relatedFiles: string[];  // Related files
  component?: string;    // Component/module name
  dependencies: string[];  // Dependencies of the file
}
```

### Stage 4: Analyzed Changes

**Input**: `EnrichedChange[]`
**Output**: `AnalyzedChange[]`

The SemanticAnalyzer performs deep code analysis:

```typescript
interface AnalyzedChange extends EnrichedChange {
  ast?: AST;            // Abstract Syntax Tree
  oldAst?: AST;         // Previous AST
  syntaxChanges: {
    added: ASTNode[];   // Added syntax elements
    modified: ASTNode[];  // Modified syntax elements
    removed: ASTNode[];   // Removed syntax elements
  };
  semantics: {
    hasNewFeature: boolean;
    hasBugFix: boolean;
    hasRefactor: boolean;
    hasStyleChange: boolean;
    hasDocChanges: boolean;
    hasBreakingChange: boolean;
  };
}
```

### Stage 5: Classified Changes

**Input**: `AnalyzedChange[]`
**Output**: `ClassifiedChange[]`

The RulesEngine applies rules to classify changes:

```typescript
interface ClassifiedChange extends AnalyzedChange {
  commitType: CommitType;  // feat, fix, docs, etc.
  isBreaking: boolean;   // Whether it's a breaking change
  scope?: string;        // Optional scope
  confidence: number;    // Classification confidence (0-1)
  matchedRules: string[];  // Rules that matched this change
}
```

### Stage 6: Scored Changes

**Input**: `ClassifiedChange[]`
**Output**: `ScoredChange[]`

The ScoringSystem evaluates and prioritizes changes:

```typescript
interface ScoredChange extends ClassifiedChange {
  priority: number;      // Priority score
  impact: ImpactLevel;   // Low, Medium, High
  weights: {             // Individual weight factors
    complexity: number;
    coverage: number;
    scope: number;
    size: number;
  };
}
```

### Stage 7: Formatted Report

**Input**: `ScoredChange[]`
**Output**: `ChangeReport`

The Reporter creates the final report:

```typescript
interface ChangeReport {
  summary: {
    totalChanges: number;
    byType: Record<CommitType, number>;
    hasBreakingChanges: boolean;
  };
  suggestedCommit: string;
  details: ScoredChange[];
  format: OutputFormat;  // console, json, markdown
}
```

## Data Flow Example

Here's an example of how a specific change flows through the system:

1. **Raw Git Change**:
   ```
   { path: "src/features/auth/login.ts", type: "MODIFIED", extension: "ts", size: 1240 }
   ```

2. **Enriched Change**:
   ```
   {
     // Original properties...
     content: "// File content...",
     oldContent: "// Old content...",
     relatedFiles: ["src/features/auth/auth-service.ts"],
     component: "auth",
     dependencies: ["../utils/validation.ts"]
   }
   ```

3. **Analyzed Change**:
   ```
   {
     // Previous properties...
     syntaxChanges: {
       added: [/* New function: validateCredentials */],
       modified: [/* Modified function: handleLogin */],
       removed: []
     },
     semantics: {
       hasBugFix: true,
       // Other semantic flags...
     }
   }
   ```

4. **Classified Change**:
   ```
   {
     // Previous properties...
     commitType: "fix",
     isBreaking: false,
     scope: "auth",
     confidence: 0.92,
     matchedRules: ["bug-fix-pattern", "auth-module"]
   }
   ```

5. **Scored Change**:
   ```
   {
     // Previous properties...
     priority: 78,
     impact: "MEDIUM",
     weights: {
       complexity: 0.7,
       coverage: 0.5,
       scope: 0.8,
       size: 0.3
     }
   }
   ```

6. **Final Report Entry**:
   ```
   "fix(auth): fix credential validation in login process"
   ```

## Cross-Component Data Access

Components access data through standardized interfaces:

- Each component receives the output from the previous stage
- Components don't skip stages or access data out of sequence
- Data immutability is maintained where possible
- Each stage may access configuration data and the file system

## Data Lifecycle

1. **Creation**: Raw git changes extracted from repository
2. **Transformation**: Progressive enrichment through the pipeline
3. **Consumption**: Formatted report used for commit messages or CI/CD
4. **Disposal**: Data is not persisted between runs

See also:
- [System Architecture](System-Architecture)
- [Core Components](Core-Components)
- [API Reference](../API-Reference/Core-API)
