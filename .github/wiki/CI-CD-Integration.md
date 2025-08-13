# CI/CD Integration

Esta documentação explica como integrar o DiffSense em pipelines de CI/CD para automatizar a análise de mudanças de código e geração de commits semânticos.

## GitHub Actions

### Análise Automática em PRs

Crie um arquivo `.github/workflows/diffsense-analyze.yml`:

```yaml
name: DiffSense Analysis

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install DiffSense
        run: npm install -g @arthurcorreadev/diffsense
      
      - name: Run DiffSense analysis
        run: |
          diffsense analyze \
            --base ${{ github.event.pull_request.base.sha }} \
            --head ${{ github.event.pull_request.head.sha }} \
            --format json > diffsense-report.json
      
      - name: Comment PR with analysis
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('diffsense-report.json', 'utf8'));
            
            // Criar comentário formatado com os resultados
            let comment = '## 🔍 DiffSense Analysis\n\n';
            
            if (report.breakingChanges && report.breakingChanges.length > 0) {
              comment += '### ⚠️ Breaking Changes Detected\n\n';
              report.breakingChanges.forEach(change => {
                comment += `- \`${change.file}\`: ${change.description}\n`;
              });
              comment += '\n';
            }
            
            comment += `### 📊 Change Summary\n\n`;
            comment += `- 🔴 Breaking: ${report.stats.breaking || 0}\n`;
            comment += `- 🟢 Features: ${report.stats.features || 0}\n`;
            comment += `- 🟡 Fixes: ${report.stats.fixes || 0}\n`;
            comment += `- 🔵 Refactors: ${report.stats.refactors || 0}\n`;
            
            // Postar comentário no PR
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Geração Automática de Changelog

Crie um arquivo `.github/workflows/diffsense-changelog.yml`:

```yaml
name: Generate Changelog

on:
  push:
    tags:
      - 'v*'

jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install DiffSense
        run: npm install -g @arthurcorreadev/diffsense
      
      - name: Get previous tag
        id: prevtag
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          echo "PREV_TAG=${PREV_TAG}" >> $GITHUB_ENV
      
      - name: Generate changelog
        run: |
          diffsense changelog \
            --base ${{ env.PREV_TAG }} \
            --head ${{ github.ref_name }} \
            --format markdown > CHANGELOG.md
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          body_path: CHANGELOG.md
          files: |
            CHANGELOG.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## GitLab CI

Crie um arquivo `.gitlab-ci.yml`:

```yaml
stages:
  - analyze
  - build
  - deploy

diffsense-analyze:
  stage: analyze
  image: node:18-alpine
  script:
    - npm install -g @arthurcorreadev/diffsense
    - diffsense analyze --base $CI_MERGE_REQUEST_DIFF_BASE_SHA --head $CI_COMMIT_SHA --format json > diffsense-report.json
  artifacts:
    paths:
      - diffsense-report.json
    expire_in: 1 week
  only:
    - merge_requests

build:
  stage: build
  script:
    # Build steps...
  needs:
    - diffsense-analyze
```

## Jenkins Pipeline

Crie um arquivo `Jenkinsfile`:

```groovy
pipeline {
    agent {
        docker {
            image 'node:18-alpine'
        }
    }
    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g @arthurcorreadev/diffsense'
            }
        }
        stage('Analyze') {
            steps {
                script {
                    def GIT_PREVIOUS = sh(script: 'git rev-parse HEAD~1', returnStdout: true).trim()
                    def GIT_CURRENT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    
                    sh "diffsense analyze --base ${GIT_PREVIOUS} --head ${GIT_CURRENT} --format json > diffsense-report.json"
                    
                    def report = readJSON file: 'diffsense-report.json'
                    
                    if (report.breakingChanges && report.breakingChanges.size() > 0) {
                        echo "⚠️ Breaking changes detected! Review required."
                        currentBuild.description = "⚠️ Contains breaking changes"
                    }
                }
            }
        }
    }
}
```

## CircleCI

Crie um arquivo `.circleci/config.yml`:

```yaml
version: 2.1
jobs:
  analyze:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run:
          name: Install DiffSense
          command: npm install -g @arthurcorreadev/diffsense
      - run:
          name: Run analysis
          command: |
            diffsense analyze \
              --base origin/main \
              --head ${CIRCLE_SHA1} \
              --format json > diffsense-report.json
      - store_artifacts:
          path: diffsense-report.json
          destination: diffsense-report.json

workflows:
  version: 2
  build-and-analyze:
    jobs:
      - analyze
```

## Integração com Sistemas de Code Review

### GitHub Pull Request Checks

O DiffSense pode ser configurado para executar verificações automáticas em PRs:

1. Configure um webhook do GitHub para acionar o serviço DiffSense
2. O serviço analisa o PR e atualiza o status via API GitHub
3. Defina políticas de branch protection que exigem verificação do DiffSense

### Gerenciamento de Versões Automático

Para automatizar o gerenciamento de versões com base nas análises:

```yaml
name: Auto Version

on:
  push:
    branches: [ main ]

jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install DiffSense
        run: npm install -g @arthurcorreadev/diffsense
      
      - name: Determine version bump
        id: version
        run: |
          BUMP_TYPE=$(diffsense version-bump)
          echo "bump=${BUMP_TYPE}" >> $GITHUB_OUTPUT
      
      - name: Bump version
        if: steps.version.outputs.bump != 'none'
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          npm version ${{ steps.version.outputs.bump }}
          git push --follow-tags
```
