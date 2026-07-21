export const normalizeAssignedManager = (source) => {
  const nestedManager = source?.assignedManager || source?.assigned_manager;
  const raw = nestedManager || source || {};
  const hasExplicitAssignedPhone = Boolean(
    raw.assignedManagerPhone ||
    raw.assigned_manager_phone ||
    source?.assigned_manager_phone
  );
  const hasManagerIdentity = Boolean(
    nestedManager ||
    raw.name ||
    raw.assignedManagerName ||
    raw.assigned_manager_name ||
    source?.assigned_manager_name
  );

  const manager = {
    id: raw.id || raw.assigned_manager_id || source?.assigned_manager_id || "",
    name: raw.name || raw.assignedManagerName || raw.assigned_manager_name || source?.assigned_manager_name || "",
    phone: hasManagerIdentity || hasExplicitAssignedPhone
      ? raw.phone || raw.mobile || raw.contactNo || raw.assignedManagerPhone || raw.assigned_manager_phone || source?.assigned_manager_phone || ""
      : "",
    role: raw.role || raw.assignedManagerRole || raw.assigned_manager_role || source?.assigned_manager_role || "",
    email: raw.email || raw.assignedManagerEmail || raw.assigned_manager_email || source?.assigned_manager_email || "",
  };

  if (!manager.name && !manager.phone) return null;
  return manager;
};

export const getAssignedManagerFields = (source) => {
  const manager = normalizeAssignedManager(source);

  return {
    // Local/UI shape (nested object + snake_case)
    assigned_manager: manager,
    assigned_manager_name: manager?.name || "",
    assigned_manager_phone: manager?.phone || "",
    // camelCase columns expected by the backend sync layer (syncTableDefs.cjs).
    // Without these the assigned manager never reaches MySQL.
    assignedManagerId: manager?.id || "",
    assignedManagerName: manager?.name || "",
    assignedManagerPhone: manager?.phone || "",
  };
};

export const getAssignedManagerLabel = (source) => {
  const manager = normalizeAssignedManager(source);
  if (!manager) return "";

  const parts = [];
  if (manager.name) parts.push(manager.name);
  if (manager.phone) parts.push(`Number: ${manager.phone}`);
  return parts.join(" | ");
};
