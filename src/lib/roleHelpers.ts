export function hasRole(userRole: string, role: string): boolean {
  return userRole.split(',').map(r => r.trim()).includes(role);
}

export function hasAnyRole(userRole: string, roles: string[]): boolean {
  const userRoles = userRole.split(',').map(r => r.trim());
  return roles.some(r => userRoles.includes(r));
}

export function getPrimaryRole(userRole: string): string {
  const hierarchy: Record<string, number> = {
    super_admin: 100,
    admin: 80,
    teacher: 60,
    student: 20,
    parent: 10,
  };
  const roles = userRole.split(',').map(r => r.trim());
  return roles.sort((a, b) => (hierarchy[b] || 0) - (hierarchy[a] || 0))[0];
}
