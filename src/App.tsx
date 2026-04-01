import { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/auth/LoginPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';

import { NotFoundPage } from './pages/errors/NotFoundPage';
import { ForbiddenPage } from './pages/errors/ForbiddenPage';
import { UserProfilePage } from './pages/profile/UserProfilePage';
import { MainLayout } from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';
import { CategoryManagementPage } from './pages/admin/CategoryManagementPage';
import { RolePermissionsPage } from './pages/admin/RolePermissionsPage';
import { AdvancedPermissionsPage } from './pages/admin/AdvancedPermissionsPage';
import { ApprovalConfigurationPage } from './pages/admin/ApprovalConfigurationPage';
import { ProductReferenceManagementPage } from './pages/admin/ProductReferenceManagementPage';
import { ProductManagementPage } from './pages/admin/ProductManagementPage';
import { ProductDetailPage } from './pages/admin/ProductDetailPage';
import { SupplierManagementPage } from './pages/admin/SupplierManagementPage';
import { WarehouseManagementPage } from './pages/admin/WarehouseManagementPage';
import { WarehouseHubPage } from './pages/admin/WarehouseHubPage';
import { ZoneDetailPage } from './pages/admin/ZoneDetailPage';
import { Toaster } from './components/ui/toaster';
import { sidebarNavItems } from './layouts/sidebar-navigation';
import { hasModuleActionPermission } from './utils/module-permission';
import { useToast } from './hooks/use-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Guard component: chỉ render children nếu đã đăng nhập
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PermissionDeniedRedirect({ moduleLabel }: { moduleLabel: string }) {
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: 'Khong co quyen truy cap',
      description: `Ban khong co quyen su dung chuc nang ${moduleLabel}.`,
      variant: 'destructive',
    });
  }, [moduleLabel, toast]);

  return <Navigate to="/403" replace state={{ from: location.pathname }} />;
}

function ModuleProtectedRoute({
  children,
  moduleName,
  moduleAliases,
  moduleLabel,
}: {
  children: React.ReactNode;
  moduleName: string;
  moduleAliases?: string[];
  moduleLabel: string;
}) {
  const user = useAuthStore((state) => state.user);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const canView = hasModuleActionPermission({
    permissions,
    moduleName,
    moduleAliases,
    action: 'view',
    roleName: user?.role,
  });

  return canView ? <>{children}</> : <PermissionDeniedRedirect moduleLabel={moduleLabel} />;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const defaultHomePath = useMemo(() => {
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

    const firstAllowedNav = sidebarNavItems.find((item) =>
      hasModuleActionPermission({
        permissions,
        moduleName: item.permissionModule,
        moduleAliases: item.permissionAliases,
        action: 'view',
        roleName: user?.role,
      })
    );

    return firstAllowedNav?.to ?? '/profile';
  }, [user]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Routes công khai */}
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Routes được bảo vệ, dùng MainLayout */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to={defaultHomePath} replace />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route
              path="/admin/users"
              element={
                <ModuleProtectedRoute moduleName="users" moduleAliases={['user']} moduleLabel="User Management">
                  <UserManagementPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/role-permissions"
              element={
                <ModuleProtectedRoute moduleName="roles" moduleAliases={['role']} moduleLabel="Roles">
                  <RolePermissionsPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/advanced-permission"
              element={
                <ModuleProtectedRoute
                  moduleName="permissions"
                  moduleAliases={['advanced-permissions', 'advanced_permissions']}
                  moduleLabel="Advanced Permissions"
                >
                  <AdvancedPermissionsPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/approval-configuration"
              element={
                <ModuleProtectedRoute
                  moduleName="approval-configuration"
                  moduleAliases={['approval_configuration', 'approvals']}
                  moduleLabel="Approval Configuration"
                >
                  <ApprovalConfigurationPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <ModuleProtectedRoute moduleName="categories" moduleAliases={['category']} moduleLabel="Category">
                  <CategoryManagementPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/product-settings"
              element={
                <ModuleProtectedRoute
                  moduleName="references"
                  moduleAliases={['product-settings', 'product_settings', 'reference-settings']}
                  moduleLabel="Product Settings"
                >
                  <ProductReferenceManagementPage />
                </ModuleProtectedRoute>
              }
            />
            <Route path="/admin/product" element={<Navigate to="/admin/products" replace />} />
            <Route
              path="/admin/product/:id"
              element={
                <ModuleProtectedRoute moduleName="products" moduleAliases={['product']} moduleLabel="Products">
                  <ProductDetailPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/product/:id/edit"
              element={
                <ModuleProtectedRoute moduleName="products" moduleAliases={['product']} moduleLabel="Products">
                  <ProductManagementPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/products/:id/edit"
              element={
                <ModuleProtectedRoute moduleName="products" moduleAliases={['product']} moduleLabel="Products">
                  <ProductManagementPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/products/:id"
              element={
                <ModuleProtectedRoute moduleName="products" moduleAliases={['product']} moduleLabel="Products">
                  <ProductDetailPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ModuleProtectedRoute moduleName="products" moduleAliases={['product']} moduleLabel="Products">
                  <ProductManagementPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/suppliers"
              element={
                <ModuleProtectedRoute moduleName="suppliers" moduleAliases={['supplier']} moduleLabel="Suppliers">
                  <SupplierManagementPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/warehouses/:id/zones/:zoneId"
              element={
                <ModuleProtectedRoute
                  moduleName="warehouses"
                  moduleAliases={['warehouse']}
                  moduleLabel="Warehouse Hub"
                >
                  <ZoneDetailPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/admin/warehouses"
              element={
                <ModuleProtectedRoute
                  moduleName="warehouses"
                  moduleAliases={['warehouse']}
                  moduleLabel="Warehouse Hub"
                >
                  <WarehouseHubPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/warehouse"
              element={
                <ModuleProtectedRoute
                  moduleName="warehouses"
                  moduleAliases={['warehouse']}
                  moduleLabel="Warehouse Hub"
                >
                  <WarehouseHubPage />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/warehouse/master"
              element={
                <ModuleProtectedRoute
                  moduleName="warehouses"
                  moduleAliases={['warehouse']}
                  moduleLabel="Warehouse Master"
                >
                  <WarehouseManagementPage />
                </ModuleProtectedRoute>
              }
            />

            {/* Placeholder routes — sẽ implement trong Sprint 1 tiếp theo */}
            <Route
              path="/import-export"
              element={
                <ModuleProtectedRoute
                  moduleName="import-export"
                  moduleAliases={['import_export', 'transactions']}
                  moduleLabel="Import / Export"
                >
                  <Navigate to="/profile" replace />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ModuleProtectedRoute moduleName="inventory" moduleLabel="Inventory">
                  <Navigate to="/profile" replace />
                </ModuleProtectedRoute>
              }
            />
            <Route
              path="/ai-forecast"
              element={
                <ModuleProtectedRoute
                  moduleName="ai-forecast"
                  moduleAliases={['ai_forecast', 'forecast']}
                  moduleLabel="AI Forecast"
                >
                  <Navigate to="/profile" replace />
                </ModuleProtectedRoute>
              }
            />
          </Route>

          {/* 404 — mọi route không khớp */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
