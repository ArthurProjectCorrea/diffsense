---
applyTo: '**'
---
# DiffSense Wiki Documentation Guidelines

## Core Documentation Principles

1. **Wiki-Only Documentation**: All documentation MUST be maintained exclusively within the `.github/wiki/` directory. Any documentation files found outside this directory (except README files) MUST be removed or migrated to the wiki.

2. **Comprehensive Research**: Before adding new documentation, thoroughly read the entire wiki to determine the appropriate location for your content. Do not create new pages if the topic is already covered elsewhere.

3. **Current State Reflection**: The wiki MUST always reflect the current state of the project. When features are updated or changed, corresponding documentation MUST be updated immediately.

4. **No Duplication**: Content duplication is strictly prohibited. Use cross-references to link related information across wiki pages.

5. **Cross-Referencing**: All wiki pages MUST include appropriate references to other related wiki pages using proper markdown linking syntax.

6. **Technical English**: All documentation MUST be written in clear, concise technical English using appropriate terminology.

7. **Allowed Exceptions**: The ONLY documentation files permitted outside the wiki directory are:
   - `README.md` files (project root and subdirectories)
   - License files
   - Contributing guidelines
   - Code of conduct

## Wiki Structure

The wiki follows this organizational structure for enhanced discoverability:

```
.github/wiki/
├── Home.md                    # Wiki homepage and navigation
├── Getting-Started/           # Onboarding documentation
│   ├── Installation.md
│   ├── Configuration.md
│   └── Quick-Start.md
├── Architecture/              # System design documentation
│   ├── Overview.md
│   ├── Core-Components.md
│   └── Data-Flow.md
├── User-Guide/                # End-user documentation
│   ├── CLI-Commands.md
│   └── Configuration-Options.md
├── Developer-Guide/           # Development documentation
│   ├── Contributing.md
│   ├── Code-Style.md
│   └── Testing.md
├── API-Reference/             # API documentation
│   └── [Module]-API.md
└── Maintenance/               # Project maintenance
    ├── Release-Process.md
    └── Wiki-Management.md
```

## Wiki Management Process

1. **Adding New Content**:
   - Identify the appropriate section based on the content type
   - Create a new file with a descriptive kebab-case name
   - Add a reference to the new page in the Home.md or appropriate parent page

2. **Updating Existing Content**:
   - Locate the relevant page using the wiki structure
   - Maintain the existing format and style while updating information
   - Update cross-references if related pages are affected

3. **Removing Obsolete Content**:
   - Never delete information without ensuring it's truly obsolete
   - Update cross-references to removed content

4. **Wiki Synchronization**:
   - After making changes, use the `pnpm run wiki:sync` command to synchronize with GitHub

## Enforcement

Any documentation found outside the wiki directory (except explicitly allowed files) MUST be migrated to the appropriate wiki location and the original file removed. Consistency in documentation is a critical project requirement.