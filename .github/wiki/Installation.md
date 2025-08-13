# Installation

This guide walks you through the different ways to install and configure DiffSense.

## Prerequisites

- Node.js 18.0.0 or higher
- npm 7.0.0 or higher (or yarn/pnpm equivalent)
- Git (required for repository analysis)

## Global Installation

For command-line usage across all projects:

```bash
npm install -g @arthurcorreadev/diffsense
```

After global installation, you can use the `diffsense` command from anywhere:

```bash
diffsense --version
diffsense analyze --help
```

## Local Installation

For project-specific usage:

```bash
# Navigate to your project
cd your-project

# Install as a development dependency
npm install --save-dev @arthurcorreadev/diffsense
```

After local installation, use with npx:

```bash
npx diffsense --version
npx diffsense analyze --help
```

## Installation Options

### Using Yarn

```bash
# Global
yarn global add @arthurcorreadev/diffsense

# Local
yarn add --dev @arthurcorreadev/diffsense
```

### Using pnpm

```bash
# Global
pnpm add --global @arthurcorreadev/diffsense

# Local
pnpm add --save-dev @arthurcorreadev/diffsense
```

## Verification

To verify your installation:

```bash
diffsense --version
# or if locally installed
npx diffsense --version
```

## Troubleshooting

If you encounter permission issues during global installation:

```bash
# On Windows, run PowerShell as Administrator
# On macOS/Linux:
sudo npm install -g @arthurcorreadev/diffsense
```

If you encounter other installation issues:

1. Check Node.js version: `node --version`
2. Update npm: `npm install -g npm@latest`
3. Clear npm cache: `npm cache clean --force`
4. Try installation again

## Next Steps

After installation:
- Check out the [Quick Start Guide](Quick-Start-Guide)
- Set up [Project Configuration](Configuration)
- Review [Architecture](Arquitetura) to understand how DiffSense works
