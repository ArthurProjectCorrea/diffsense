# DiffSense

Welcome to the official DiffSense documentation wiki!

DiffSense is an intelligent framework for code change analysis and automatic semantic commits.

## 📚 Documentation

### Getting Started
* [Quick Start Guide](Quick-Start-Guide)
* [Installation](Installation)
* [Changelog](Changelog)

### Core Documentation
* [Arquitetura](Arquitetura)
* [Publicação](Publicação)
* [Configuração de Secrets](Configuração-de-Secrets)
* [Secret Configuration](Secret-Configuration)
* [Permissões GitHub](Permissões-GitHub)

### Advanced Topics
* [Custom Rules](Custom-Rules)
* [Semantic Analysis](Semantic-Analysis)
* [Semantic Commits](Semantic-Commits)
* [CI/CD Integration](CI-CD-Integration)

### Development
* [Contributing](Contributing)
* [Code of Conduct](Code-of-Conduct)
* [Development Setup](Development-Setup)

### Examples
* [Basic Usage](Basic-Usage)
* [Commit By Type](Commit-By-Type)
* [API Integration](API-Integration)

## 🚀 Getting Started

```bash
# Global installation
npm install -g @arthurcorreadev/diffsense

# Local installation
npm install --save-dev @arthurcorreadev/diffsense
```

## 📋 Core Features

DiffSense enables you to:

- Detect changes between commits or branches
- Analyze code semantically through AST (Abstract Syntax Tree)
- Classify changes based on configurable rules
- Evaluate impact and severity of changes
- Generate semantic commit suggestions
- Identify breaking changes and improvements
- Group commits by semantic type

## 🛠 Usage Examples

See the [Examples](Examples) section for detailed usage examples.

## 🔄 Processing Flow

DiffSense follows a well-defined processing flow:

1. **ChangeDetector**: Identifies changed files between git references
2. **ContextCorrelator**: Adds context to changes (dependencies, related files)
3. **SemanticAnalyzer**: Analyzes the meaning of changes through AST
4. **RulesEngine**: Applies rules to classify changes
5. **ScoringSystem**: Scores changes by importance and impact
6. **Reporter**: Generates reports and commit suggestions

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](Contributing) for details.

## 📄 License

DiffSense is licensed under the MIT License - see the [LICENSE](https://github.com/ArthurProjectCorrea/diffsense/blob/main/LICENSE) file for details.
