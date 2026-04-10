# Known Issues & Backlog - Sprint 1

## Sprint 1 Completion Status

✅ **Product Settings Module** - Complete with unit of measure and brand masters
✅ **Product Management Module** - Complete with full CRUD and filtering
✅ **Warehouse Management Module** - Complete with warehouse and location CRUD
✅ **Shared Foundations** - PageHeader, StatusBadge, StatePanel, usePermission ready for Sprint 2+
✅ **TypeScript Compliance** - No `any` types, strict mode compliant
✅ **AGENTS.md Compliance** - Architecture fully aligned

## Open Issues

### 0. AllocateBinMapModal — Hub ID vs Location ID mapping (2026-04-10)

**Context:** `ZoneMapEmbed` returns `BinInfo.id` (hub bin UUID, `string`). The allocation API requires `location_id` (numeric integer from `/api/warehouses/locations`). The modal bridges this by doing a secondary fetch of `GET /api/warehouses/locations/search?search=<zoneCode>&limit=500` and building a `location_code → numeric id` lookup map.

**Assumption:** `bin.code` from the hub API equals `location_code` from the locations API (same format: `WH002-AZONE-R05-L05-B05`). If these diverge, the lookup will silently fail and the employee will see a "Không tìm thấy vị trí" toast.

**Risk:** If the backend returns a different `location_code` format, bin clicks won't map to numeric IDs. Recommend confirming exact `location_code` format from both APIs.

**Mitigation:** Comparison is case-insensitive + trimmed. If sync issues surface, a fallback `WarehouseLocationSelect` can be reinstated per row.

### 1. Backend Integration Pending

**Status:** Blocked by Backend  
**Impact:** Mock services currently store data in memory; all changes lost on refresh

- [ ] Replace `productReferenceService.ts` mock with real API endpoints
- [ ] Replace `productService.ts` mock with real API endpoints
- [ ] Replace `warehouseService.ts` mock with real API endpoints
- [ ] Establish real database ID generation strategy (replace `nextProductId++`, `nextReferenceId++`, etc.)

**Recommendation:** When backend provides OpenAPI/Swagger docs, auto-generate service layer using codegen tools.

### 2. Permission System Not Finalized

**Status:** Partially Implemented  
**Current State:** All users have `permissions: ['*']` wildcard in mock

- [ ] Backend must define actual permission keys
- [ ] Create permission matrix for:
  - Product Settings: `product_settings.view`, `product_settings.manage`
  - Products: `products.view`, `products.create`, `products.edit`, `products.delete`
  - Warehouses: `warehouses.view`, `warehouses.manage`
- [ ] Update `usePermission()` to check actual keys instead of wildcard
- [ ] Add role-based permission assignment UI

**Assumption:** Until backend provides permission keys, UI assumes `permissions: ['*']` for admin users.

### 3. File Upload Not Implemented

**Status:** Not Started  
**Scope:** Product image/file uploads (not in Sprint 1 scope)

- [ ] Presigned URL API endpoint (Backblaze B2)
- [ ] File upload to B2 via Axios
- [ ] Image preview in product form
- [ ] Product master should support attachments field

**Note:** Currently only avatar upload mocked in user profile. Product file upload deferred to Sprint 2+.

### 4. Optional Enhancements (Low Priority)

- [ ] Export to Excel for all master data lists (not required for Sprint 1)
- [ ] Bulk import/update of master data (design needed)
- [ ] Barcode generation for products (SKU-based)
- [ ] Warehouse location visualization/floor plan (nice-to-have)
- [ ] Product search suggestions (autocomplete)

## Backend Dependencies & Recommendations

| Module             | Required API Endpoints                       | Status      | Notes                                                 |
| ------------------ | -------------------------------------------- | ----------- | ----------------------------------------------------- |
| Product Reference  | GET/POST/PUT/DELETE /api/product-references  | Not Started | Need type discrimination (unit vs brand)              |
| Product            | GET/POST/PUT/DELETE /api/products            | Not Started | Should return resolved reference names                |
| Warehouse          | GET/POST/PUT/DELETE /api/warehouses          | Not Started | Stats (locationCount) can be computed or denormalized |
| Warehouse Location | GET/POST/PUT/DELETE /api/warehouse-locations | Not Started | Need warehouse FK validation                          |
| Category           | GET /api/categories (read-only this sprint)  | Partial     | Already implemented in FE                             |

**Recommended contract:** Include example schemas/responses in OpenAPI specification.

## Design & Contract Gaps

### 1. No Formal API Contract Document

- **Impact:** Service layer inferred from implementation
- **Recommendation:** Create OpenAPI/Swagger docs for all endpoints before coding Sprint 2 services

### 2. No Figma/Design Reference Provided

- **Decision:** Inherited design from existing PageHeader/StatusBadge/StatePanel patterns
- **Recommendation:** Provide Figma link or UI kit for consistency across sprints

### 3. Database Design Not Finalized

- **Assumption:** Using inferred schema from Prisma definitions
- **Recommendation:** Share final DB schema before backend connects

## Technical Debt & Future Improvements

### 1. Helper Component Extraction (Sprint 2)

Currently embedded in module components:

- `SearchInput`, `FilterSelect`, `ActionButton`, `Pagination`, `DeleteDialog`

**Plan:** Extract to reusable components if Sprint 2 transaction modules need similar UI patterns.

### 2. Form State Management

Currently using React Hook Form + Zod directly in features.

**Extension point:** If forms grow complex, consider custom `useFormState()` hook to centralize logic.

### 3. Table Component Patterns

Currently manual table markup in each module.

**Future:** Consider TanStack Table (already in dependencies) if:

- Sorting needed across modules
- Column customization required
- Advanced filtering patterns emerge

### 4. Mock Data Seed

Currently hardcoded in each service file.

**Improvement:** Move to `tests/fixtures/` folder for consistency.

## Assumptions Currently Active

1. **Wildcard permissions**: All users have `*` permission until backend specifies keys
2. **In-memory mock storage**: All mutations are lost on page refresh
3. **Mock data is stable**: Mock arrays won't conflict with real data during integration
4. **Product master** does NOT support:
   - Barcode field
   - Lot tracking enforcement
   - Expiry date enforcement
     (Can be added in Sprint 2 if needed)
5. **Warehouse locations** currently don't support:
   - Area/Zone/Shelf/Bin hierarchy beyond current zone/aisle/bin
     (Linear hierarchy sufficient for Sprint 1)
6. **No audit trail** for CRUD operations
   (Created/updatedAt exist but not full audit log)

## Risks

| Risk                      | Likelihood | Impact           | Mitigation                                        |
| ------------------------- | ---------- | ---------------- | ------------------------------------------------- |
| Backend APIs delayed      | Medium     | Blocks Sprint 2  | Maintain mock stability; version API schema early |
| Permission keys undefined | Medium     | Auth UI broken   | Align with backend team on keys ASAP              |
| Data model mismatch       | Medium     | Rework required  | Review BE schema consensus before Sprint 2        |
| Form complexity grows     | Low        | Code maintenance | Extract components early if patterns emerge       |
| Mock data insufficient    | Low        | Edge case bugs   | Expand mock seed data before E2E testing          |

## Next Steps (Immediate)

1. **Backend API Specification** - Create OpenAPI docs for all 3 modules
2. **Permission Matrix Finalization** - Define roles and permission keys
3. **Data Model Consensus** - Review Prisma schema with backend team
4. **Integration Plan** - Timeline for replacing mock services
5. **E2E Test Scenarios** - Prepare test cases for when real APIs available

## Sprint 2 Dependencies

- Product Settings & Product modules are prerequisite for Transaction modules
- Warehouse module is prerequisite for location assignment in transactions
- All 3 master data modules should have stable real APIs before starting inbound/outbound/inventory implementation
