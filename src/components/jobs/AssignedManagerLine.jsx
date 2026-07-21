import { getAssignedManagerLabel, normalizeAssignedManager } from "@/utils/jobAssignment";

const baseLineClasses = "text-sm font-medium text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-3 py-2";
const baseCellClasses = "p-2 border bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 font-medium";

const AssignedManagerLine = ({ manager, className = "" }) => {
  const label = getAssignedManagerLabel(manager);
  if (!label) return null;

  return (
    <div className={`${baseLineClasses} ${className}`}>
      <span className="font-semibold">Assigned Manager:</span> {label}
    </div>
  );
};

export const AssignedManagerTableRow = ({ manager, colSpan, className = "" }) => {
  const normalized = normalizeAssignedManager(manager);
  if (!normalized) return null;

  return (
    <tr>
      <td colSpan={colSpan} className={`${baseCellClasses} ${className}`}>
        <span className="font-semibold">Assigned Manager:</span> {normalized.name || "--"}
        {normalized.phone && <span className="ml-3">Number: {normalized.phone}</span>}
      </td>
    </tr>
  );
};

export default AssignedManagerLine;
