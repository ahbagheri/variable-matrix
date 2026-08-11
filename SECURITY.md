# Security Policy

## Supported versions

Only the latest released version of Variable Matrix receives security fixes.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately using one of the following:

- **GitHub Security Advisories** (preferred): open a private report at
  <https://github.com/ahbagheri/variable-matrix/security/advisories/new>.
- **Email:** contact the maintainer via the address on the
  [GitHub profile](https://github.com/ahbagheri).

Please include:

- A description of the issue and its impact.
- Steps to reproduce (proof of concept if possible).
- Affected version and environment (Azure DevOps Services, browser).
- Any suggested remediation.

**Do not include real secret values** (passwords, tokens, connection strings)
in your report.

### What to expect

- Acknowledgement within **3 business days**.
- An initial assessment and severity classification within **7 business days**.
- Coordinated disclosure: we will agree on a timeline and credit you (if you
  wish) once a fix is released.

## Security model

Variable Matrix runs entirely in the browser as an Azure DevOps hub extension.
It has **no backend** of its own; all data access goes through the Azure DevOps
REST APIs using the signed-in user's token.

- **Scope:** the extension requests only `vso.variablegroups_manage`.
- **Authentication:** uses the Azure DevOps Extension SDK access token
  (`SDK.getAccessToken()`); no credentials are stored by the extension.
- **Secret handling:** Azure DevOps returns existing secret values as `null` and
  they are **never displayed**. Untouched secrets are re-sent as
  `{ isSecret: true, value: null }` to preserve them; only a value you explicitly
  type is written. Secrets are never logged.
- **Settings storage:** environment/alias configuration is stored via the Azure
  DevOps Extension Data Service (project-scoped) or the browser `localStorage`
  fallback. No variable values are persisted by the extension outside Azure
  DevOps.
- **Output safety:** all user-controlled content is rendered through React,
  which escapes output by default.

## Handling of secrets — user guidance

- Do not switch an existing secret to non-secret unless you intend to replace its
  value; the original secret cannot be recovered through the API.
- Treat any exported or copied non-secret values as configuration data and store
  them accordingly.
