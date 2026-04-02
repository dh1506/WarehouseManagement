# Current Context

## Sprint / Task hien tai

**Sprint 1 - FE integration voi backend contract (Warehouse Hub focus)**

## Trang thai

- Warehouse Hub khong con dung mock dataset cho hub/zone/bin.
- Du lieu hub duoc aggregate tu API warehouses + warehouse locations.
- UI da phan biet ro:
  - `Locations` = so dong `warehouse_location` thuc te
  - `Total Zones` = so nhom sau khi group theo `zone_code`
- Technical verification:
  - `npx tsc -b`: pass

## What was done in latest implementation

- Xac dinh nguyen nhan user thay "DB 9 locations nhung UI 3": Hub view dang group theo `zone_code`.
- Bo sung truong `totalLocations` trong model Warehouse Hub.
- Mapping `totalLocations = locations.length` khi build hub data.
- Cap nhat Warehouse Hub card de hien thi dong thoi:
  - Total Space
  - Locations
  - Total Zones
- Them nhan UX `Grouped by zone code` tai khu vuc list zone de tranh nham.

## Files touched (latest delta)

- `src/features/warehouses/types/warehouseType.ts`
- `src/services/warehouseService.ts`
- `src/features/warehouses/components/WarehouseHub.tsx`

## Assumptions dang ap dung

- Hub page la aggregated visualization theo zone, khong phai raw location table.
- Zone duoc dinh nghia logic bang group `warehouse_location.zone_code`.
- Neu backend tra ve 9 rows nhung chi co 3 zone_code thi Hub hien 3 zones la dung.
