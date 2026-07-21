/**
 * jsonField.js — tiny, dependency-free helpers for JSON columns that round-trip
 * through MySQL/MariaDB sync.
 *
 * A JSON column (items, materials, findings, images, …) can come back from the
 * server as a STRING (e.g. "[{...}]") instead of a parsed array — MariaDB stores
 * JSON as LONGTEXT and the driver does not auto-parse it. Loading such a record
 * and calling `.map()` on the field throws "x.items.map is not a function" and
 * white-screens the page. These helpers coerce the value back to a usable shape
 * regardless of how it was stored.
 */

/** Coerce a JSON field into a real array (parsing a JSON string if needed). */
export const toItemsArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Coerce a JSON field into a plain object (parsing a JSON string if needed). */
export const toObject = (value, fallback = {}) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
};
