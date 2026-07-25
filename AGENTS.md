# Development Rules & Directives

## Versioning Policy
- **Development / In-Progress**: Unless explicitly declared as a "Stable Release" (安定版), increment the patch version for every code change or fix (e.g., 1.91.00 -> 1.91.01 -> 1.91.02).
- **Stable Release**: When explicitly instructed that the build is a "Stable Release" (安定版), increment the minor version and reset the patch version (e.g., 1.91.05 -> 1.92.00).
- Ensure `package.json` (and any displayed version UI) is updated on every iteration.

## Coding & Planning Workflow
- **Code Execution & Modification**: Do not modify any code, run build tasks, or execute system commands without explicit instructions or approval from the user.
- **Planning Phase**: During brainstorming, discussion, or planning phases, maintain a purely conversational dialogue and refrain from editing files or running commands until explicitly instructed.

## Asset & Font Rendering
- **Canvas Text & Custom Fonts**: Always ensure proper font loading / re-rendering checks for canvas text (such as retro fonts in offscreen canvases) so custom web fonts render reliably without falling back to default system fonts.

## Git Workflow
- **Automatic Commits**: After completing code changes and verifying them, always automatically run `git add .` and `git commit -m "<Appropriate commit message>"` unless instructed otherwise. This ensures commit messages are automatically filled with a descriptive summary of the changes.
