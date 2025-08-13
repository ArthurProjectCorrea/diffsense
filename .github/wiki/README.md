# DiffSense Wiki Management

This directory contains files that are automatically synchronized with the GitHub Wiki repository. The synchronization is managed by the `wiki-sync.yml` workflow.

## How It Works

1. Files in the `/docs` directory are automatically converted and copied to the wiki
2. Files in this directory (`.github/wiki`) are directly copied to the wiki root
3. The synchronization happens automatically on every push to `main` that changes files in either directory
4. You can also manually trigger synchronization via GitHub Actions interface

## Adding Content to the Wiki

### Option 1: Add to `/docs` directory

Place your Markdown files in the main `/docs` directory. These files will be:

- Automatically converted to GitHub Wiki format
- Non-English content will be noted for translation
- File names will be preserved in the wiki

### Option 2: Add directly to this directory

Place your Markdown files in this `.github/wiki` directory when you want:

- Complete control over wiki formatting
- Custom wiki features like sidebar links
- Special wiki-only content

## Naming Conventions

- Use descriptive, hyphenated filenames: `feature-description.md`
- For home page use: `Home.md`
- For sidebar navigation use: `_Sidebar.md`

## Technical Guidelines

- Write clear, concise technical documentation in English
- Use code blocks with language identifiers for syntax highlighting
- Include diagrams where appropriate (using Mermaid or images)
- Link between wiki pages using `[[WikiPage]]` format

## Manual Synchronization

If needed, you can manually trigger synchronization:

1. Go to Actions tab in the GitHub repository
2. Select "Wiki Sync" workflow
3. Click "Run workflow"
4. Check "Force synchronization of all files" if needed
5. Click "Run workflow" button

## Troubleshooting

If synchronization fails:

1. Check if the wiki repository exists
2. Verify GitHub token permissions
3. Review workflow logs for specific errors
