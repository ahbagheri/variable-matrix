// Shared validation for group/application/variable names and separators.
// Rules chosen to keep generated variable-group names and pipeline variable
// names valid and to keep environment-suffix detection working.

export const SEPARATOR_CHARS = ['-', '_', '.', ' '];

const APP_NAME_RE = /^[A-Za-z0-9 ._-]+$/;
const VARIABLE_NAME_RE = /^[A-Za-z0-9._-]+$/;
const ENV_KEY_RE = /^[A-Za-z0-9._-]+$/;

// Returns an error string, or '' when valid.
export function validateApplicationName(name) {
  const value = String(name ?? '').trim();
  if (!value) return 'Application name is required.';
  if (value.length > 100) return 'Application name must be 100 characters or fewer.';
  if (!APP_NAME_RE.test(value)) return 'Use only letters, numbers, spaces, and . _ -';
  return '';
}

export function validateVariableName(name) {
  const value = String(name ?? '').trim();
  if (!value) return 'Variable name is required.';
  if (value.length > 256) return 'Variable name must be 256 characters or fewer.';
  if (!VARIABLE_NAME_RE.test(value)) return 'Use only letters, numbers, and . _ - (no spaces).';
  return '';
}

export function validateEnvKey(key) {
  const value = String(key ?? '').trim();
  if (!value) return 'Environment name is required.';
  if (value.length > 100) return 'Environment name must be 100 characters or fewer.';
  if (!ENV_KEY_RE.test(value)) return 'Use only letters, numbers, and . _ - (no spaces).';
  return '';
}

// The separator must be a single character from the detected set so newly
// created groups are still parsed back into application + environment.
export function validateSeparator(separator) {
  const value = String(separator ?? '');
  if (value.length !== 1) return 'Separator must be a single character.';
  if (!SEPARATOR_CHARS.includes(value)) return 'Separator must be one of  -  _  .  or a space.';
  return '';
}
