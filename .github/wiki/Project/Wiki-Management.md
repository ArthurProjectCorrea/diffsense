# Wiki Management Guidelines

This document outlines the standards and processes for maintaining the DiffSense documentation wiki.

## Documentation Principles

1. **Wiki-Only Documentation**: All project documentation must be maintained exclusively within the `.github/wiki/` directory. Documentation files outside this directory (except README files) are not permitted.

2. **Current State Reflection**: Wiki content must always accurately reflect the current state of the project. Documentation must be updated alongside code changes.

3. **No Duplication**: Content duplication is strictly prohibited. Use cross-references to link related information across wiki pages.

4. **Technical English**: All documentation must be written in clear, concise technical English using appropriate terminology.

5. **Structured Organization**: Content must follow the established directory structure and naming conventions.

## Wiki Directory Structure

The DiffSense wiki follows this organizational structure:

```
.github/wiki/
├── Home.md                    # Wiki homepage and navigation
├── Quick-Start-Guide.md       # Getting started quickly
├── Installation.md            # Installation instructions
├── Basic-Usage.md             # Basic usage patterns
├── _Sidebar.md                # Wiki navigation sidebar
├── Architecture/              # System design documentation
│   ├── System-Architecture.md
│   ├── Core-Components.md
│   └── Data-Flow.md
├── User-Guide/                # End-user documentation
│   ├── CLI-Commands.md
│   ├── Configuration-Options.md
│   └── Semantic-Commits.md
├── Advanced/                  # Advanced usage topics
│   ├── Custom-Rules.md
│   ├── CI-CD-Integration.md
│   └── API-Integration.md
├── Developer-Guide/           # Development documentation
│   ├── Contributing.md
│   ├── Code-Style.md
│   ├── Testing.md
│   └── Development-Setup.md
└── Project/                   # Project maintenance
    ├── Changelog.md
    ├── Release-Process.md
    ├── Code-of-Conduct.md
    └── Wiki-Management.md     # This document
```

## File Naming Conventions

- Use kebab-case for all file names (e.g., `System-Architecture.md`)
- Use descriptive, specific file names
- Group related files in appropriate directories
- Prefix ordered sequences with numbers if order matters (e.g., `01-Getting-Started.md`)

## Content Guidelines

### General Formatting

- Use Markdown formatting consistently
- Use headings hierarchically (# for title, ## for sections, etc.)
- Include a descriptive title at the top of each page
- Use code blocks with language specifiers for code examples
- Use tables for structured data
- Include a "See also" section with relevant links at the bottom

### Cross-Referencing

- Link to related pages using relative paths: `[Link Text](../Path/To/Page)`
- Include "See also" sections at the end of documents
- Use meaningful link text (not "click here" or "this link")
- Check links periodically for validity

### Images and Diagrams

- Store images in an `/images` subdirectory within each section
- Use descriptive filenames for images
- Include alt text for all images
- Keep image sizes reasonable (optimize before committing)
- Use SVG format for diagrams when possible

## Wiki Maintenance Process

### Adding New Content

1. Determine the appropriate location based on the content type
2. Create the file with a descriptive kebab-case name
3. Follow the content guidelines above
4. Update the `_Sidebar.md` file if the content should be navigable
5. Add references to the new page from related pages
6. Run `pnpm run wiki:sync` to synchronize with GitHub

### Updating Existing Content

1. Find the appropriate file to update
2. Maintain the existing format and style
3. Ensure changes accurately reflect the current project state
4. Update any cross-references affected by your changes
5. Run `pnpm run wiki:sync` to synchronize with GitHub

### Moving or Renaming Content

1. Create the new file with the correct name/location
2. Copy the content from the old file
3. Update all references to the old file throughout the wiki
4. Remove the old file
5. Update `_Sidebar.md` if necessary
6. Run `pnpm run wiki:sync` to synchronize with GitHub

### Removing Content

1. Ensure the content is truly obsolete before removing
2. Update all references to the removed content
3. Remove the file
4. Update `_Sidebar.md` if necessary
5. Run `pnpm run wiki:sync` to synchronize with GitHub

## Synchronization with GitHub

The wiki content is synchronized with GitHub using the `wiki:sync` script:

```bash
# Synchronize wiki content with GitHub
pnpm run wiki:sync
```

This script:
1. Updates the local wiki content from GitHub
2. Pushes local changes to GitHub
3. Resolves any conflicts automatically where possible

## Review Process

All significant wiki changes should be reviewed:

1. Create a branch for substantial documentation changes
2. Submit a pull request for review
3. Request feedback from relevant team members
4. Address any feedback
5. Merge and synchronize with GitHub

## Best Practices

1. Keep documentation close to the code it documents
2. Update documentation as part of the development process
3. Use concrete examples wherever possible
4. Explain "why" not just "how"
5. Regularly review and update existing documentation
6. Consider the audience's level of expertise
7. Use diagrams for complex concepts

By following these guidelines, we ensure that the DiffSense documentation remains a valuable, up-to-date resource for all users and contributors.

See also:
- [Contributing](../Developer-Guide/Contributing)
- [Home](../Home)
