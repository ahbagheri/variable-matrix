# Contributing

Thanks for your interest in improving Variable Matrix!

## Prerequisites

- Node.js 18+ and npm.
- An Azure DevOps organization for end-to-end testing (optional; demo mode works without one).

## Setup

```bash
npm install
npm run dev
```

Open `https://localhost:3500/dist/index.html?demo=1` to work against demo data, or package a dev build to test inside Azure DevOps (see the README).

## Workflow

1. Create a branch from `main`.
2. Make your change. Keep components small and colocated (each component in its own folder with an `index.jsx`; closely related siblings may share a folder).
3. Keep business logic in `src/hooks/useVariableMatrix.js` and `src/lib/*`; keep components presentational.
4. Add or update tests (`npm test`) for logic in `src/lib`.
5. Ensure it builds: `npm run build`.
6. Open a pull request describing the change and any UI screenshots.

## Conventions

- **Styling** uses SCSS with Azure DevOps design tokens; prefer the `--vm-*` CSS variables and existing `ui/` primitives over new one-off styles.
- **Secrets** must never be logged or displayed; follow the existing secret-handling pattern.
- **Validation** for user-entered names/separators lives in `src/lib/validation.js`.

## Reporting issues

Use https://github.com/ahbagheri/variable-matrix/issues with steps to reproduce, expected vs. actual behavior, and your Azure DevOps context (Services, project, browser).
