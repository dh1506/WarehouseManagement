import { useState, useEffect } from 'react';
import { useRoles, useRolePermissions, useUpdateRolePermissions } from '../hooks/useRolePermissions';
import type { Permission } from '../types/roleType';

export function RolePermissions() {
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Set selected role when roles are loaded initially
  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const { data: rolePermissions, isLoading: permissionsLoading } = useRolePermissions(selectedRoleId);
  const updateMutation = useUpdateRolePermissions();

  const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);

  // Sync server data to local state when role changes or finishes loading
  useEffect(() => {
    if (rolePermissions) {
      setLocalPermissions(rolePermissions.permissions);
    } else {
      setLocalPermissions([]);
    }
  }, [rolePermissions]);

  const handleToggle = (moduleName: string, action: keyof Omit<Permission, 'module'>) => {
    setLocalPermissions((prev) =>
      prev.map((perm) =>
        perm.module === moduleName ? { ...perm, [action]: !perm[action] } : perm
      )
    );
  };

  const handleSave = () => {
    if (selectedRoleId) {
      updateMutation.mutate({
        roleId: selectedRoleId,
        payload: { permissions: localPermissions },
      });
    }
  };

  const handleDiscard = () => {
    if (rolePermissions) {
      setLocalPermissions(rolePermissions.permissions);
    }
  };

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
      {/* Title and Context */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Roles &amp; Permissions Management</h2>
        <p className="text-gray-500 max-w-2xl">
          Define operational boundaries and AI forecasting access levels across your enterprise warehouse workforce.
        </p>
      </div>

      {/* Three-Pane Management Layout */}
      <div className="flex-1 flex gap-6 min-h-0">

        {/* Left Pane: List of Roles */}
        <div className="w-80 flex flex-col gap-4 bg-gray-50 rounded-xl p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 px-2">Role Hierarchy</span>
            <button className="text-primary hover:bg-primary/10 p-1 rounded transition-colors">
              <span className="material-symbols-outlined text-[20px]" data-icon="add">add</span>
            </button>
          </div>

          <div className="space-y-3">
            {rolesLoading ? (
              <div className="animate-pulse flex flex-col gap-3">
                <div className="h-20 bg-gray-200 rounded-xl"></div>
                <div className="h-20 bg-gray-200 rounded-xl"></div>
              </div>
            ) : (
              roles?.map((role) => {
                const isActive = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all group ${isActive
                      ? 'bg-white shadow-sm ring-2 ring-primary'
                      : 'bg-white/50 hover:bg-white'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-primary' : role.colorClass || 'bg-slate-300 group-hover:bg-primary/50'
                        }`}></div>
                      <span className={`font-bold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {role.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {role.description}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Permission Matrix */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 flex items-center justify-between border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Permission Matrix: <span className="text-primary">{selectedRole?.name}</span>
              </h3>
              <p className="text-sm text-gray-500">Configure access levels for each system module.</p>
            </div>
            {selectedRole?.name === 'Director' && (
              <div className="flex gap-1">
                <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]" data-icon="auto_awesome" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  AI Forecast Enabled
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {permissionsLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider pl-4">System Module</th>
                    <th className="pb-2 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider text-center">View</th>
                    <th className="pb-2 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider text-center">Create</th>
                    <th className="pb-2 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider text-center">Edit</th>
                    <th className="pb-2 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider text-center">Delete</th>
                    <th className="pb-2 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider text-center pr-4">Approve</th>
                  </tr>
                </thead>
                <tbody>
                  {localPermissions.map((perm) => {
                    const isAiForecast = perm.module === 'AI Forecast';
                    return (
                      <tr key={perm.module} className="group hover:bg-slate-50/50 transition-colors">
                        <td className={`py-4 pl-4 rounded-l-xl ${isAiForecast ? 'bg-cyan-50/30 group-hover:bg-cyan-100/10' : 'bg-gray-50/30 group-hover:bg-primary/5'} transition-colors`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg shadow-sm ${isAiForecast ? 'bg-cyan-600 text-white' : 'bg-white text-primary'
                              }`}>
                              <span
                                className="material-symbols-outlined text-xl"
                                data-icon={getIconForModule(perm.module)}
                                style={isAiForecast ? { fontVariationSettings: "'FILL' 1" } : {}}
                              >
                                {getIconForModule(perm.module)}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-gray-900">{perm.module}</span>
                              {isAiForecast && (
                                <span className="block text-[10px] text-cyan-700 font-bold uppercase tracking-tighter">Predictive Analysis</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <input
                            type="checkbox"
                            checked={perm.view}
                            onChange={() => handleToggle(perm.module, 'view')}
                            className={`w-5 h-5 rounded border-gray-300 focus:ring-2 ${isAiForecast ? 'text-cyan-600 focus:ring-cyan-600/20' : 'text-primary focus:ring-primary/20'}`}
                          />
                        </td>
                        <td className="py-4 text-center">
                          <input
                            type="checkbox"
                            checked={perm.create}
                            onChange={() => handleToggle(perm.module, 'create')}
                            className={`w-5 h-5 rounded border-gray-300 focus:ring-2 ${isAiForecast ? 'text-cyan-600 focus:ring-cyan-600/20' : 'text-primary focus:ring-primary/20'}`}
                          />
                        </td>
                        <td className="py-4 text-center">
                          <input
                            type="checkbox"
                            checked={perm.edit}
                            onChange={() => handleToggle(perm.module, 'edit')}
                            className={`w-5 h-5 rounded border-gray-300 focus:ring-2 ${isAiForecast ? 'text-cyan-600 focus:ring-cyan-600/20' : 'text-primary focus:ring-primary/20'}`}
                          />
                        </td>
                        <td className="py-4 text-center">
                          <input
                            type="checkbox"
                            checked={perm.delete}
                            onChange={() => handleToggle(perm.module, 'delete')}
                            className={`w-5 h-5 rounded border-gray-300 focus:ring-2 ${isAiForecast ? 'text-cyan-600 focus:ring-cyan-600/20' : 'text-primary focus:ring-primary/20'}`}
                          />
                        </td>
                        <td className="py-4 text-center pr-4 rounded-r-xl">
                          <input
                            type="checkbox"
                            checked={perm.approve}
                            onChange={() => handleToggle(perm.module, 'approve')}
                            className={`w-5 h-5 rounded border-gray-300 focus:ring-2 ${isAiForecast ? 'text-cyan-600 focus:ring-cyan-600/20' : 'text-primary focus:ring-primary/20'}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="material-symbols-outlined text-sm" data-icon="history">history</span>
              <span>Last modified by <span className="font-bold">Director</span> • 2 hours ago</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDiscard}
                disabled={updateMutation.isPending}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200/50 transition-all disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-8 py-3 rounded-xl font-bold text-white bg-primary shadow-lg shadow-primary/20 hover:bg-blue-800 active:scale-[0.99] transition-all disabled:opacity-75 flex items-center gap-2"
              >
                {updateMutation.isPending && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
                Update Permissions
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function getIconForModule(module: string): string {
  switch (module) {
    case 'Dashboard': return 'dashboard';
    case 'Inventory': return 'inventory';
    case 'Products': return 'inventory_2';
    case 'Reports': return 'bar_chart';
    case 'AI Forecast': return 'auto_awesome';
    default: return 'widgets';
  }
}
