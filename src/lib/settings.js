import { DEFAULT_ENV_DEFS, DEFAULT_SEPARATOR } from './constants.js';
import { normalizeName } from './matrix.js';

export function defaultSettings() {
  return {
    envDefs: DEFAULT_ENV_DEFS.map((def) => ({ key: def.key, aliases: [...def.aliases] })),
    createSeparator: DEFAULT_SEPARATOR,
  };
}

// Accepts stored/loaded data and returns a valid settings object, dropping junk.
export function sanitizeSettings(raw) {
  const result = defaultSettings();
  if (!raw || typeof raw !== 'object') return result;

  if (Array.isArray(raw.envDefs) && raw.envDefs.length) {
    const cleaned = raw.envDefs
      .map((def) => {
        const key = normalizeName(def?.key).toLowerCase();
        if (!key) return null;
        const aliases = Array.isArray(def?.aliases)
          ? def.aliases.map((alias) => normalizeName(alias)).filter(Boolean)
          : [];
        if (!aliases.some((alias) => alias.toLowerCase() === key)) aliases.unshift(key);
        return { key, aliases: [...new Set(aliases)] };
      })
      .filter(Boolean);
    if (cleaned.length) result.envDefs = dedupeByKey(cleaned);
  }

  if (typeof raw.createSeparator === 'string' && raw.createSeparator.length <= 3) {
    result.createSeparator = raw.createSeparator;
  }
  return result;
}

function dedupeByKey(defs) {
  const seen = new Set();
  const out = [];
  for (const def of defs) {
    if (seen.has(def.key)) continue;
    seen.add(def.key);
    out.push(def);
  }
  return out;
}

// Text form used in the settings editor: one env per line, "key: alias1, alias2".
export function envDefsToText(envDefs) {
  return envDefs
    .map((def) => {
      const extras = def.aliases.filter((alias) => alias.toLowerCase() !== def.key);
      return extras.length ? `${def.key}: ${def.aliases.join(', ')}` : def.key;
    })
    .join('\n');
}

export function textToEnvDefs(text) {
  const lines = String(text || '').split('\n');
  const defs = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    const key = normalizeName(colon >= 0 ? trimmed.slice(0, colon) : trimmed).toLowerCase();
    if (!key) continue;
    const aliasPart = colon >= 0 ? trimmed.slice(colon + 1) : '';
    const aliases = aliasPart.split(',').map(normalizeName).filter(Boolean);
    if (!aliases.some((alias) => alias.toLowerCase() === key)) aliases.unshift(key);
    defs.push({ key, aliases: [...new Set(aliases)] });
  }
  return dedupeByKey(defs);
}

function localKey(projectId) {
  return `variable-matrix:${projectId || 'demo'}:settings`;
}

export function loadLocalSettings(projectId) {
  try {
    const raw = localStorage.getItem(localKey(projectId));
    return raw ? sanitizeSettings(JSON.parse(raw)) : null;
  } catch (_) {
    return null;
  }
}

export function saveLocalSettings(projectId, settings) {
  try {
    localStorage.setItem(localKey(projectId), JSON.stringify(settings));
  } catch (_) {
    // Ignore storage failures (private mode, quota); shared save is the primary path.
  }
}
