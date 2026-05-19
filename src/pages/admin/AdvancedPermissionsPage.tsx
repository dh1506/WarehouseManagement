import { AdvancedPagePermissions } from '@/features/advancedPermissions/components/AdvancedPagePermissions';

// Muc dich: Trang cau hinh phan quyen nang cao.
export function AdvancedPermissionsPage() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <AdvancedPagePermissions />
    </div>
  );
}
