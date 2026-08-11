// Immutable helpers for working with variable-group state.

export function cloneGroup(group) {
  return {
    ...group,
    variables: Object.fromEntries(
      Object.entries(group.variables || {}).map(([name, variable]) => [name, { ...variable }])
    ),
  };
}

// Copies non-secret variables from source into a clone of target, honoring overwrite.
// Returns the clone plus counts for user feedback.
export function copyNonSecretInto(targetGroup, sourceGroup, overwrite) {
  const clone = cloneGroup(targetGroup);
  let copied = 0;
  let skippedSecrets = 0;
  for (const [name, variable] of Object.entries(sourceGroup.variables || {})) {
    if (variable.isSecret) {
      skippedSecrets += 1;
      continue;
    }
    if (!overwrite && clone.variables[name]) continue;
    clone.variables[name] = {
      value: String(variable.value ?? ''),
      isSecret: false,
      isReadOnly: !!variable.isReadOnly,
      _secretChanged: false,
    };
    copied += 1;
  }
  if (copied) clone._dirty = true;
  return { clone, copied, skippedSecrets };
}

export function newVariable(value = '') {
  return { value, isSecret: false, isReadOnly: false, _secretChanged: false };
}
