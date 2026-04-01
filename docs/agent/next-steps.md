# Next Steps

## Recommended Next Task

**Stabilize user-management API behavior with end-to-end verification**

## Why this is next

- Recent fixes touched critical admin actions (update user, lock/unlock, reset password).
- There was an API contract drift (`PUT` vs `PATCH`) and a missing reset-password BE route.
- User administration reliability should be confirmed before expanding additional module integration.

## Priority Tasks

### NEXT-001 - Run user-management E2E smoke tests

- Scope:
  - update user profile
  - lock/unlock account
  - reset user password
  - login attempt with suspended account
- Acceptance:
  - no 404/405 on user admin actions
  - clear toast/message for success and failure paths
  - list state refreshes correctly after mutation

### NEXT-002 - Consolidate user update method in API documentation

- Confirm canonical contract between FE docs and BE implementation:
  - Option A: keep `PATCH /api/users/:id` as update endpoint
  - Option B: add/restore `PUT /api/users/:id` and support both during transition
- Update API design references to remove method ambiguity.

### NEXT-003 - Add regression checks for auth/permission edge cases

- Verify non-CEO roles with and without `users:update` permission on update/lock/reset actions.
- Confirm forbidden actions return proper 403 and FE shows actionable error feedback.

### NEXT-004 - Resume Sprint 1 remaining service integrations

- After user-management stability is confirmed, continue replacing mock services for product and warehouse domains.

### NEXT-005 - Prepare Sprint 2 transaction modules

- Start inbound/outbound/inventory only after master-data + user-admin APIs are stable in integrated environment.

## Assumptions to verify next

- Backend users module is the source of truth for update/reset-password routes and payload shapes.
- Permission middleware behavior for CEO bypass and non-CEO restricted actions is intentional and approved.
- FE error handling assumes API errors are normalized by backend global error middleware.
