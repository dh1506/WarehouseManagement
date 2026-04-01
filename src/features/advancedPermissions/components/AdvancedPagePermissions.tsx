import { useEffect, useMemo, useState } from 'react';
import {
  useAdvancedRolePermissions,
  useRolesForAdvanced,
  useUpdateAdvancedPermissions,
} from '../hooks/useAdvancedPermissions';
import { useRolePermissions } from '@/features/roles/hooks/useRolePermissions';
import { useToast } from '@/hooks/use-toast';
import { ACCESS_LEVEL_META, computeAccessLevel } from '../types/advancedPermissionType';
import type { ModulePermission } from '../types/advancedPermissionType';

const MODULE_ICON: Record<string, string> = {
  dashboard: 'M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-10h8V3h-8v8z',
  warehouses: 'M3 21V8l9-5 9 5v13h-6v-7H9v7H3z',
  categories: 'M4 6h16M4 12h10M4 18h7',
  references: 'M7 4h10v4H7zM5 10h14v10H5z',
  products: 'M6 7l6-3 6 3v10l-6 3-6-3V7z',
  'import-export': 'M8 7h10m0 0l-4-4m4 4l-4 4M16 17H6m0 0l4 4m-4-4 4-4',
  inventory: 'M4 7h16v10H4zM8 11h8',
  'ai-forecast': 'M4 17l4-4 3 3 5-7 4 4',
  users: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  roles: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z',
  permissions: 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7l3-7z',
  'approval-configuration': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
};

function normalizePermissionKey(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

function ApproveToggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: () => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      id={id}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${checked ? 'bg-teal-600' : 'bg-slate-200'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

function PermCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`mx-auto flex h-5 w-5 items-center justify-center rounded border-[1.5px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${checked ? 'border-blue-800 bg-blue-800' : 'border-slate-300 bg-white hover:border-blue-400'}`}
    >
      {checked ? (
        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
          <path
            d="M1.5 6.5L4.5 9.5L10.5 2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

export function AdvancedPagePermissions() {
  const { toast } = useToast();
  const { data: roles, isLoading: rolesLoading } = useRolesForAdvanced();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [localModules, setLocalModules] = useState<ModulePermission[]>([]);

  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const { data: permData, isLoading: permLoading } = useAdvancedRolePermissions(selectedRoleId);
  const { data: rolePagePermissions } = useRolePermissions(selectedRoleId);
  const updateMutation = useUpdateAdvancedPermissions();

  useEffect(() => {
    if (permData) {
      setLocalModules(permData.modules.map((module) => ({ ...module })));
    }
  }, [permData]);

  const viewEnabledModules = useMemo(() => {
    if (!rolePagePermissions) {
      return null;
    }

    return new Set(
      rolePagePermissions.permissions
        .filter((permission) => permission.view)
        .map((permission) => normalizePermissionKey(permission.module))
    );
  }, [rolePagePermissions]);

  const filteredModules = useMemo(
    () =>
      localModules
        .filter((module) => {
          if (!viewEnabledModules) {
            return true;
          }

          return viewEnabledModules.has(normalizePermissionKey(module.moduleId));
        })
        .filter((module) => {
          const keyword = filterText.trim().toLowerCase();
          if (!keyword) return true;

          return (
            module.moduleName.toLowerCase().includes(keyword) ||
            (module.pagePath ?? '').toLowerCase().includes(keyword)
          );
        }),
    [filterText, localModules, viewEnabledModules],
  );

  const selectedRole = roles?.find((role) => role.id === selectedRoleId);
  const context = permData?.context;

  const handleToggleCheckbox = (moduleId: string, field: 'view' | 'create' | 'edit' | 'delete') => {
    setLocalModules((prev) =>
      prev.map((module) => (module.moduleId === moduleId ? { ...module, [field]: !module[field] } : module)),
    );
  };

  const handleToggleApprove = (moduleId: string) => {
    setLocalModules((prev) =>
      prev.map((module) => (module.moduleId === moduleId ? { ...module, approve: !module.approve } : module)),
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;

    try {
      await updateMutation.mutateAsync({
        roleId: selectedRoleId,
        payload: { modules: localModules },
      });

      toast({
        title: 'Da luu phan quyen nang cao',
        description: 'Quyen thao tac cua vai tro da duoc cap nhat thanh cong.',
      });
    } catch (error) {
      toast({
        title: 'Khong the luu cau hinh',
        description: error instanceof Error ? error.message : 'Da co loi xay ra khi cap nhat quyen.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    if (permData) {
      setLocalModules(permData.modules.map((module) => ({ ...module })));
      toast({
        title: 'Da hoan tac thay doi',
        description: 'Du lieu da quay ve trang thai da luu gan nhat.',
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-4 px-8 py-4 pb-12">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
              Advanced Page Permissions
            </h2>
            <p className="text-base leading-relaxed text-slate-500">
              Cau hinh quyen vao tung page trong sidebar cua Predictive Architect. Ban co the cho
              CEO vao Users va Roles, nhung chan Manager khoi cac page quan tri nay.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={handleDiscard}
              disabled={updateMutation.isPending}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-[#0f2868] px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-900 disabled:opacity-75"
            >
              Save Schema
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Target Role
            </h3>

            {rolesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {roles?.map((role) => {
                  const isActive = role.id === selectedRoleId;

                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${isActive ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
                    >
                      <span className={`font-medium ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                        {role.name}
                      </span>
                      <span className="text-sm text-slate-400">›</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 border-l-4 border-l-teal-600 bg-white p-6 shadow-sm lg:col-span-2">
            {permLoading || !context ? (
              <div className="space-y-4">
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-20 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Role Description &amp; Context
                    </h3>
                    {context.aiWarning ? (
                      <p className="text-sm font-medium text-teal-700">{context.aiWarning}</p>
                    ) : null}
                  </div>
                  <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {selectedRole?.name}
                  </span>
                </div>

                <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm leading-relaxed text-slate-700">{context.description}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {context.activeModules} Active Pages
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {context.highRiskPermissions} High-risk Permissions
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <h3 className="text-lg font-bold text-slate-800">Page Permissions Matrix</h3>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
                placeholder="Filter pages..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
              />

              <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'detailed' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'compact' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="w-1/3 px-6 py-4">Sidebar Page</th>
                  <th className="px-4 py-4 text-center">View</th>
                  <th className="px-4 py-4 text-center">Create</th>
                  <th className="px-4 py-4 text-center">Edit</th>
                  <th className="px-4 py-4 text-center">Delete</th>
                  <th className="px-4 py-4 text-center">Approve</th>
                  <th className="px-6 py-4 text-right">Access Level</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {permLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-32 rounded bg-slate-100" />
                            <div className="h-2.5 w-24 rounded bg-slate-100" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-4 text-center">
                          <div className="mx-auto h-5 w-5 rounded bg-slate-100" />
                        </td>
                      ))}
                      <td className="px-6 py-4">
                        <div className="ml-auto h-5 w-20 rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">
                      Khong tim thay page phu hop.
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((module) => {
                    const level = computeAccessLevel(module);
                    const levelMeta = ACCESS_LEVEL_META[level];
                    const iconPath = MODULE_ICON[module.moduleId] ?? MODULE_ICON.dashboard;

                    return (
                      <tr key={module.moduleId} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 ${module.iconBg}`}
                            >
                              <svg
                                className={`h-5 w-5 ${module.iconColor}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d={iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                              </svg>
                            </div>

                            <div>
                              <div className="font-medium text-slate-900">{module.moduleName}</div>
                              <div className="mt-0.5 text-[11px] text-slate-400">{module.pagePath ?? '-'}</div>
                              {viewMode === 'detailed' ? (
                                <div className="mt-0.5 text-xs text-slate-500">{module.description}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <PermCheckbox
                            checked={module.view}
                            onChange={() => handleToggleCheckbox(module.moduleId, 'view')}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <PermCheckbox
                            checked={module.create}
                            onChange={() => handleToggleCheckbox(module.moduleId, 'create')}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <PermCheckbox
                            checked={module.edit}
                            onChange={() => handleToggleCheckbox(module.moduleId, 'edit')}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <PermCheckbox
                            checked={module.delete}
                            onChange={() => handleToggleCheckbox(module.moduleId, 'delete')}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center">
                            <ApproveToggle
                              id={`approve-${module.moduleId}`}
                              checked={module.approve}
                              onChange={() => handleToggleApprove(module.moduleId)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${levelMeta.className}`}
                          >
                            {levelMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <p className="italic">
            Note: Roles page quyet dinh page nao duoc hien thi, Advanced Permissions chi cau hinh them cac thao tac nang cao.
          </p>
          <span className="font-medium text-slate-700">
            {filteredModules.length} page{filteredModules.length !== 1 ? 's' : ''} shown
          </span>
        </div>
      </div>
    </div>
  );
}
