# Implement Outbound Warehouse Module

This document outlines the implementation plan for the frontend modules of the Outbound Warehouse Process, based on the provided API contract, PRD, and design requirements.

## User Review Required

## Proposed Changes

### Configuration & Types

- Align `OutboundStatus` to match the backend (`DRAFT`, `PENDING`, `APPROVED`, `PICKING`, `COMPLETED`, `CANCELLED`).
- Align `OutboundType` (`SALES`, `RETURN_TO_SUPPLIER`).
- Implement the exact data models for `StockOut`, `StockOutDetail`, and `StockOutDetailLot`.

#### [MODIFY] [outboundType.ts](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/features/outbound/types/outboundType.ts)

#### [MODIFY] [outboundSchema.ts](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/features/outbound/schemas/outboundSchema.ts)

---

### Services & Hooks Layer

- Refactor the existing mock `outboundService.ts` to strictly hit the real backend endpoints specified in `stock-out.route.ts`.
- Update `useOutbound.ts` hooks with React Query implementations for fetching, submitting, approving, allocating picked lots, completing, and canceling.

#### [MODIFY] [outboundService.ts](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/features/outbound/services/outboundService.ts)

#### [MODIFY] [useOutbound.ts](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/features/outbound/hooks/useOutbound.ts)

---

### Dashboard & List View (Page 1)

- Implement RBAC via `useAuthStore`: Display KPI cards for Managers; restrict Staff to viewing only (`APPROVED`, `PICKING`) assigned tasks.
- Enable Server-Side pagination, fast filtering by ticket ID, type, and status.
- Add background polling (`refetchInterval: 60000`) for real-time warehouse data accuracy without interfering with UI interactions.
- Introduce highly visible color-coded status badges utilizing Tailwind `cn` utility.

#### [MODIFY] [OutboundListPage.tsx](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/pages/operations/OutboundListPage.tsx)

#### [MODIFY] [OutboundList.tsx](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/features/outbound/components/OutboundList.tsx)

---

### Mobile Picking Task (Page 2)

- Re-design the Picking Screen for strict Mobile-First usability. Focus on big typography, high contrast, and ergonomic tap targets for gloved warehouse floor workers.
- Integrate `framer-motion` for polished UI transitions (e.g. progress bar filling, lot assignment confirmation).
- Implement explicit API blockers to block double-submissions immediately, alongside elegant error handling (e.g. insufficient `available_quantity` on complete).

#### [MODIFY] [OutboundPickingPage.tsx](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/pages/operations/OutboundPickingPage.tsx)

#### [MODIFY] [OutboundPickingScreen.tsx](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/features/outbound/components/OutboundPickingScreen.tsx)

---

### Detail View & Workflow Control (Page 3)

- Ensure Poka-yoke error proofing: all state-mutating actions (`Submit`, `Approve`, `Cancel`) require explicit Confirmation Modals.
- Construct the visually clear workflow Stepper reflecting exact backend states.
- Re-architect the Dynamic Action Panel based on roles (`Approve` strictly hidden from non-managers).
- Include precise Lot tracking information for tickets past the `APPROVED` stage.

#### [MODIFY] [OutboundDetailPage.tsx](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/pages/operations/OutboundDetailPage.tsx)

#### [MODIFY] [OutboundDetail.tsx](file:///D:/PARA/Project/hocTap/KhoaLuan/Code/FE/Warehouse_Management/src/features/outbound/components/OutboundDetail.tsx)

## Open Questions

- What is the identifier in the `authStore` to confidently differentiate a Warehouse Manager from Warehouse Staff so that we correctly apply the RBAC visibility? (Assuming checking `user.role === 'manager'` or specific permissions like `stock_outs:approve`).
- How are we assigning tickets to staff natively? (Backend does not distinctly show an `assigned_to` field in the stock-out schema provided, though it mentions `assigned` in the PRD). Will handle this manually on the list view or assume it defaults to filtering by `created_by` or similar if absent.

## Verification Plan

### Automated/Manual Interface Verification

- **RBAC**: Login as Manager, verify KPI dashboard and full access to 'Approve'. Login as Staff, verify clean dashboard filtering to 'My Tasks'.
- **Picking Flow**: Simulate picking execution on a mobile responsive emulation, verifying big-button ergonomics and transition smoothness. Force a 400 error on "Complete" to verify crash-free error toast po
