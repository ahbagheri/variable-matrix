import { DETECT_SEPARATORS } from './constants.js';

export function normalizeName(value) {
  return String(value || '').trim();
}

export function cloneVariable(variable) {
  return {
    value: variable?.value ?? null,
    isSecret: !!variable?.isSecret,
    isReadOnly: !!variable?.isReadOnly,
    _secretChanged: false,
  };
}

export function normalizeGroup(group) {
  const variables = {};
  Object.entries(group.variables || {}).forEach(([name, variable]) => {
    variables[name] = cloneVariable(variable);
  });
  return { ...group, variables, _dirty: false };
}

export function isWritable(group) {
  return !!group && String(group.type || 'Vsts').toLowerCase() === 'vsts';
}

export function parseGroupName(name, envDefs) {
  const original = String(name || '');
  const lower = original.toLowerCase();
  for (const { alias, env } of aliasIndex(envDefs)) {
    for (const sep of DETECT_SEPARATORS) {
      const suffix = `${sep}${alias}`;
      if (lower.endsWith(suffix) && original.length > suffix.length) {
        return { app: original.slice(0, original.length - suffix.length), env };
      }
    }
  }
  return null;
}

// Flattens env definitions into { alias, env } pairs sorted by alias length so
// longer, more specific aliases (e.g. "development") match before short ones.
function aliasIndex(envDefs) {
  const pairs = [];
  for (const def of envDefs) {
    const aliases = def.aliases?.length ? def.aliases : [def.key];
    for (const alias of aliases) {
      const trimmed = normalizeName(alias).toLowerCase();
      if (trimmed) pairs.push({ alias: trimmed, env: def.key });
    }
  }
  return pairs.sort((a, b) => b.alias.length - a.alias.length);
}

// Builds the application list: env-suffixed groups collapse by shared prefix,
// while groups with no recognized env become standalone entries of their own.
export function buildApplications(groups, envDefs) {
  const envApps = new Map();
  const standalone = new Map();
  for (const group of groups) {
    const parsed = parseGroupName(group.name, envDefs);
    if (parsed) {
      const key = parsed.app.toLowerCase();
      if (!envApps.has(key)) envApps.set(key, parsed.app);
    } else {
      const key = group.name.toLowerCase();
      if (!standalone.has(key)) standalone.set(key, group.name);
    }
  }
  const apps = [
    ...[...envApps.values()].map((name) => ({ name, standalone: false })),
    ...[...standalone.values()].map((name) => ({ name, standalone: true })),
  ];
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

export function findApp(apps, name) {
  return apps.find((app) => app.name === name) || null;
}

// Returns ordered columns for the selected app. Missing environments are simply
// omitted; a standalone library yields a single "value" column.
export function columnsForApp(groups, envDefs, app) {
  if (!app) return [];

  if (app.standalone) {
    const group = groups.find(
      (g) => g.name.toLowerCase() === app.name.toLowerCase() && !parseGroupName(g.name, envDefs)
    );
    return group ? [{ env: 'value', group, standalone: true }] : [];
  }

  const byEnv = new Map();
  for (const group of groups) {
    const parsed = parseGroupName(group.name, envDefs);
    if (parsed && parsed.app.toLowerCase() === app.name.toLowerCase() && !byEnv.has(parsed.env)) {
      byEnv.set(parsed.env, group);
    }
  }
  return envDefs
    .filter((def) => byEnv.has(def.key))
    .map((def) => ({ env: def.key, group: byEnv.get(def.key) }));
}

// Env keys defined in settings that the selected app does not yet have a group for.
export function missingEnvs(columns, envDefs) {
  const present = new Set(columns.map((column) => column.env));
  return envDefs.map((def) => def.key).filter((key) => !present.has(key));
}

export function allVariableNames(columns, search) {
  const names = new Set();
  for (const column of columns) {
    Object.keys(column.group?.variables || {}).forEach((name) => names.add(name));
  }
  const query = (search || '').trim().toLowerCase();
  return [...names]
    .filter((name) => !query || name.toLowerCase().includes(query))
    .sort((a, b) => a.localeCompare(b));
}
