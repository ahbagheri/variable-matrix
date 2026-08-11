import * as SDK from 'azure-devops-extension-sdk';
import { EXTENSION_DATA_SERVICE_ID } from './constants.js';

const COLLECTION = 'settings';

// Resolves the extension data manager backed by Microsoft-hosted extension storage.
async function getManager() {
  const token = await SDK.getAccessToken();
  const dataService = await SDK.getService(EXTENSION_DATA_SERVICE_ID);
  return dataService.getExtensionDataManager(SDK.getExtensionContext().id, token);
}

// Reads project-scoped shared settings. Returns null when none are stored.
export async function loadSharedSettings(projectId) {
  try {
    const manager = await getManager();
    const doc = await manager.getDocument(COLLECTION, projectId).catch(() => null);
    return doc?.settings ?? null;
  } catch (_) {
    return null;
  }
}

// Persists project-scoped shared settings; throws if the user lacks permission.
export async function saveSharedSettings(projectId, settings) {
  const manager = await getManager();
  const existing = await manager.getDocument(COLLECTION, projectId).catch(() => null);
  const doc = { ...(existing || {}), id: projectId, settings };
  await manager.setDocument(COLLECTION, doc);
}

// Heuristic: a write rejected for authorization reasons versus a transient error.
export function isPermissionError(error) {
  const status = error?.status ?? error?.statusCode;
  if (status === 401 || status === 403) return true;
  const message = String(error?.message || error || '').toLowerCase();
  return /permission|forbidden|denied|unauthor|not\s+allowed/.test(message);
}
