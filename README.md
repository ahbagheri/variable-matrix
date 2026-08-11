# Variable Matrix

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Azure DevOps extension](https://img.shields.io/badge/Azure%20DevOps-extension-0078d4?logo=azuredevops&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Built with Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)

An Azure DevOps extension that displays and edits **Azure Pipelines Library variable groups** as an environment matrix — one row per variable, one column per environment — for a selected application.

Built with **React 19 + Vite**, styled to the **Azure DevOps design system**, and packaged with **tfx-cli**.

> Marketplace overview lives in [`overview.md`](overview.md). This README is the developer guide.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Build & package](#build--package)
- [Configuration & environments](#configuration--environments)
- [How it works](#how-it-works)
- [Settings storage & permissions](#settings-storage--permissions)
- [Security](#security)
- [Testing](#testing)
- [Marketplace: overview, Q&A, and support](#marketplace-overview-qa-and-support)
- [License](#license)

---

## Features

- Environment matrix per application (`shared`, `dev`, `qa`, `uat`, `staging`, `production`, plus any custom env).
- Environment detection by name suffix with configurable, case‑insensitive **aliases**.
- **Shared** group handling: shared variables are edited once and read‑only in other columns.
- Standalone (no‑environment) groups shown on their own.
- Inline editing; add/remove a variable per environment or across all at once.
- Secret‑safe editing (existing secrets never revealed).
- Copy values between environments, or into a newly created environment.
- Create a missing environment group, or a whole new application.
- Column‑group visibility filter (shared / other environments).
- Project‑wide settings via Extension Data Service, with local fallback.
- Light/dark theme that follows the Azure DevOps host.
- Input validation for application names, variable names, and separators.

## Tech stack

| Concern | Choice |
| --- | --- |
| UI | React 19 (`react`, `react-dom`) |
| Build / dev server | Vite 8 (`@vitejs/plugin-react`), HTTPS via `vite-plugin-mkcert` |
| Styling | SCSS (`sass`) + Azure DevOps design tokens (`azure-devops-ui`, style‑only) |
| Host integration | `azure-devops-extension-sdk` |
| Packaging | `tfx-cli` |
| Tests | Vitest + React Testing Library |

> `azure-devops-ui` is used **only for its SCSS design tokens**, not its React components (which require React 16). Its React‑16 peer dependency is why `.npmrc` sets `legacy-peer-deps=true`.

## Project structure

```
variable-matrix/
├─ index.html                 # Vite entry; mounts #root
├─ vite.config.mjs            # Vite + React plugin + Vitest config
├─ vss-extension.json         # Azure DevOps extension manifest
├─ configs/
│  ├─ dev.json                # local override (baseUri → https://localhost:3500)
│  └─ release.json            # release override (private)
├─ images/                    # icon + marketplace screenshots
├─ overview.md                # Marketplace details/overview
├─ src/
│  ├─ main.jsx                # React bootstrap + providers
│  ├─ App.jsx                 # top-level view (thin)
│  ├─ styles.scss             # design-token-based styles
│  ├─ hooks/
│  │  └─ useVariableMatrix.js # all state (merge-reducer) + actions
│  ├─ lib/
│  │  ├─ azdo.js              # SDK init + Variable Groups REST
│  │  ├─ matrix.js            # parsing, app/column/alias logic
│  │  ├─ groups.js            # immutable group helpers
│  │  ├─ settings.js          # settings model + serialization
│  │  ├─ storage.js           # Extension Data Service (shared settings)
│  │  ├─ validation.js        # name/separator validation
│  │  ├─ constants.js         # defaults, env keys, service ids
│  │  └─ demo.js              # demo-mode data
│  └─ components/
│     ├─ Toolbar/             # app dropdown, column filter, actions
│     ├─ MatrixTable/         # matrix table + Cell
│     ├─ Footer/              # branded footer
│     ├─ Toasts/              # toast provider + hook
│     ├─ modals/              # Add variable / Copy env / Add env group /
│     │                       #   New application / Settings (tree) modals
│     └─ ui/                  # design-system primitives (Button, Dropdown,
│                             #   MultiSelectDropdown, Spinner, ZeroData,
│                             #   MessageCard, Pill, icons)
└─ README.md
```

## Local development

```bash
npm install
npm run dev
```

Vite serves the app over HTTPS at **https://localhost:3500/dist/**.

- **Demo mode** (no Azure DevOps needed): open `https://localhost:3500/dist/index.html?demo=1`.
- **Test against real Azure DevOps:** package a dev build (below) that points the hub at `localhost:3500`, so you get hot reload while running inside the product.

## Build & package

```bash
npm run build          # Vite build → dist/
npm run package        # build + package a private release .vsix → out/
npm run package:dev    # package a local dev .vsix (baseUri → localhost:3500)
```

- **Release** uses [`configs/release.json`](configs/release.json) (no `baseUri`; everything ships inside the `.vsix`).
- **Dev** uses [`configs/dev.json`](configs/dev.json) (`baseUri: https://localhost:3500`, separate id `variable-matrix-local` so it installs side‑by‑side).

Install the generated `.vsix` by uploading it to your Visual Studio Marketplace publisher, sharing it with your organization, then installing it into the organization.

## Configuration & environments

Open **Settings** (gear icon) to manage environments and aliases in a tree editor:

- Each **environment** is a node; its **aliases** are child leaves.
- The environment **key** is the column header and is always matched.
- **Aliases** (case‑insensitive) match alternate group‑name suffixes.
- **Column order** follows the list; missing environments are hidden.
- The **separator** for newly created groups is a single character (`-`, `_`, `.`, or space).

Defaults: `shared` (aliases `common`), `dev` (`develop`, `development`), `qa`, `uat`, `staging` (`stage`, `stg`), `production` (`prod`).

## How it works

1. `SDK.init({ applyTheme: true })` initializes the host connection and injects theme variables.
2. The app resolves the current project + an access token, then calls the Variable Groups REST API:
   - `GET  {org}/{project}/_apis/distributedtask/variablegroups?api-version=7.1`
   - `PUT  {org}/_apis/distributedtask/variablegroups/{id}?api-version=7.1`
   - `POST {org}/_apis/distributedtask/variablegroups?api-version=7.1`
3. Group names are parsed into **application + environment** using the configured aliases; the matrix is built from that.
4. Edits are staged in memory and flushed on **Save changes**.

## Settings storage & permissions

Environment/alias settings are stored per project via the **Extension Data Service** (`ms.vss-features.extension-data-service`) as a shared document, so the whole project sees the same configuration.

- Saving is **optimistic**: if a shared write is rejected for permission reasons, the change is saved to the browser (`localStorage`) instead and the dialog explains the scope.
- Reads prefer the shared document, then local, then defaults.

## Security

- Requests only the `vso.variablegroups_manage` scope.
- **Secrets are never revealed.** Azure DevOps returns existing secret values as `null`; untouched secrets are re‑sent as `{ isSecret: true, value: null }`. A typed replacement is sent as the new value.
- All user‑rendered values are escaped by React; output is free of the OWASP Top‑10 injection patterns relevant to this surface.

See [SECURITY.md](SECURITY.md) for the full security policy and how to report a vulnerability.

## Testing

```bash
npm test          # run once
npm run test:watch
```

Vitest is configured (jsdom environment) in `vite.config.mjs`. Add test files as `*.test.js(x)` next to the code they cover under `src/`.

## Marketplace: overview, Q&A, and support

Azure DevOps extension listing content is configured in [`vss-extension.json`](vss-extension.json):

- **Overview / instructions tab** → `content.details.path` points to [`overview.md`](overview.md). This is the long description shown on the Marketplace page. (The `README.md` and `LICENSE` are also picked up by `tfx`.)
- **License tab** → `content.license.path` → [`LICENSE`](LICENSE).
- **Repository / Issues / Support links** → the `links` object (`repository`, `issues`, `support`) renders the sidebar links on the listing.
- **Q&A tab** → the Marketplace shows a **Q&A** tab on the extension listing automatically. You choose how it behaves in the **Marketplace publisher portal** (Manage Publishers → your extension → **Q&A**): *Marketplace* (built‑in questions), a *Custom* URL (e.g. your GitHub Discussions/Issues), or *None*. There is no manifest key for Q&A content itself — only the `links.support` sidebar link is authored here.
- **Branding** → `branding` (accent color/theme) and `icons.default`.

Update the `ahbagheri/variable-matrix` URLs in `vss-extension.json` and `package.json` if your repository lives elsewhere.

## License

[MIT](LICENSE) © 2026 Amir H. Bagheri
