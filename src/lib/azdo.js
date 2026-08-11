import * as SDK from 'azure-devops-extension-sdk';
import { API_VERSION, PLACEHOLDER_VARIABLE } from './constants.js';

// Initializes the Azure DevOps Extension SDK and resolves the runtime context
// (project, host, org URL, and access token) needed for REST calls.
export async function initAzureDevOps() {
  let project;
  let orgUrl;
  let host;
  try {
    await SDK.init({ loaded: false, applyTheme: true });
    await withTimeout(SDK.ready(), 10000, 'SDK.ready()');

    host = SDK.getHost();
    const webContext = SDK.getWebContext();

    if (!webContext?.project?.id) {
      throw new Error('Open Variable Matrix inside an Azure DevOps project.');
    }
    if (!host?.isHosted) {
      throw new Error('This extension currently supports Azure DevOps Services only.');
    }

    project = webContext.project;
    orgUrl = `https://dev.azure.com/${encodeURIComponent(host.name)}`;

    // Release the host spinner before the slower token / REST work runs.
    await SDK.notifyLoadSucceeded();
  } catch (error) {
    // Only pre-load failures should notify the host; later failures are surfaced in-app.
    await notifyLoadFailed(error);
    throw error;
  }

  const token = await withTimeout(SDK.getAccessToken(), 10000, 'SDK.getAccessToken()');

  return { host, project, orgUrl, token };
}

export async function notifyLoadFailed(error) {
  try {
    await SDK.notifyLoadFailed(error);
  } catch (notifyError) {
    console.error('[Variable Matrix] notifyLoadFailed failed:', notifyError);
  }
}

export function withTimeout(promise, milliseconds, name) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${name} timed out after ${milliseconds / 1000} seconds`));
      }, milliseconds);
    }),
  ]);
}

async function apiFetch(ctx, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.message || body?.error?.message || JSON.stringify(body);
    } catch (_) {
      detail = await response.text();
    }
    throw new Error(`${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`);
  }
  return response;
}

export async function fetchVariableGroups(ctx) {
  const groups = [];
  let continuationToken = null;
  do {
    const url = new URL(
      `${ctx.orgUrl}/${encodeURIComponent(ctx.project.id)}/_apis/distributedtask/variablegroups`
    );
    url.searchParams.set('api-version', API_VERSION);
    url.searchParams.set('$top', '100');
    if (continuationToken) url.searchParams.set('continuationToken', continuationToken);
    const response = await apiFetch(ctx, url.toString());
    const data = await response.json();
    groups.push(...(data.value || []));
    continuationToken = response.headers.get('x-ms-continuationtoken');
  } while (continuationToken);
  return groups;
}

export async function updateVariableGroup(ctx, group) {
  const url = `${ctx.orgUrl}/_apis/distributedtask/variablegroups/${group.id}?api-version=${API_VERSION}`;
  await apiFetch(ctx, url, {
    method: 'PUT',
    body: JSON.stringify(variableGroupPayload(ctx, group)),
  });
}

export async function createVariableGroup(ctx, name, variables) {
  // Azure DevOps requires at least one variable; seed a placeholder if empty.
  const hasVariables = variables && Object.keys(variables).length > 0;
  const payload = {
    name,
    description: 'Created by Variable Matrix',
    type: 'Vsts',
    providerData: null,
    variables: hasVariables ? variables : { [PLACEHOLDER_VARIABLE]: { value: '', isSecret: false } },
    variableGroupProjectReferences: [
      {
        name,
        description: 'Created by Variable Matrix',
        projectReference: { id: ctx.project.id, name: ctx.project.name },
      },
    ],
  };
  const url = `${ctx.orgUrl}/_apis/distributedtask/variablegroups?api-version=${API_VERSION}`;
  await apiFetch(ctx, url, { method: 'POST', body: JSON.stringify(payload) });
}

// Deletes a variable group from the project. Azure DevOps requires projectIds
// so the group is unlinked/removed from the current project.
export async function deleteVariableGroup(ctx, groupId) {
  const url =
    `${ctx.orgUrl}/_apis/distributedtask/variablegroups/${groupId}` +
    `?projectIds=${encodeURIComponent(ctx.project.id)}&api-version=${API_VERSION}`;
  await apiFetch(ctx, url, { method: 'DELETE' });
}

export function variableGroupPayload(ctx, group) {
  const variables = {};
  for (const [name, variable] of Object.entries(group.variables || {})) {
    if (variable.isSecret) {
      variables[name] = {
        isSecret: true,
        isReadOnly: !!variable.isReadOnly,
        // Untouched secrets are sent as null so the existing value is preserved.
        value: variable._secretChanged ? String(variable.value ?? '') : null,
      };
    } else {
      variables[name] = {
        isSecret: false,
        isReadOnly: !!variable.isReadOnly,
        value: String(variable.value ?? ''),
      };
    }
  }

  const refs =
    Array.isArray(group.variableGroupProjectReferences) && group.variableGroupProjectReferences.length
      ? group.variableGroupProjectReferences
      : [
          {
            name: group.name,
            description: group.description || '',
            projectReference: { id: ctx.project.id, name: ctx.project.name },
          },
        ];

  return {
    name: group.name,
    description: group.description || '',
    type: group.type || 'Vsts',
    providerData: group.providerData || null,
    variableGroupProjectReferences: refs,
    variables,
  };
}
