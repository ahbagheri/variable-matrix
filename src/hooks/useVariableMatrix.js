import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useToast } from '../components/Toasts';
import {
  initAzureDevOps,
  fetchVariableGroups,
  updateVariableGroup,
  createVariableGroup,
  deleteVariableGroup,
} from '../lib/azdo.js';
import {
  normalizeGroup,
  isWritable,
  normalizeName,
  buildApplications,
  findApp,
  columnsForApp,
  missingEnvs,
  allVariableNames,
} from '../lib/matrix.js';
import { SHARED_ENV_KEY, PLACEHOLDER_VARIABLE } from '../lib/constants.js';
import { cloneGroup, copyNonSecretInto, newVariable } from '../lib/groups.js';
import {
  defaultSettings,
  sanitizeSettings,
  loadLocalSettings,
  saveLocalSettings,
} from '../lib/settings.js';
import { loadSharedSettings, saveSharedSettings, isPermissionError } from '../lib/storage.js';
import { demoGroupsNormalized } from '../lib/demo.js';
import {
  validateVariableName,
  validateApplicationName,
  validateEnvKey,
  validateSeparator,
} from '../lib/validation.js';

const initialState = {
  loading: true,
  saving: false,
  error: '',
  demo: false,
  project: null,
  groups: [],
  envDefs: defaultSettings().envDefs,
  createSeparator: defaultSettings().createSeparator,
  selectedApp: '',
  search: '',
  modal: null,
  // Optimistic: assume project-wide save is allowed; a denied save flips this off.
  canManage: true,
  // Column-group visibility filters.
  showShared: true,
  showOthers: true,
};

// Merge reducer: dispatch a partial state object or a (prev) => partial updater.
function reducer(state, patch) {
  return { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
}

export function useVariableMatrix() {
  const toast = useToast();
  const [state, patch] = useReducer(reducer, initialState);
  const ctxRef = useRef(null);
  // Always-current snapshot so async handlers read fresh state without stale closures.
  const stateRef = useRef(state);
  stateRef.current = state;

  const apps = useMemo(
    () => buildApplications(state.groups, state.envDefs),
    [state.groups, state.envDefs]
  );
  const appInfo = useMemo(() => findApp(apps, state.selectedApp), [apps, state.selectedApp]);
  const columns = useMemo(
    () => columnsForApp(state.groups, state.envDefs, appInfo),
    [state.groups, state.envDefs, appInfo]
  );
  const variableNames = useMemo(
    () => allVariableNames(columns, state.search),
    [columns, state.search]
  );
  const dirtyCount = useMemo(
    () => state.groups.filter((group) => group._dirty).length,
    [state.groups]
  );
  const missing = useMemo(
    () => (appInfo && !appInfo.standalone ? missingEnvs(columns, state.envDefs) : []),
    [appInfo, columns, state.envDefs]
  );
  const columnEnvs = useMemo(() => columns.map((column) => column.env), [columns]);
  const writableEnvs = useMemo(
    () => columns.filter((column) => isWritable(column.group)).map((column) => column.env),
    [columns]
  );
  const hasSharedColumn = useMemo(
    () => columns.some((column) => !column.standalone && column.env === SHARED_ENV_KEY),
    [columns]
  );
  const hasOtherColumns = useMemo(
    () => columns.some((column) => !column.standalone && column.env !== SHARED_ENV_KEY),
    [columns]
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const params = new URLSearchParams(location.search);
      const isDemo = params.get('demo') === '1' || params.get('demo') === 'true';

      if (isDemo) {
        const settings = loadLocalSettings('demo-project') || defaultSettings();
        const demoGroups = demoGroupsNormalized();
        const demoApps = buildApplications(demoGroups, settings.envDefs);
        if (cancelled) return;
        patch({
          demo: true,
          canManage: true,
          project: { id: 'demo-project', name: 'Checkin Demo' },
          envDefs: settings.envDefs,
          createSeparator: settings.createSeparator,
          groups: demoGroups,
          selectedApp:
            demoApps.find((app) => app.name === 'checkin-webapp')?.name || demoApps[0]?.name || '',
          loading: false,
        });
        return;
      }

      try {
        const context = await initAzureDevOps();
        ctxRef.current = context;
        const shared = await loadSharedSettings(context.project.id);
        const settings = shared
          ? sanitizeSettings(shared)
          : loadLocalSettings(context.project.id) || defaultSettings();
        const raw = await fetchVariableGroups(context);
        const loaded = raw.map(normalizeGroup);
        const loadedApps = buildApplications(loaded, settings.envDefs);
        if (cancelled) return;
        patch({
          project: context.project,
          envDefs: settings.envDefs,
          createSeparator: settings.createSeparator,
          groups: loaded,
          selectedApp: loadedApps[0]?.name || '',
          loading: false,
        });
      } catch (err) {
        if (cancelled) return;
        console.error('[Variable Matrix] Startup failed:', err);
        patch((prev) => ({
          error: err?.message || String(err),
          project: prev.project || { id: 'unknown', name: 'Azure DevOps' },
          loading: false,
        }));
        toast(err?.message || String(err), 'error');
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (stateRef.current.groups.some((group) => group._dirty)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Applies patchFn to a clone of one writable group, replacing it immutably.
  const patchGroup = useCallback(
    (groupId, patchFn) => {
      patch((prev) => ({
        groups: prev.groups.map((group) => {
          if (group.id !== groupId || !isWritable(group)) return group;
          const clone = cloneGroup(group);
          patchFn(clone);
          return clone;
        }),
      }));
    },
    []
  );

  const reloadGroups = useCallback(async (previousApp) => {
    const context = ctxRef.current;
    if (!context) return;
    const raw = await fetchVariableGroups(context);
    const loaded = raw.map(normalizeGroup);
    const loadedApps = buildApplications(loaded, stateRef.current.envDefs);
    const stillThere = loadedApps.some((app) => app.name === previousApp);
    patch({ groups: loaded, selectedApp: stillThere ? previousApp : loadedApps[0]?.name || '' });
  }, []);

  const setValue = useCallback(
    (groupId, name, value) => {
      patchGroup(groupId, (group) => {
        const variable = group.variables[name];
        if (!variable) return;
        variable.value = value;
        if (variable.isSecret) variable._secretChanged = true;
        group._dirty = true;
      });
    },
    [patchGroup]
  );

  const addCell = useCallback(
    (groupId, name) => {
      patchGroup(groupId, (group) => {
        group.variables[name] = newVariable();
        group._dirty = true;
      });
    },
    [patchGroup]
  );

  const deleteCell = useCallback(
    (groupId, name) => {
      const group = stateRef.current.groups.find((g) => g.id === groupId);
      if (!group || !isWritable(group)) return;
      if (!window.confirm(`Remove ${name} from ${group.name}?`)) return;
      patchGroup(groupId, (clone) => {
        delete clone.variables[name];
        clone._dirty = true;
      });
    },
    [patchGroup]
  );

  const toggleSecret = useCallback(
    (groupId, name) => {
      const group = stateRef.current.groups.find((g) => g.id === groupId);
      if (!group || !isWritable(group)) return;
      const variable = group.variables[name];
      if (!variable) return;

      if (variable.isSecret) {
        const replacement = window.prompt(
          `Azure DevOps does not reveal existing secret values.\n\nEnter a replacement plain-text value for ${name}:`,
          ''
        );
        if (replacement === null) return;
        patchGroup(groupId, (clone) => {
          clone.variables[name].isSecret = false;
          clone.variables[name].value = replacement;
          clone.variables[name]._secretChanged = false;
          clone._dirty = true;
        });
      } else {
        patchGroup(groupId, (clone) => {
          clone.variables[name].isSecret = true;
          clone.variables[name]._secretChanged = true;
          clone._dirty = true;
        });
      }
    },
    [patchGroup]
  );

  const deleteVariableEverywhere = useCallback(
    (name) => {
      const targets = columns.filter(
        (column) => isWritable(column.group) && column.group.variables?.[name]
      );
      if (!targets.length) return;
      if (
        !window.confirm(
          `Remove ${name} from all ${targets.length} environment${targets.length === 1 ? '' : 's'}?`
        )
      ) {
        return;
      }
      const ids = new Set(targets.map((column) => column.group.id));
      patch((prev) => ({
        groups: prev.groups.map((group) => {
          if (!ids.has(group.id) || !group.variables?.[name]) return group;
          const clone = cloneGroup(group);
          delete clone.variables[name];
          clone._dirty = true;
          return clone;
        }),
      }));
    },
    [columns]
  );

  const createGroup = useCallback(
    async (env) => {
      const { selectedApp, createSeparator, demo, groups } = stateRef.current;
      if (!selectedApp || !appInfo || appInfo.standalone) return;
      const name = `${selectedApp}${createSeparator}${env}`;
      if (!window.confirm(`Create Azure DevOps variable group "${name}"?`)) return;

      if (demo) {
        const id = Math.max(...groups.map((g) => Number(g.id) || 0), 0) + 1;
        patch((prev) => ({
          groups: [
            ...prev.groups,
            normalizeGroup({
              id,
              name,
              type: 'Vsts',
              description: 'Created by Variable Matrix',
              variables: { [PLACEHOLDER_VARIABLE]: { value: '', isSecret: false } },
            }),
          ],
        }));
        toast(`Created ${name}.`, 'success');
        return;
      }

      try {
        await createVariableGroup(ctxRef.current, name);
        toast(`Created ${name}.`, 'success');
        await reloadGroups(selectedApp);
      } catch (err) {
        toast(`Create failed: ${err.message}`, 'error', 6500);
      }
    },
    [appInfo, reloadGroups, toast]
  );

  const createApplication = useCallback(
    async (rawName, separator, envKeys, seeds = {}) => {
      const { demo, groups } = stateRef.current;
      const name = normalizeName(rawName);
      const nameError = validateApplicationName(name);
      const sepError = validateSeparator(separator);
      if (nameError || sepError) {
        toast(nameError || sepError, 'error');
        return;
      }
      if (!envKeys.length) {
        toast('Select at least one environment.', 'error');
        return;
      }
      // Each new group is seeded with a starter variable (different for shared vs env).
      const seedName = (env) => {
        const seed = normalizeName(env === SHARED_ENV_KEY ? seeds.sharedSeed : seeds.envSeed);
        return validateVariableName(seed) ? PLACEHOLDER_VARIABLE : seed;
      };
      const targets = envKeys.map((env) => ({ env, groupName: `${name}${separator}${env}` }));

      if (demo) {
        let nextId = Math.max(...groups.map((g) => Number(g.id) || 0), 0);
        const created = targets.map(({ env, groupName }) => {
          nextId += 1;
          return normalizeGroup({
            id: nextId,
            name: groupName,
            type: 'Vsts',
            description: 'Created by Variable Matrix',
            variables: { [seedName(env)]: { value: '', isSecret: false } },
          });
        });
        patch((prev) => ({ groups: [...prev.groups, ...created], selectedApp: name, modal: null }));
        toast(`Created ${created.length} group${created.length === 1 ? '' : 's'} for ${name}.`, 'success');
        return;
      }

      patch({ modal: null });
      const failures = [];
      for (const { env, groupName } of targets) {
        try {
          await createVariableGroup(ctxRef.current, groupName, {
            [seedName(env)]: { value: '', isSecret: false },
          });
        } catch (err) {
          failures.push(`${groupName}: ${err.message}`);
        }
      }
      await reloadGroups(name);
      if (failures.length) {
        toast(`Created ${targets.length - failures.length}/${targets.length}. ${failures[0]}`, 'error', 6500);
      } else {
        toast(`Created application ${name} with ${targets.length} environment${targets.length === 1 ? '' : 's'}.`, 'success');
      }
    },
    [reloadGroups, toast]
  );

  const saveAll = useCallback(async () => {
    const { groups, saving, demo, selectedApp } = stateRef.current;
    const dirty = groups.filter((group) => group._dirty);
    if (!dirty.length || saving) return;

    if (demo) {
      patch((prev) => ({
        groups: prev.groups.map((group) => {
          if (!group._dirty) return group;
          const clone = cloneGroup(group);
          clone._dirty = false;
          Object.values(clone.variables).forEach((variable) => (variable._secretChanged = false));
          return clone;
        }),
      }));
      toast('Demo changes saved locally for this session.', 'success');
      return;
    }

    patch({ saving: true });
    const failures = [];
    let saved = 0;
    for (const group of dirty) {
      if (!Object.keys(group.variables).length) {
        failures.push(`${group.name}: a variable group must have at least one variable.`);
        continue;
      }
      try {
        await updateVariableGroup(ctxRef.current, group);
        saved += 1;
      } catch (err) {
        failures.push(`${group.name}: ${err.message}`);
      }
    }
    patch({ saving: false });

    if (failures.length) {
      toast(`Saved ${saved}. Failed ${failures.length}. ${failures[0]}`, 'error', 6500);
    } else {
      toast(`Saved ${saved} variable group${saved === 1 ? '' : 's'}.`, 'success');
    }
    await reloadGroups(selectedApp);
  }, [reloadGroups, toast]);

  const refresh = useCallback(async () => {
    const { groups, demo, selectedApp } = stateRef.current;
    if (
      groups.some((group) => group._dirty) &&
      !window.confirm('Discard unsaved changes and reload from Azure DevOps?')
    ) {
      return;
    }
    if (demo) return;
    patch({ loading: true, error: '' });
    try {
      await reloadGroups(selectedApp);
    } catch (err) {
      toast(err.message || String(err), 'error');
    } finally {
      patch({ loading: false });
    }
  }, [reloadGroups, toast]);

  // Saves settings project-wide, degrading to local storage on denial.
  const persistSettings = useCallback(async (nextSettings) => {
    const { demo, project } = stateRef.current;
    if (demo) {
      saveLocalSettings('demo-project', nextSettings);
      return { scope: 'local' };
    }
    const projectId = project?.id;
    try {
      await saveSharedSettings(projectId, nextSettings);
      saveLocalSettings(projectId, nextSettings);
      patch({ canManage: true });
      return { scope: 'shared' };
    } catch (err) {
      saveLocalSettings(projectId, nextSettings);
      if (isPermissionError(err)) {
        patch({ canManage: false });
        return { scope: 'local', permission: false };
      }
      return { scope: 'local', error: err };
    }
  }, []);

  const submitAddVariable = useCallback(
    (name, selectedEnvs) => {
      const trimmed = normalizeName(name);
      const nameError = validateVariableName(trimmed);
      if (nameError) {
        toast(nameError, 'error');
        return;
      }
      if (!selectedEnvs.length) {
        toast('Select at least one environment.', 'error');
        return;
      }
      const targetIds = new Set(
        columns
          .filter((column) => selectedEnvs.includes(column.env) && isWritable(column.group))
          .map((column) => column.group.id)
      );
      let added = 0;
      patch((prev) => ({
        groups: prev.groups.map((group) => {
          if (!targetIds.has(group.id) || trimmed in group.variables) return group;
          const clone = cloneGroup(group);
          clone.variables[trimmed] = newVariable();
          clone._dirty = true;
          added += 1;
          return clone;
        }),
        modal: null,
      }));
      toast(
        added
          ? `Added ${trimmed} to ${added} environment${added === 1 ? '' : 's'}.`
          : `${trimmed} already exists in the selected environments.`
      );
    },
    [columns, toast]
  );

  const copyToNewEnvironment = useCallback(
    async (source, rawName, overwrite) => {
      const { selectedApp, createSeparator, envDefs, demo, groups } = stateRef.current;
      if (!appInfo || appInfo.standalone) {
        toast('Select an environment-based application first.', 'error');
        return;
      }
      const key = normalizeName(rawName).toLowerCase();
      const keyError = validateEnvKey(key);
      if (keyError) {
        toast(keyError, 'error');
        return;
      }
      const exists = envDefs.some(
        (def) => def.key === key || def.aliases.some((alias) => alias.toLowerCase() === key)
      );
      if (exists) {
        toast(`Environment "${key}" already exists.`, 'error');
        return;
      }

      const groupName = `${selectedApp}${createSeparator}${key}`;
      const nextSettings = sanitizeSettings({
        envDefs: [...envDefs, { key, aliases: [key] }],
        createSeparator,
      });

      patch({ modal: null });

      if (demo) {
        const id = Math.max(...groups.map((g) => Number(g.id) || 0), 0) + 1;
        const base = normalizeGroup({
          id,
          name: groupName,
          type: 'Vsts',
          description: 'Created by Variable Matrix',
          variables: {},
        });
        const { clone, copied, skippedSecrets } = copyNonSecretInto(base, source, overwrite);
        if (!Object.keys(clone.variables).length) {
          clone.variables[PLACEHOLDER_VARIABLE] = newVariable();
        }
        clone._dirty = false;
        saveLocalSettings('demo-project', nextSettings);
        patch((prev) => ({
          envDefs: nextSettings.envDefs,
          createSeparator: nextSettings.createSeparator,
          groups: [...prev.groups, clone],
        }));
        toast(
          `Created ${key} with ${copied} copied value${copied === 1 ? '' : 's'}` +
            (skippedSecrets ? `, skipped ${skippedSecrets} secret${skippedSecrets === 1 ? '' : 's'}` : '') +
            '.',
          'success',
          6000
        );
        return;
      }

      // Build the new group already populated (Azure DevOps rejects empty groups).
      const apiVars = {};
      let copied = 0;
      let skippedSecrets = 0;
      for (const [n, v] of Object.entries(source.variables || {})) {
        if (v.isSecret) {
          skippedSecrets += 1;
          continue;
        }
        apiVars[n] = { value: String(v.value ?? ''), isSecret: false, isReadOnly: !!v.isReadOnly };
        copied += 1;
      }

      try {
        await createVariableGroup(ctxRef.current, groupName, apiVars);
      } catch (err) {
        toast(`Create failed: ${err.message}`, 'error', 6500);
        return;
      }

      patch({ envDefs: nextSettings.envDefs, createSeparator: nextSettings.createSeparator });
      const settingsResult = await persistSettings(nextSettings);

      await reloadGroups(selectedApp);

      const scopeNote =
        settingsResult.scope === 'shared'
          ? 'project settings updated'
          : settingsResult.permission === false
            ? 'settings saved locally (no permission)'
            : 'settings saved locally';
      toast(
        `Created ${key}; ${scopeNote}. Copied ${copied} value${copied === 1 ? '' : 's'}` +
          (skippedSecrets ? `, skipped ${skippedSecrets} secret${skippedSecrets === 1 ? '' : 's'}` : '') +
          '.',
        'success',
        6500
      );
    },
    [appInfo, persistSettings, reloadGroups, toast]
  );

  const submitCopy = useCallback(
    async (sourceEnv, targetSpec, overwrite) => {
      if (!sourceEnv) {
        toast('Choose a source environment.', 'error');
        return;
      }
      const source = columns.find((column) => column.env === sourceEnv)?.group;
      if (!source) {
        toast('Source environment not found.', 'error');
        return;
      }

      if (targetSpec.type === 'new') {
        await copyToNewEnvironment(source, targetSpec.name, overwrite);
        return;
      }

      const targetEnv = targetSpec.env;
      if (!targetEnv || sourceEnv === targetEnv) {
        toast('Choose two different environments.', 'error');
        return;
      }
      const target = columns.find((column) => column.env === targetEnv)?.group;
      if (!target || !isWritable(target)) {
        toast('The target environment is not writable.', 'error');
        return;
      }

      const { clone, copied, skippedSecrets } = copyNonSecretInto(target, source, overwrite);
      patch((prev) => ({
        groups: prev.groups.map((group) => (group.id === target.id ? clone : group)),
        modal: null,
      }));
      toast(
        `Copied ${copied} variable${copied === 1 ? '' : 's'}.` +
          (skippedSecrets ? ` Skipped ${skippedSecrets} secret${skippedSecrets === 1 ? '' : 's'}.` : '')
      );
    },
    [columns, copyToNewEnvironment, toast]
  );

  const openDeleteEnv = useCallback(
    (env) => {
      const column = columns.find((c) => c.env === env);
      if (!column?.group || !isWritable(column.group)) return;
      const label = column.standalone ? column.group.name : `the ${env} environment`;
      patch({
        modal: {
          type: 'delete',
          title: column.standalone ? 'Delete variable group' : 'Delete environment',
          intro: `Are you sure you want to delete ${label} for "${stateRef.current.selectedApp}"? This cannot be undone.`,
          confirmText: column.group.name,
          groupIds: [column.group.id],
          groupNames: [column.group.name],
          readOnlyCount: 0,
          resultLabel: column.standalone ? column.group.name : `${env} environment`,
        },
      });
    },
    [columns]
  );

  const openDeleteApplication = useCallback(() => {
    if (!appInfo) return;
    const writable = columns.filter((c) => isWritable(c.group));
    const readOnlyCount = columns.length - writable.length;
    if (!writable.length) {
      toast('No writable variable groups to delete for this application.', 'error');
      return;
    }
    patch({
      modal: {
        type: 'delete',
        title: 'Delete application',
        intro: `Are you sure you want to delete the "${appInfo.name}" application? This permanently removes all of its variable groups and cannot be undone.`,
        confirmText: appInfo.name,
        groupIds: writable.map((c) => c.group.id),
        groupNames: writable.map((c) => c.group.name),
        readOnlyCount,
        resultLabel: `application ${appInfo.name}`,
      },
    });
  }, [appInfo, columns, toast]);

  const submitDelete = useCallback(async () => {
    const { modal, demo, selectedApp } = stateRef.current;
    if (!modal || modal.type !== 'delete') return;
    const ids = modal.groupIds || [];
    if (!ids.length) {
      patch({ modal: null });
      return;
    }

    if (demo) {
      patch((prev) => {
        const idSet = new Set(ids);
        const remaining = prev.groups.filter((group) => !idSet.has(group.id));
        const nextApps = buildApplications(remaining, prev.envDefs);
        return {
          groups: remaining,
          selectedApp: nextApps.some((app) => app.name === selectedApp)
            ? selectedApp
            : nextApps[0]?.name || '',
          modal: null,
        };
      });
      toast(`Deleted ${modal.resultLabel}.`, 'success');
      return;
    }

    patch({ modal: null, saving: true });
    const failures = [];
    let deleted = 0;
    for (const id of ids) {
      try {
        await deleteVariableGroup(ctxRef.current, id);
        deleted += 1;
      } catch (err) {
        failures.push(err.message);
      }
    }
    patch({ saving: false });
    await reloadGroups(selectedApp);
    if (failures.length) {
      toast(`Deleted ${deleted}/${ids.length}. ${failures[0]}`, 'error', 6500);
    } else {
      toast(`Deleted ${modal.resultLabel}.`, 'success');
    }
  }, [reloadGroups, toast]);

  const submitSettings = useCallback(
    async (nextEnvDefs, separator) => {
      if (!nextEnvDefs.length) {
        toast('Enter at least one environment.', 'error');
        return;
      }
      const badEnv = nextEnvDefs.find((def) => validateEnvKey(def.key));
      if (badEnv) {
        toast(`Environment "${badEnv.key}": ${validateEnvKey(badEnv.key)}`, 'error');
        return;
      }
      const sepError = validateSeparator(separator);
      if (sepError) {
        toast(sepError, 'error');
        return;
      }
      const nextSettings = sanitizeSettings({ envDefs: nextEnvDefs, createSeparator: separator });
      const { groups, selectedApp, demo } = stateRef.current;
      const nextApps = buildApplications(groups, nextSettings.envDefs);
      patch({
        envDefs: nextSettings.envDefs,
        createSeparator: nextSettings.createSeparator,
        modal: null,
        selectedApp: nextApps.some((app) => app.name === selectedApp)
          ? selectedApp
          : nextApps[0]?.name || '',
      });

      const result = await persistSettings(nextSettings);
      if (result.scope === 'shared') {
        toast('Saved project-wide settings.', 'success');
      } else if (demo) {
        toast('Settings saved for this demo session.', 'success');
      } else if (result.permission === false) {
        toast('No permission to save project-wide settings. Saved to your browser instead.', 'error', 6500);
      } else if (result.error) {
        toast(`Could not save project-wide settings: ${result.error.message}. Saved to your browser instead.`, 'error', 6500);
      } else {
        toast('Settings saved to your browser.', 'success');
      }
    },
    [persistSettings, toast]
  );

  const cellActions = useMemo(
    () => ({ setValue, addCell, deleteCell, toggleSecret, createGroup, deleteVariableEverywhere, deleteEnv: openDeleteEnv }),
    [setValue, addCell, deleteCell, toggleSecret, createGroup, deleteVariableEverywhere, openDeleteEnv]
  );

  const setSelectedApp = useCallback((value) => patch({ selectedApp: value, search: '' }), []);
  const setSearch = useCallback((value) => patch({ search: value }), []);
  const setModal = useCallback((value) => patch({ modal: value }), []);
  const setShowShared = useCallback((value) => patch({ showShared: value }), []);
  const setShowOthers = useCallback((value) => patch({ showOthers: value }), []);

  const openAddVariable = useCallback(() => {
    if (!columns.length) return;
    patch({ modal: { type: 'add-variable' } });
  }, [columns]);

  const openCopy = useCallback(() => {
    if (!appInfo || appInfo.standalone) {
      toast('Select an environment-based application to copy values.', 'error');
      return;
    }
    if (!columnEnvs.length) {
      toast('At least one environment group is required to copy values.', 'error');
      return;
    }
    patch({ modal: { type: 'copy' } });
  }, [appInfo, columnEnvs, toast]);

  const openAddEnv = useCallback(() => {
    if (!appInfo || appInfo.standalone || !missing.length) return;
    patch({ modal: { type: 'add-env' } });
  }, [appInfo, missing]);

  const openNewApplication = useCallback(() => patch({ modal: { type: 'new-app' } }), []);

  return {
    ...state,
    apps,
    appInfo,
    columns,
    variableNames,
    dirtyCount,
    missing,
    columnEnvs,
    writableEnvs,
    hasSharedColumn,
    hasOtherColumns,
    cellActions,
    setSelectedApp,
    setSearch,
    setModal,
    setShowShared,
    setShowOthers,
    openAddVariable,
    openCopy,
    openAddEnv,
    openNewApplication,
    saveAll,
    refresh,
    submitAddVariable,
    submitCopy,
    submitSettings,
    createApplication,
    openDeleteEnv,
    openDeleteApplication,
    submitDelete,
  };
}
