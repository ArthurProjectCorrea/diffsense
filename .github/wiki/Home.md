# DiffSense: Intelligent Code Change Analysis Framework

Welcome to the official DiffSense documentation wiki!

DiffSense is an advanced framework for semantic code change analysis and automatic commit message generation. It analyzes git changes between branches or commits, classifies them intelligently, and generates conventional commit messages that accurately reflect the nature of the changes.

## 📚 Documentation Structure

### 🚀 Getting Started
* [Quick Start Guide](Quick-Start-Guide) - Get up and running in minutes
* [Installation](Installation) - Installation instructions for various environments
* [Basic Usage](Basic-Usage) - Core commands and fundamental usage patterns

### 📐 Architecture
* [System Architecture](Architecture/System-Architecture) - High-level overview of DiffSense components
* [Core Components](Architecture/Core-Components) - Detailed description of each system component
* [Data Flow](Architecture/Data-Flow) - How information flows through the system

### 📘 User Guide
* [CLI Commands](User-Guide/CLI-Commands) - Complete reference of all CLI commands
* [Configuration Options](User-Guide/Configuration-Options) - Customizing DiffSense behavior
* [Semantic Commits](User-Guide/Semantic-Commits) - Understanding commit classification

### 🛠️ Advanced Usage
* [Custom Rules](Advanced/Custom-Rules) - Creating your own classification rules
* [CI/CD Integration](Advanced/CI-CD-Integration) - Integrating with CI/CD pipelines
* [API Integration](Advanced/API-Integration) - Using DiffSense programmatically

### 👨‍💻 Developer Guide
* [Contributing](Developer-Guide/Contributing) - How to contribute to DiffSense
* [Code Style](Developer-Guide/Code-Style) - Coding standards and style guidelines
* [Testing](Developer-Guide/Testing) - Testing methodology and practices
* [Development Setup](Developer-Guide/Development-Setup) - Setting up your development environment

### 📅 Project Maintenance
* [Changelog](Project/Changelog) - Complete history of changes
* [Release Process](Project/Release-Process) - How releases are managed
* [Code of Conduct](Project/Code-of-Conduct) - Community guidelines

## 🔑 Key Features

DiffSense enables you to:

## 🚀 Getting Started

* **Detect changes** between commits or branches with high precision
* **Analyze code semantically** through AST (Abstract Syntax Tree) parsing
* **Classify changes** based on configurable rules and patterns
* **Evaluate impact and severity** of code modifications
* **Generate conventional commit messages** automatically
* **Identify breaking changes** that affect versioning
* **Filter changes** by relevance for semantic versioning
* **Integrate with CI/CD pipelines** for automated workflows

## 🔄 Processing Pipeline

DiffSense operates through a sophisticated pipeline architecture:

1. **ChangeDetector** (`src/core/change-detector.ts`) - Identifies modified files between git references
2. **ContextCorrelator** (`src/core/context-correlator.ts`) - Enriches changes with contextual information
3. **SemanticAnalyzer** (`src/core/semantic-analyzer.ts`) - Parses code via AST to understand change semantics
4. **RulesEngine** (`src/core/rules-engine.ts`) - Applies configurable rules to classify changes
5. **ScoringSystem** (`src/core/scoring.ts`) - Assigns priority and impact scores to changes
6. **Reporter** (`src/core/reporter.ts`) - Formats and presents the analysis results

## 📊 Commit Type Classification

DiffSense classifies changes according to the [Conventional Commits](https://www.conventionalcommits.org/) standard:

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New features | Adding a new component or API |
| `fix` | Bug fixes | Correcting calculation errors |
| `docs` | Documentation only | Updating README or JSDoc comments |
| `style` | Code style changes | Formatting, semicolons, etc. |
| `refactor` | Code refactoring | Restructuring without behavior change |
| `test` | Adding/updating tests | New test cases |
| `chore` | Maintenance tasks | Dependency updates, build changes |

Breaking changes are denoted with an exclamation mark (e.g., `feat!: breaking API change`).

## 🔍 Future Development Areas

DiffSense has several promising areas for future enhancement:

* **Language-Specific Analyzers** - More precise analysis for additional languages
* **Integration with Issue Trackers** - Automatic linking of commits to issues
* **Enhanced Machine Learning** - Improved classification through ML algorithms
* **Plugin System** - Extensible architecture for custom analyzers and reporters
* **Visual Reports** - Rich graphical representation of changes

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](Developer-Guide/Contributing) for guidelines on how to contribute to DiffSense.

## 📄 License

DiffSense is licensed under the MIT License - see the [LICENSE](https://github.com/ArthurProjectCorrea/diffsense/blob/main/LICENSE) file for details.
