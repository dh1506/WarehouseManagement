export type ModulePermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

const ADMIN_ROLES = new Set(['CEO']);

const ACTION_ALIASES: Record<ModulePermissionAction, string[]> = {
  view: ['view', 'read', 'manage'],
  create: ['create', 'manage'],
  edit: ['edit', 'update', 'manage'],
  delete: ['delete', 'remove', 'manage'],
  approve: ['approve', 'manage'],
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function toSingular(value: string): string {
  return value.endsWith('s') ? value.slice(0, -1) : value;
}

function buildModuleCandidates(moduleName: string, aliases: string[] = []): string[] {
  const rawCandidates = [moduleName, ...aliases]
    .map(normalizeToken)
    .flatMap((value) => [
      value,
      value.replace(/-/g, '_'),
      value.replace(/_/g, '-'),
      value.replace(/[\s_]/g, '-'),
      value.replace(/[\s-]/g, '_'),
      toSingular(value),
      toSingular(value.replace(/-/g, '_')),
      toSingular(value.replace(/_/g, '-')),
    ]);

  return Array.from(new Set(rawCandidates));
}

export function isAdminRole(roleValue: string | null | undefined): boolean {
  const normalizedRole = normalizeToken(roleValue ?? '');
  return ADMIN_ROLES.has(normalizedRole.toUpperCase());
}

export function hasModuleActionPermission(params: {
  permissions: string[];
  moduleName: string;
  action: ModulePermissionAction;
  moduleAliases?: string[];
  roleName?: string | null;
}): boolean {
  const { permissions, moduleName, action, moduleAliases = [], roleName } = params;

  if (isAdminRole(roleName)) {
    return true;
  }

  const normalizedPermissions = new Set(permissions.map(normalizeToken));

  if (normalizedPermissions.has('*')) {
    return true;
  }

  const moduleCandidates = buildModuleCandidates(moduleName, moduleAliases);
  const actionCandidates = ACTION_ALIASES[action];

  for (const moduleCandidate of moduleCandidates) {
    for (const actionCandidate of actionCandidates) {
      const tokenWithColon = `${moduleCandidate}:${actionCandidate}`;
      const tokenWithDot = `${moduleCandidate}.${actionCandidate}`;

      if (normalizedPermissions.has(tokenWithColon) || normalizedPermissions.has(tokenWithDot)) {
        return true;
      }
    }

    if (
      normalizedPermissions.has(`master_data.${moduleCandidate}.manage`) ||
      normalizedPermissions.has(`master_data.${moduleCandidate.replace(/-/g, '_')}.manage`)
    ) {
      return true;
    }
  }

  return false;
}
