/**
 * Settings Module Helper Functions
 * Handles templates, roles, permissions, taxes, audit logs, sequences, and migrations
 */

import cachedDb from '@/utils/cachedDbOperations';
import { dbTransaction } from '@/lib/db';
const dbOperations = cachedDb;
import { toast } from 'sonner';

/**
 * ============================================================================
 * SEQUENCE MANAGEMENT (Auto-numbering)
 * ============================================================================
 */

/**
 * Get next number from sequence and increment atomically
 * MUST be called inside a transaction that also creates the record
 */
export async function allocateNextNumber(sequenceKey, tx) {
  if (!tx) {
    throw new Error('allocateNextNumber must be called within a transaction');
  }

  const sequenceStore = tx.objectStore('sequences');
  const getRequest = sequenceStore.get(sequenceKey);

  return new Promise((resolve, reject) => {
    getRequest.onsuccess = () => {
      let sequence = getRequest.result;

      if (!sequence) {
        // Initialize sequence
        sequence = {
          key: sequenceKey,
          nextNumber: 1,
          prefix: '',
          suffix: '',
          format: 'NNNNNN',
          lastAllocated: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const nextNumber = sequence.nextNumber;
      const formattedNumber = formatSequenceNumber(
        nextNumber,
        sequence.prefix,
        sequence.suffix,
        sequence.format
      );

      // Update sequence
      sequence.nextNumber = nextNumber + 1;
      sequence.lastAllocated = formattedNumber;
      sequence.updatedAt = new Date().toISOString();

      const putRequest = sequenceStore.put(sequence);

      putRequest.onsuccess = () => {
        resolve({ nextNumber, formattedNumber, sequence });
      };

      putRequest.onerror = () => {
        reject(putRequest.error);
      };
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
}

/**
 * Format sequence number according to pattern
 */
function formatSequenceNumber(number, prefix = '', suffix = '', format = 'NNNNNN') {
  const paddedNumber = String(number).padStart(format.length, '0');
  return `${prefix}${paddedNumber}${suffix}`;
}

/**
 * Get current sequence without incrementing
 */
export async function getCurrentSequence(sequenceKey) {
  try {
    const sequence = await dbOperations.getById('sequences', sequenceKey);
    return sequence || null;
  } catch (error) {
    console.error('Error getting sequence:', error);
    return null;
  }
}

/**
 * Update sequence configuration
 */
export async function updateSequence(sequenceKey, updates) {
  try {
    const sequence = await getCurrentSequence(sequenceKey);

    if (!sequence) {
      throw new Error(`Sequence ${sequenceKey} not found`);
    }

    const updated = {
      ...sequence,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await dbOperations.update('sequences', sequenceKey, updated);

    // Create audit log
    await createAuditLog({
      actionType: 'sequence_update',
      entityType: 'sequence',
      entityId: sequenceKey,
      description: `Updated sequence ${sequenceKey}`,
      metadata: { updates }
    });

    return updated;
  } catch (error) {
    console.error('Error updating sequence:', error);
    throw error;
  }
}

/**
 * ============================================================================
 * AUDIT LOG MANAGEMENT
 * ============================================================================
 */

/**
 * Create audit log entry
 * Should be called inside transactions for critical operations
 */
export async function createAuditLog(logData, tx = null) {
  const log = {
    id: crypto.randomUUID ? crypto.randomUUID() : generateUUID(),
    userId: logData.userId || 'system',
    actionType: logData.actionType, // e.g., 'invoice_posted', 'payment_recorded', 'migration_run'
    entityType: logData.entityType, // e.g., 'invoice', 'payment', 'settings'
    entityId: logData.entityId || null,
    description: logData.description,
    metadata: logData.metadata || {},
    ipAddress: logData.ipAddress || null,
    userAgent: logData.userAgent || null,
    createdAt: new Date().toISOString()
  };

  if (tx) {
    // Called within transaction
    const auditStore = tx.objectStore('audit_logs');
    return new Promise((resolve, reject) => {
      const request = auditStore.add(log);
      request.onsuccess = () => resolve(log);
      request.onerror = () => reject(request.error);
    });
  } else {
    // Standalone operation
    await dbOperations.insert('audit_logs', log);

    // Also write to disk via Electron
    if (window.electron && window.electron.logging) {
      try {
        await window.electron.logging.writeAuditLog({
          timestamp: log.createdAt,
          userId: log.userId,
          action: log.actionType,
          entity: `${log.entityType}:${log.entityId}`,
          description: log.description,
          metadata: log.metadata
        });
      } catch (error) {
        console.error('Failed to write audit log to disk:', error);
      }
    }

    return log;
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters = {}) {
  try {
    const { userId, actionType, entityType, fromDate, toDate, limit = 100 } = filters;

    let logs = await dbOperations.getAll('audit_logs');

    // Apply filters
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    if (actionType) {
      logs = logs.filter(log => log.actionType === actionType);
    }
    if (entityType) {
      logs = logs.filter(log => log.entityType === entityType);
    }
    if (fromDate) {
      logs = logs.filter(log => log.createdAt >= fromDate);
    }
    if (toDate) {
      logs = logs.filter(log => log.createdAt <= toDate);
    }

    // Sort by date descending
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply limit
    return logs.slice(0, limit);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw error;
  }
}

/**
 * ============================================================================
 * TEMPLATE MANAGEMENT
 * ============================================================================
 */

/**
 * Create or update template
 */
export async function saveTemplate(templateData) {
  try {
    const template = {
      id: templateData.id || crypto.randomUUID(),
      name: templateData.name,
      type: templateData.type, // 'invoice', 'estimate', 'challan', 'email'
      content: templateData.content,
      styles: templateData.styles || {},
      isDefault: templateData.isDefault || false,
      isActive: templateData.isActive !== undefined ? templateData.isActive : true,
      metadata: templateData.metadata || {},
      createdAt: templateData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If setting as default, unset other defaults of same type
    if (template.isDefault) {
      const existingTemplates = await dbOperations.getAll('templates');
      const sameTypeTemplates = existingTemplates.filter(t => t.type === template.type && t.id !== template.id);

      for (const t of sameTypeTemplates) {
        if (t.isDefault) {
          await dbOperations.update('templates', t.id, { ...t, isDefault: false, updatedAt: new Date().toISOString() });
        }
      }
    }

    if (templateData.id) {
      await dbOperations.update('templates', template.id, template);
    } else {
      await dbOperations.insert('templates', template);
    }

    // Create audit log
    await createAuditLog({
      actionType: templateData.id ? 'template_updated' : 'template_created',
      entityType: 'template',
      entityId: template.id,
      description: `${templateData.id ? 'Updated' : 'Created'} template: ${template.name}`,
      metadata: { templateType: template.type }
    });

    return template;
  } catch (error) {
    console.error('Error saving template:', error);
    throw error;
  }
}

/**
 * Get templates by type
 */
export async function getTemplatesByType(type) {
  try {
    const templates = await dbOperations.getByIndex('templates', 'type', type);
    return templates || [];
  } catch (error) {
    console.error('Error getting templates:', error);
    return [];
  }
}

/**
 * Get default template for a type
 */
export async function getDefaultTemplate(type) {
  try {
    const templates = await getTemplatesByType(type);
    return templates.find(t => t.isDefault) || templates[0] || null;
  } catch (error) {
    console.error('Error getting default template:', error);
    return null;
  }
}

/**
 * ============================================================================
 * ROLE & PERMISSION MANAGEMENT
 * ============================================================================
 */

/**
 * Create role with permissions
 */
export async function createRole(roleData, permissions = []) {
  try {
    const result = await dbTransaction(['roles', 'permissions', 'audit_logs'], 'readwrite', async (tx) => {
      const role = {
        id: crypto.randomUUID(),
        name: roleData.name,
        description: roleData.description || '',
        isSystem: roleData.isSystem || false,
        isActive: roleData.isActive !== undefined ? roleData.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add role
      const roleStore = tx.objectStore('roles');
      await new Promise((resolve, reject) => {
        const request = roleStore.add(role);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Add permissions
      const permStore = tx.objectStore('permissions');
      const createdPermissions = [];

      for (const perm of permissions) {
        const permission = {
          id: crypto.randomUUID(),
          roleId: role.id,
          resource: perm.resource, // e.g., 'invoices', 'customers', 'settings'
          actions: perm.actions || [], // e.g., ['create', 'read', 'update', 'delete']
          conditions: perm.conditions || {},
          createdAt: new Date().toISOString()
        };

        await new Promise((resolve, reject) => {
          const request = permStore.add(permission);
          request.onsuccess = () => {
            createdPermissions.push(permission);
            resolve(request.result);
          };
          request.onerror = () => reject(request.error);
        });
      }

      // Create audit log
      await createAuditLog({
        actionType: 'role_created',
        entityType: 'role',
        entityId: role.id,
        description: `Created role: ${role.name}`,
        metadata: { permissions: createdPermissions.length }
      }, tx);

      return { role, permissions: createdPermissions };
    });

    return result;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
}

/**
 * Update role permissions
 */
export async function updateRolePermissions(roleId, newPermissions) {
  try {
    const result = await dbTransaction(['roles', 'permissions', 'audit_logs'], 'readwrite', async (tx) => {
      // Delete existing permissions
      const permStore = tx.objectStore('permissions');
      const roleIdIndex = permStore.index('roleId');
      const existingPerms = await new Promise((resolve, reject) => {
        const request = roleIdIndex.getAll(roleId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      for (const perm of existingPerms) {
        await new Promise((resolve, reject) => {
          const request = permStore.delete(perm.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Add new permissions
      const createdPermissions = [];
      for (const perm of newPermissions) {
        const permission = {
          id: crypto.randomUUID(),
          roleId,
          resource: perm.resource,
          actions: perm.actions || [],
          conditions: perm.conditions || {},
          createdAt: new Date().toISOString()
        };

        await new Promise((resolve, reject) => {
          const request = permStore.add(permission);
          request.onsuccess = () => {
            createdPermissions.push(permission);
            resolve(request.result);
          };
          request.onerror = () => reject(request.error);
        });
      }

      // Update role timestamp
      const roleStore = tx.objectStore('roles');
      const role = await new Promise((resolve, reject) => {
        const request = roleStore.get(roleId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      role.updatedAt = new Date().toISOString();
      await new Promise((resolve, reject) => {
        const request = roleStore.put(role);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Create audit log
      await createAuditLog({
        actionType: 'role_permissions_updated',
        entityType: 'role',
        entityId: roleId,
        description: `Updated permissions for role: ${role.name}`,
        metadata: { permissionsCount: createdPermissions.length }
      }, tx);

      return { role, permissions: createdPermissions };
    });

    return result;
  } catch (error) {
    console.error('Error updating role permissions:', error);
    throw error;
  }
}

/**
 * Check if user has permission
 */
export async function checkPermission(userId, resource, action) {
  try {
    // Get user
    const user = await dbOperations.getById('users', userId);
    if (!user || !user.roleId) return false;

    // Get role permissions
    const permissions = await dbOperations.getByIndex('permissions', 'roleId', user.roleId);

    // Check if permission exists
    const resourcePerm = permissions.find(p => p.resource === resource);
    if (!resourcePerm) return false;

    return resourcePerm.actions.includes(action);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * ============================================================================
 * TAX & GST MANAGEMENT
 * ============================================================================
 */

/**
 * Create or update tax
 */
export async function saveTax(taxData) {
  try {
    const result = await dbTransaction(['taxes', 'audit_logs'], 'readwrite', async (tx) => {
      const tax = {
        id: taxData.id || crypto.randomUUID(),
        code: taxData.code,
        name: taxData.name,
        type: taxData.type, // 'GST', 'IGST', 'CGST', 'SGST', 'CESS'
        rate: parseFloat(taxData.rate),
        accountId: taxData.accountId || null, // Link to tax account
        isActive: taxData.isActive !== undefined ? taxData.isActive : true,
        createdAt: taxData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const taxStore = tx.objectStore('taxes');

      if (taxData.id) {
        await new Promise((resolve, reject) => {
          const request = taxStore.put(tax);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } else {
        await new Promise((resolve, reject) => {
          const request = taxStore.add(tax);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Create audit log
      await createAuditLog({
        actionType: taxData.id ? 'tax_updated' : 'tax_created',
        entityType: 'tax',
        entityId: tax.id,
        description: `${taxData.id ? 'Updated' : 'Created'} tax: ${tax.name} (${tax.rate}%)`,
        metadata: { taxType: tax.type, rate: tax.rate }
      }, tx);

      return tax;
    });

    return result;
  } catch (error) {
    console.error('Error saving tax:', error);
    throw error;
  }
}

/**
 * Get all active taxes
 */
export async function getActiveTaxes() {
  try {
    const taxes = await dbOperations.getAll('taxes');
    return taxes.filter(t => t.isActive);
  } catch (error) {
    console.error('Error getting taxes:', error);
    return [];
  }
}

/**
 * ============================================================================
 * HSN CODE MANAGEMENT
 * ============================================================================
 */

/**
 * Import HSN codes in bulk
 */
export async function importHSNCodes(hsnData) {
  try {
    const result = await dbTransaction(['hsn_codes', 'audit_logs'], 'readwrite', async (tx) => {
      const hsnStore = tx.objectStore('hsn_codes');
      const imported = [];

      for (const data of hsnData) {
        const hsn = {
          id: crypto.randomUUID(),
          hsn: data.hsn,
          description: data.description,
          gstRate: parseFloat(data.gstRate || 0),
          cessRate: parseFloat(data.cessRate || 0),
          createdAt: new Date().toISOString()
        };

        await new Promise((resolve, reject) => {
          const request = hsnStore.add(hsn);
          request.onsuccess = () => {
            imported.push(hsn);
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }

      // Create audit log
      await createAuditLog({
        actionType: 'hsn_codes_imported',
        entityType: 'hsn_codes',
        entityId: null,
        description: `Imported ${imported.length} HSN codes`,
        metadata: { count: imported.length }
      }, tx);

      return imported;
    });

    return result;
  } catch (error) {
    console.error('Error importing HSN codes:', error);
    throw error;
  }
}

/**
 * Search HSN codes
 */
export async function searchHSNCodes(query) {
  try {
    const allCodes = await dbOperations.getAll('hsn_codes');
    const lowerQuery = query.toLowerCase();

    return allCodes.filter(code =>
      code.hsn.toLowerCase().includes(lowerQuery) ||
      code.description.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching HSN codes:', error);
    return [];
  }
}

/**
 * ============================================================================
 * MIGRATION MANAGEMENT
 * ============================================================================
 */

/**
 * Run database migration
 * MUST backup before running
 */
export async function runMigration(migrationScript) {
  try {
    // Check current schema version
    const meta = await dbOperations.getById('meta', 'schemaVersion');
    const currentVersion = meta ? meta.value : 1;

    if (migrationScript.fromVersion !== currentVersion) {
      throw new Error(`Migration version mismatch. Current: ${currentVersion}, Expected: ${migrationScript.fromVersion}`);
    }

    // Backup before migration
    if (window.electron && window.electron.backup) {
      const backupResult = await window.electron.backup.export({
        stores: 'all',
        filter: null
      });

      if (!backupResult.success) {
        throw new Error('Pre-migration backup failed');
      }
    }

    // Create audit log for migration start
    await createAuditLog({
      actionType: 'migration_started',
      entityType: 'schema',
      entityId: `v${migrationScript.fromVersion}_to_v${migrationScript.toVersion}`,
      description: `Migration from v${migrationScript.fromVersion} to v${migrationScript.toVersion} started`,
      metadata: { migrationName: migrationScript.name }
    });

    // Run migration
    const result = await migrationScript.execute();

    // Update schema version
    await dbOperations.update('meta', 'schemaVersion', {
      id: 'schemaVersion',
      value: migrationScript.toVersion,
      updatedAt: new Date().toISOString()
    });

    // Add migration history
    const migrationHistory = await dbOperations.getById('meta', 'migrationHistory');
    const history = migrationHistory ? migrationHistory.value : [];

    history.push({
      fromVersion: migrationScript.fromVersion,
      toVersion: migrationScript.toVersion,
      name: migrationScript.name,
      executedAt: new Date().toISOString(),
      result
    });

    await dbOperations.update('meta', 'migrationHistory', {
      id: 'migrationHistory',
      value: history,
      updatedAt: new Date().toISOString()
    });

    // Create audit log for migration completion
    await createAuditLog({
      actionType: 'migration_completed',
      entityType: 'schema',
      entityId: `v${migrationScript.fromVersion}_to_v${migrationScript.toVersion}`,
      description: `Migration from v${migrationScript.fromVersion} to v${migrationScript.toVersion} completed`,
      metadata: { migrationName: migrationScript.name, result }
    });

    return result;
  } catch (error) {
    console.error('Migration error:', error);

    // Log migration failure
    await createAuditLog({
      actionType: 'migration_failed',
      entityType: 'schema',
      entityId: `v${migrationScript.fromVersion}_to_v${migrationScript.toVersion}`,
      description: `Migration failed: ${error.message}`,
      metadata: { error: error.message, stack: error.stack }
    });

    throw error;
  }
}

/**
 * Utility to generate UUID (fallback)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default {
  allocateNextNumber,
  getCurrentSequence,
  updateSequence,
  createAuditLog,
  getAuditLogs,
  saveTemplate,
  getTemplatesByType,
  getDefaultTemplate,
  createRole,
  updateRolePermissions,
  checkPermission,
  saveTax,
  getActiveTaxes,
  importHSNCodes,
  searchHSNCodes,
  runMigration
};
