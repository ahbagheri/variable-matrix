# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-08-11

### Changed
- Published under the Marketplace id `variablematrix` and made the listing public.

### Fixed
- Production build uses a relative asset base so the deployed hub loads from the
  Marketplace CDN (absolute `/dist/...` paths previously 403'd).

## [1.0.0] - 2026-08-10

### Added
- React 19 + Vite implementation of the Variable Matrix hub.
- Environment matrix with per-application selection and per-environment columns.
- Environment detection via configurable, case-insensitive aliases.
- `shared` environment handling (shared variables read-only in other columns).
- Standalone (no-environment) variable groups.
- Inline editing; add/remove a variable per environment or across all environments.
- Secret-safe editing (existing secrets never revealed).
- Copy values between environments, and copy into a newly created environment.
- Create a missing environment group, and create a whole new application.
- Column-group visibility filter (multi-select dropdown).
- Project-wide settings via the Extension Data Service, with local fallback and a
  permission-aware save.
- Settings environments/aliases editor as an expandable tree.
- Validation for application names, variable names, and separators.
- Light/dark theming that follows the Azure DevOps host, using Azure DevOps design tokens.
- Branded footer, Marketplace overview, and documentation.

[0.4.0]: https://github.com/ahbagheri/variable-matrix/releases/tag/v0.4.0
