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

## Reporting & Communication
- **Mandatory Reporting**: At the end of every response where code changes were made, you MUST provide a clear summary of what was discussed and the exact changes implemented.
- **Version and Commit**: You MUST always include the updated version number (e.g., `v2.05.37`) and the commit hash / 1-line English commit message that was pushed.

## Git Workflow
- **Commit & Push**: AI Studio is no longer used. When a task's changes are complete and `npm run lint` passes, stage the changed files, commit with a concise 1-line English message, and push to `origin/main` (GitHub: `tapeino-lab/eternaljump`).
- **Deploy Awareness**: Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages (production). Never push unverified or half-finished changes.
- **Secrets**: Never commit API keys, passwords, or their hashes. They are provided only via environment variables (GitHub Secrets for production, `.env` locally, which is git-ignored).

## State Retention & No Unprompted Reverts
- **Implicit Approval**: Any code modifications made in previous turns that the user does not explicitly mention or complain about must be treated as fully approved.
- **No Reverts**: Never revert, overwrite, or undo previously made changes (e.g. styling, logic, features) unless explicitly instructed to do so by the user. Be extremely careful not to accidentally lose changes when replacing file contents.

<!-- UI sync -->

