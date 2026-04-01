# Next Steps

## Recommended Next Task

**Run integrated QA for Users and Suppliers on the live backend**

## Why this is next

- Recent fixes touched critical admin actions (role dropdown fallback, reset password UX, reset-password backend route).
- A new supplier module was added on top of existing backend contract and needs live verification.
- The next safest move is validating runtime behavior before expanding more modules or refactoring permissions further.

## Priority Tasks

### NEXT-001 - Run user-management smoke tests

- Scope:
  - update user profile
  - create user with restricted account that lacks `roles:read`
  - verify role dropdown fallback source
  - lock/unlock account
  - reset user password
  - login attempt with suspended account
- Acceptance:
  - no 404/405 on user admin actions
  - clear toast/message for success and failure paths
  - list state refreshes correctly after mutation

### NEXT-002 - Run supplier module smoke tests

- Scope:
  - load supplier list
  - create supplier
  - edit supplier
  - open supplier detail drawer
- Acceptance:
  - correct permission gating for `suppliers:read|create|update`
  - detail drawer renders related products safely when none exist
  - no contract mismatches in create/update payloads

### NEXT-003 - Consolidate users API contract documentation

- Confirm canonical contract between FE docs and BE implementation:
  - `PATCH /api/users/:id`
  - `PATCH /api/users/:id/reset-password`
- Update API references to remove ambiguity around user update vs reset-password.

### NEXT-004 - Add regression checks for auth/permission edge cases

- Verify non-CEO roles with and without `users:update` permission on update/lock/reset actions.
- Verify delegated user-admin roles without `roles:read` still get usable role dropdown behavior.
- Confirm forbidden actions return proper 403 and FE shows actionable error feedback.

### NEXT-005 - Resume remaining integrated master-data work

- Continue replacing remaining mock-backed modules only after Users and Suppliers are stable in integrated QA.

## Assumptions to verify next

- Backend users module is the source of truth for update/reset-password routes and payload shapes.
- Backend supplier module remains list/detail/create/update only unless delete is explicitly added later.
- Permission middleware behavior for CEO bypass and non-CEO restricted actions is intentional and approved.
- FE error handling assumes API errors are normalized by backend global error middleware.

### NEXT-006 - Connect role page actions to integrated QA flow

- Smoke test create role, edit role, disable/enable role, and permission-matrix save against the running backend.
- Verify duplicate-role and invalid-status responses show actionable toast messages in FE.
- Confirm disabled roles behave correctly in user-management role selection and auth/session flows if backend enforces that state.
