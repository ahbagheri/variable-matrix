export const DETECT_SEPARATORS = ['-', '_', '.', ' '];
export const API_VERSION = '7.1';

// Well-known Azure DevOps service id for per-project/user extension storage.
export const EXTENSION_DATA_SERVICE_ID = 'ms.vss-features.extension-data-service';

// The environment key treated as "common to all environments". Variables in this
// group are shown as shared: editable only here, disabled in other env columns.
export const SHARED_ENV_KEY = 'shared';

// Azure DevOps rejects empty variable groups, so a new/empty group is seeded
// with this placeholder variable that the user can rename or replace.
export const PLACEHOLDER_VARIABLE = 'PLACEHOLDER';

// Each environment has a canonical key plus the aliases that map onto it.
// Group name suffixes matching any alias are treated as the same environment.
// Alias matching is case-insensitive; lowercase and PascalCase are both listed
// for clarity so either casing (e.g. "dev" or "Dev") is obviously supported.
export const DEFAULT_ENV_DEFS = [
  { key: 'shared', aliases: ['shared', 'Shared', 'common', 'Common'] },
  { key: 'dev', aliases: ['dev', 'Dev', 'develop', 'Develop', 'development', 'Development'] },
  { key: 'qa', aliases: ['qa', 'Qa', 'QA'] },
  { key: 'uat', aliases: ['uat', 'Uat', 'UAT'] },
  { key: 'staging', aliases: ['staging', 'Staging', 'stage', 'Stage', 'stg', 'Stg'] },
  { key: 'production', aliases: ['production', 'Production', 'prod', 'Prod'] },
];

export const DEFAULT_SEPARATOR = '-';
