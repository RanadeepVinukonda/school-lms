import type { RouteObject } from 'react-router-dom';
import type { UserRole } from '@/types';
import { checkPermission, type Permission } from '@/utils/permissions';

export type RoleRoute = RouteObject & {
  roles?: UserRole[];
  permission?: Permission;
};

export function filterRoutesByRole(
  routes: RoleRoute[],
  role?: UserRole,
): RouteObject[] {
  if (!role) return [];

  return routes
    .filter((route) => {
      if (route.roles && !route.roles.includes(role)) return false;
      if (route.permission && !checkPermission(role, route.permission)) return false;
      return true;
    })
    .map(({ roles, permission, ...rest }) => rest);
}
