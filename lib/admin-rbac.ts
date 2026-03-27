/**
 * Admin UI RBAC: `super_admin` and `admin` bypass explicit permission codes.
 * Matches backend PermissionsGuard (and RequirePermission decorator docs).
 */
export function hasAdminPermission(
  permissions: string[] | undefined,
  permission: string,
  role: string | undefined
): boolean {
  if (role === "super_admin") return true;
  return permissions?.includes(permission) ?? false;
}
