// Converts snake_case object keys to camelCase (top-level + nested)
export function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj === null || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      const camelKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      // Don't recursively transform JSONB fields stored as arrays/objects from DB
      const skipRecursion = ['skills', 'education', 'emergency_contact', 'emergencyContact'].includes(k);
      return [camelKey, skipRecursion ? v : toCamel(v)];
    })
  );
}

// Removes password_hash from employee objects before sending to client
export function sanitizeEmployee(emp) {
  if (!emp) return null;
  const { password_hash, ...safe } = emp;
  return toCamel(safe);
}
