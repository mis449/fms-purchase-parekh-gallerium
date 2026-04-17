/**
 * Helper to determine if a specific data item (row) belongs to the authorized firm of the user.
 * @param {string|string[]} userFirm - The user's assigned firm name(s) (can be 'all').
 * @param {string} rowFirm - The firm name assigned to the data row.
 * @returns {boolean} - True if access is allowed.
 */
export const canViewFirm = (userFirm, rowFirm) => {
  if (!userFirm) return false;
  
  const normalizedUserFirm = Array.isArray(userFirm) 
    ? userFirm.map(f => String(f).toLowerCase().trim())
    : [String(userFirm).toLowerCase().trim()];

  if (normalizedUserFirm.includes("all")) return true;
  if (!rowFirm) return false;

  const normalizedRowFirm = String(rowFirm).toLowerCase().trim();
  return normalizedUserFirm.includes(normalizedRowFirm);
};
