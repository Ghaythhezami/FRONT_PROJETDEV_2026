const STAFF_ROLES = new Set(['admin', 'po', 'product owner', 'scrum master', 'scrum-master']);

export function isStaffRole(role: string | undefined | null): boolean {
  if (!role?.trim()) {
    return false;
  }
  return STAFF_ROLES.has(role.trim().toLowerCase());
}
