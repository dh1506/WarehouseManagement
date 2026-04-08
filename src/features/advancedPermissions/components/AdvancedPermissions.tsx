import { useState, useEffect, useMemo } from 'react';
import {
  useRolesForAdvanced,
  useAdvancedRolePermissions,
  useUpdateAdvancedPermissions,
} from '../hooks/useAdvancedPermissions';
import {
  computeAccessLevel,
  ACCESS_LEVEL_META,
} from '../types/advancedPermissionType';
import type { ModulePermission } from '../types/advancedPermissionType';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Icon map cho từng module
// ---------------------------------------------------------------------------
const MODULE_ICON: Record<string, string> = {
  'finance-reports': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  'user-management': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  'system-settings': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'order-fulfillment': 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  'vendor-portal': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  'audit-logs': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  'notifications': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Toggle switch cho cột Approve */
function ApproveToggle({
  checked,
  onChange,
  id,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  id: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      id={id}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-teal-600' : 'bg-slate-200'
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

/** Checkbox tùy chỉnh để trông đẹp hơn */
function PermCheckbox({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`mx-auto w-[1.25rem] h-[1.25rem] rounded-[0.25em] border-[1.5px] flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${checked
        ? 'bg-blue-800 border-blue-800'
        : 'bg-white border-slate-300 hover:border-blue-400'
        }`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
          <path
            d="M1.5 6.5L4.5 9.5L10.5 2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdvancedPermissions() {
  const { toast } = useToast();
  const canUpdateAdvancedPermissions = usePermission('roles:update');
  const { data: roles, isLoading: rolesLoading } = useRolesForAdvanced();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');

  // Chọn role đầu tiên khi data load xong
  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const {
    data: permData,
    isLoading: permLoading,
  } = useAdvancedRolePermissions(selectedRoleId);

  const updateMutation = useUpdateAdvancedPermissions();

  // Local state để track thay đổi chưa save
  const [localModules, setLocalModules] = useState<ModulePermission[]>([]);

  useEffect(() => {
    if (permData) {
      setLocalModules(permData.modules.map((m) => ({ ...m })));
    }
  }, [permData]);

  const handleToggleCheckbox = (
    moduleId: string,
    field: 'view' | 'create' | 'edit' | 'delete',
  ) => {
    if (!canUpdateAdvancedPermissions) {
      return;
    }

    setLocalModules((prev) =>
      prev.map((m) => {
        if (m.moduleId !== moduleId || !m.isConfigurable) {
          return m;
        }

        if (field === 'view' && !m.canView) return m;
        if (field === 'create' && !m.canCreate) return m;
        if (field === 'edit' && !m.canEdit) return m;
        if (field === 'delete' && !m.canDelete) return m;

        return { ...m, [field]: !m[field] };
      }),
    );
  };

  const handleToggleApprove = (moduleId: string) => {
    if (!canUpdateAdvancedPermissions) {
      return;
    }

    setLocalModules((prev) =>
      prev.map((m) => {
        if (m.moduleId !== moduleId || !m.isConfigurable || !m.canApprove) {
          return m;
        }

        return { ...m, approve: !m.approve };
      }),
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;

    if (!canUpdateAdvancedPermissions) {
      toast({
        title: 'Access denied',
        description: 'Bạn chỉ có quyền xem, không thể lưu thay đổi phân quyền.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await updateMutation.mutateAsync({
        roleId: selectedRoleId,
        payload: { modules: localModules },
      });

      setLocalModules(result.modules.map((m) => ({ ...m })));
      toast({
        title: 'Save schema thành công',
        description: 'Cấu hình phân quyền đã được cập nhật.',
      });
    } catch (error) {
      toast({
        title: 'Không thể lưu schema',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    if (!canUpdateAdvancedPermissions) {
      return;
    }

    if (permData) setLocalModules(permData.modules.map((m) => ({ ...m })));
  };

  // Filter modules theo tên
  const filteredModules = useMemo(
    () =>
      localModules.filter((m) =>
        m.moduleName.toLowerCase().includes(filterText.toLowerCase()),
      ),
    [localModules, filterText],
  );

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const context = permData?.context;

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-8 py-4 space-y-4 pb-12">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 tracking-tight">
              Advanced Permissions with Expanded Matrix
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Define granular access levels and operational boundaries for organizational roles
              using the Predictive Matrix.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleDiscard}
              disabled={updateMutation.isPending || !canUpdateAdvancedPermissions}
              className="px-5 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              Discard Changes
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={updateMutation.isPending || !canUpdateAdvancedPermissions}
              className="px-5 py-2.5 text-white bg-[#0f2868] hover:bg-blue-900 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-75"
            >
              {updateMutation.isPending && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Save Schema
            </button>
          </div>
        </div>

        {/* ── Role Context Section ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Role Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 tracking-wider mb-4 uppercase">
              Select Target Role
            </h3>

            {rolesLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-lg" />
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
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors border ${isActive
                        ? 'bg-blue-50 border-blue-200'
                        : 'border-transparent hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d={isActive
                                ? 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                : 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                        <span
                          className={`font-medium ${isActive ? 'text-slate-900' : 'text-slate-700'
                            }`}
                        >
                          {role.name}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Role Description */}
          <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-teal-600 p-6 shadow-sm lg:col-span-2">
            {permLoading || !context ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-20 bg-slate-100 rounded" />
                <div className="h-4 bg-slate-100 rounded w-1/3" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1">
                      Role Description &amp; Context
                    </h3>
                    {context.aiWarning && (
                      <p className="text-sm font-medium text-teal-700">{context.aiWarning}</p>
                    )}
                  </div>
                  {/* Role name badge */}
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg">
                    {selectedRole?.name}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 mb-5 border border-slate-100">
                  <p className="text-slate-700 leading-relaxed text-sm">{context.description}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {context.activeModules} Active Modules
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {context.highRiskPermissions} High-risk Permissions
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Matrix Section ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

          {/* Matrix Header */}
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-800">Module Permissions Matrix</h3>
            <div className="flex items-center gap-3">
              {/* Filter input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter modules..."
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64 bg-slate-50 placeholder-slate-400"
                />
              </div>
              {/* View toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 shrink-0">
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'detailed'
                    ? 'bg-white shadow-sm text-slate-700'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'compact'
                    ? 'bg-white shadow-sm text-slate-700'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="sticky top-0 z-10 bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6 w-1/3">System Module</th>
                  <th className="py-4 px-4 text-center">View</th>
                  <th className="py-4 px-4 text-center">Create</th>
                  <th className="py-4 px-4 text-center">Edit</th>
                  <th className="py-4 px-4 text-center">Delete</th>
                  <th className="py-4 px-4 text-center">Approve</th>
                  <th className="py-4 px-6 text-right">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {permLoading ? (
                  // Skeleton rows
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 bg-slate-100 rounded w-32" />
                            <div className="h-2.5 bg-slate-100 rounded w-24" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="py-4 px-4 text-center">
                          <div className="w-5 h-5 bg-slate-100 rounded mx-auto" />
                        </td>
                      ))}
                      <td className="py-4 px-6">
                        <div className="h-5 bg-slate-100 rounded w-20 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                      Không tìm thấy module phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((mod) => {
                    const level = computeAccessLevel(mod);
                    const levelMeta = ACCESS_LEVEL_META[level];
                    const iconPath = MODULE_ICON[mod.moduleId] ?? MODULE_ICON['notifications'];
                    const moduleDescription = mod.isConfigurable
                      ? mod.description
                      : `${mod.description} (Module này chưa kết nối backend nên không thể lưu ở Sprint hiện tại).`;

                    return (
                      <tr key={mod.moduleId} className="hover:bg-slate-50 transition-colors">
                        {/* Module Info */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${mod.iconBg} border-slate-200`}
                            >
                              <svg className={`w-5 h-5 ${mod.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d={iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{mod.moduleName}</div>
                              {viewMode === 'detailed' && (
                                <div className="text-xs text-slate-500 mt-0.5">{moduleDescription}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Checkboxes */}
                        <td className="py-4 px-4 text-center">
                          <PermCheckbox
                            checked={mod.view}
                            onChange={() => handleToggleCheckbox(mod.moduleId, 'view')}
                            disabled={!canUpdateAdvancedPermissions || !mod.isConfigurable || !mod.canView}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <PermCheckbox
                            checked={mod.create}
                            onChange={() => handleToggleCheckbox(mod.moduleId, 'create')}
                            disabled={!canUpdateAdvancedPermissions || !mod.isConfigurable || !mod.canCreate}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <PermCheckbox
                            checked={mod.edit}
                            onChange={() => handleToggleCheckbox(mod.moduleId, 'edit')}
                            disabled={!canUpdateAdvancedPermissions || !mod.isConfigurable || !mod.canEdit}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <PermCheckbox
                            checked={mod.delete}
                            onChange={() => handleToggleCheckbox(mod.moduleId, 'delete')}
                            disabled={!canUpdateAdvancedPermissions || !mod.isConfigurable || !mod.canDelete}
                          />
                        </td>

                        {/* Toggle Approve */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center">
                            <ApproveToggle
                              id={`approve-${mod.moduleId}`}
                              checked={mod.approve}
                              onChange={() => handleToggleApprove(mod.moduleId)}
                              disabled={!canUpdateAdvancedPermissions || !mod.isConfigurable || !mod.canApprove}
                            />
                          </div>
                        </td>

                        {/* Access Level Badge — tự tính từ state hiện tại */}
                        <td className="py-4 px-6 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${levelMeta.className}`}
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

        {/* ── Footer Note ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <p className="italic">
            Note: Changes made to &apos;Approve&apos; actions require System Administrator signature.
          </p>
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700">
              {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''} shown
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
