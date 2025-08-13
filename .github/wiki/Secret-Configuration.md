# Secret Configuration for CI/CD

For the automated npm publication process to work correctly through GitHub Actions, you will need to configure some secrets in your GitHub repository.

## Configure NPM Token

1. **Generate an access token in npm**:
   - Log in to your npm account at [npmjs.com](https://www.npmjs.com/)
   - Access your settings by clicking on your avatar in the top right corner
   - Go to "Access Tokens"
   - Click "Generate New Token" and select "Automation"
   - Copy the generated token (it will only be shown once)

2. **Add the token as a secret in GitHub**:
   - Go to your repository on GitHub
   - Access "Settings" > "Secrets and variables" > "Actions"
   - Click on "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste the token generated in the previous step
   - Click "Add secret"

## Required Permissions for GitHub Token

When configuring GitHub Actions for CI/CD, the GitHub token needs the following permissions:

1. **For CI workflow** (tests, lint, build):
   - `contents:read` - To read the repository code
   - `actions:read` - To execute actions

2. **For publication workflow** (npm publish):
   - `contents:read` - To read the repository code
   - `contents:write` - To create tags and releases (if needed)
   - `packages:write` - If also publishing to GitHub Packages

3. **For protected branches** (if applicable):
   - `pull_requests:write` - To interact with pull requests
   - `checks:write` - To post verification status

## Additional Secret Configuration

For larger projects, you may need the following additional secrets:

1. **Environment Credentials**:
   - `STAGING_API_KEY` - For testing in staging environment
   - `PRODUCTION_API_KEY` - For production deployments

2. **Code Analysis Configuration**:
   - `SONAR_TOKEN` - For integration with SonarCloud/SonarQube
   - `CODECOV_TOKEN` - For code coverage analysis

## Additional Security

1. **Limit Secret Scope**:
   - Configure secrets to be available only on specific branches
   - Use GitHub environments to control where secrets can be used

2. **Token Rotation**:
   - Regenerate your tokens periodically
   - Immediately revoke tokens that may have been exposed
