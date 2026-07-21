/**
 * Shared helpers: API-first entity load/save with offline queue (Option B).
 */
import { isApiModeEnabled } from '@/api/client';
import {
  listEntities,
  createEntity,
  updateEntity,
  deleteEntity,
} from '@/api/resources';
import { enqueueMutation, canWriteOffline } from '@/utils/webSyncQueue';
import { isOnline } from '@/utils/networkStatus';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function apiListOrLocal(resource, localLoader, params = {}) {
  if (isApiModeEnabled() && isOnline()) {
    try {
      return await listEntities(resource, { limit: 500, ...params });
    } catch (err) {
      console.warn(`[apiEntity] list ${resource} failed, local fallback`, err);
    }
  }
  return localLoader();
}

export async function apiSaveEntity(resource, record, { isUpdate = false, localSave } = {}) {
  const id = record.id || newId();
  const payload = {
    ...record,
    id,
    updated_at: new Date().toISOString(),
    created_at: record.created_at || new Date().toISOString(),
  };

  if (!isApiModeEnabled()) {
    return localSave(payload, isUpdate);
  }

  if (!isOnline()) {
    if (!canWriteOffline(resource)) {
      const err = new Error(`'${resource}' requires internet connection`);
      err.code = 'ONLINE_ONLY';
      throw err;
    }
    await localSave(payload, isUpdate);
    await enqueueMutation({
      table: resource,
      recordId: id,
      operation: 'upsert',
      data: payload,
    });
    return { ...payload, _offline: true };
  }

  try {
    const saved = isUpdate
      ? await updateEntity(resource, id, payload)
      : await createEntity(resource, payload);
    try {
      await localSave(saved, true);
    } catch {
      /* mirror optional */
    }
    return saved;
  } catch (err) {
    if (!canWriteOffline(resource)) throw err;
    await localSave(payload, isUpdate);
    await enqueueMutation({
      table: resource,
      recordId: id,
      operation: 'upsert',
      data: payload,
    });
    return { ...payload, _offline: true };
  }
}

export async function apiDeleteEntity(resource, id, localDelete) {
  if (!isApiModeEnabled()) {
    return localDelete(id);
  }

  if (!isOnline()) {
    if (!canWriteOffline(resource)) {
      const err = new Error(`'${resource}' requires internet connection`);
      err.code = 'ONLINE_ONLY';
      throw err;
    }
    await localDelete(id);
    await enqueueMutation({
      table: resource,
      recordId: id,
      operation: 'delete',
      data: null,
    });
    return { success: true, _offline: true };
  }

  try {
    await deleteEntity(resource, id);
    try {
      await localDelete(id);
    } catch {
      /* ignore */
    }
    return { success: true };
  } catch (err) {
    if (!canWriteOffline(resource)) throw err;
    await localDelete(id);
    await enqueueMutation({
      table: resource,
      recordId: id,
      operation: 'delete',
      data: null,
    });
    return { success: true, _offline: true };
  }
}
