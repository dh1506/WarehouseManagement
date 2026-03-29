# Next Steps

## Recommended Next Task
**Connect real backend contracts for Sprint 1 master-data modules**

## Why this is next
- Product Settings, Product Master, Warehouse, và Warehouse Locations dã có frontend flows hoàn ch?nh.
- Các sprint transaction sau s? ph? thu?c tr?c ti?p vào các master-data modules này.
- Ðây là bu?c có ROI cao nh?t tru?c khi m? r?ng sang inbound/outbound/inventory.

## Priority Tasks

### NEXT-001 - Replace mock services with real APIs
- Target files:
  - `src/services/productReferenceService.ts`
  - `src/services/productService.ts`
  - `src/services/warehouseService.ts`
  - các services cu còn mock khi backend tuong ?ng s?n sàng
- Vi?c c?n làm:
  - map chính xác request/response theo backend contract th?t
  - b? mock arrays
  - gi? nguyên hooks và UI n?u contract tuong thích

### NEXT-002 - Finalize permission keys for new modules
- C?n ch?t permission keys cho:
  - product settings
  - products
  - warehouses
  - warehouse locations
- Sau dó c?p nh?t `usePermission()` usage ? t?ng action/button cho dúng permission th?t.

### NEXT-003 - Add stable option endpoints for dependent masters
- Product form ph? thu?c category/unit/brand.
- Location form ph? thu?c warehouse options.
- Nên uu tiên có endpoint option/list don gi?n d? form và filters không ph?i fetch shape l?n.

### NEXT-004 - Confirm deletion/business rules with backend
- Làm rõ rule khi:
  - xóa warehouse còn locations
  - xóa unit/brand dang du?c product dùng
  - d?i tr?ng thái inactive c?a product master dang có transaction

### NEXT-005 - Prepare Sprint 2 transaction modules
- Sau khi master data APIs n?i th?t, task nên làm ti?p là:
  - inbound / import requests
  - outbound / export requests
  - inventory transactions

## Assumptions to verify next
- Unit of measure và brand/manufacturer có thu?c cùng domain API v?i product hay là service riêng.
- Warehouse location có c?n thêm c?p hierarchy nhu area/zone/rack/bin ngoài shape hi?n t?i hay không.
- Product master có c?n thêm barcode, lot policy, expiry policy, ho?c metadata khác ngoài scope hi?n t?i không.
