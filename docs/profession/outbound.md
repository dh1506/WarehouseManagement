# Comprehensive Outbound Management PRD & API Integration Guide

## PART 1: FRONTEND UI/UX & WORKFLOWS

### PAGE 1: OUTBOUND DASHBOARD

**1. Purpose**
Serves as the central command and monitoring hub for all outbound warehouse operations. It provides a comprehensive overview of order processing status and acts as a task distribution funnel for warehouse staff.

**2. Target Users**

- **Warehouse Manager:** To monitor KPIs, track progress, and manage bottlenecks (PENDING orders).
- **Warehouse Staff (Picker):** To view their assigned outbound tickets and initiate the picking process.

**3. User Workflow**

1.  User accesses `/outbound`.
2.  The system verifies the Role:
    - **Manager:** Displays the full KPI metrics dashboard and the complete list of outbound tickets.
    - **Staff:** Hides the KPI dashboard, defaulting to a filtered view showing only their assigned tickets currently in actionable states (`APPROVED`, `PICKING`).
3.  User utilizes filters/search to locate specific tickets.
4.  User clicks on a specific row to navigate to Page 3 (Detail View), or clicks a quick-action button to proceed to Page 2 (Mobile Picking Task).

**4. Core Features**

- **KPI Metrics Dashboard (Manager Only):** Displays aggregate statistical cards (e.g., Drafts, Pending Approval, Currently Picking, Completed Today).
- **Filtering and Search:** Search by Ticket ID. Filter by Ticket Type (Sales/Returns) and Status.
- **Data Table (List View):** Displays Ticket ID, Type, Assignee, Status (Color-coded Badges), and Creation Date. The items column features a dropdown for quick preview.
- **Role-Based Access Control (RBAC):** The interface layout dynamically adapts based on the user's role.

**5. Non-Functional Requirements**

- **Performance:** Implement Server-Side Pagination. Page load time must be < 1.5s.
- **UI/UX:** Optimized for Desktop/Laptop screens. Utilize a highly visual color-coded badge system for statuses.
- **Data Freshness:** Implement a Polling mechanism (background data refresh every 60s) or a manual "Refresh" button to maintain real-time warehouse accuracy.

**6. Event Flow**
Load UI -> Initialize default filter state -> Trigger API `GET /api/stock-outs` with role-based parameters -> Render Table.

**7. Constraints & Requirements**

- Strictly prohibit fetching the entire dataset to the client and filtering via JavaScript. Data must be filtered at the Backend/Database level before being sent to the Frontend.

#### Acceptance Criteria: Page 1

**A. Functional AC**

- **AC 1.1 - RBAC Visibility:** \* _Given_ a successfully authenticated user,
  - _When_ accessing `/outbound`,
  - _Then_ the system evaluates the Role. If Manager, display the KPI strip and the global ticket list. If Staff, hide the KPI strip, render the "My Tasks" tab, and strictly load tickets with `APPROVED` or `PICKING` status assigned to that user.
- **AC 1.2 - KPI Statistics (Manager Only):**
  - _Given_ a Manager viewing the Dashboard,
  - _When_ data is successfully fetched,
  - _Then_ 4 KPI cards (Draft, Pending, Picking, Completed) accurately display the database count for the current day.
- **AC 1.3 - Filtering & Search:**
  - _Given_ a user viewing the datatable,
  - _When_ the user inputs `#EXP-123` into the search bar OR selects the filter Type = `SALES`,
  - _Then_ the list immediately updates to show only matching records. The URL automatically reflects query parameters.
- **AC 1.4 - Interactive Row Expansion:**
  - _Given_ a user viewing a table row with an "Items" column,
  - _When_ the user clicks the "X items" label,
  - _Then_ a dropdown/popover renders directly below, listing SKU ID, Product Name, and Required Quantity.

**B. UI & UX Criteria**

- **Status Colors:** Badges must adhere strictly to the color palette: `DRAFT` (Gray), `PENDING` (Yellow), `APPROVED` (Green), `PICKING` (Blue), `COMPLETED` (Purple). Leverage the `cn` utility (Tailwind class merging) to render these dynamic classes consistently.
- **Empty State:** When filters yield no results, display an illustrated empty state with the text "No outbound tickets match the criteria."

**C. Non-Functional AC**

- **Pagination Performance:** Pagination must be handled Server-Side. API returns max 50 records/page. Render time < 1.5s.
- **Real-time Updates:** The table must silently poll for fresh data every 60 seconds without disrupting user interaction.

---

### PAGE 2: MOBILE PICKING TASK

**1. Purpose**
The direct execution tool used on the warehouse floor. It guides staff to the correct rack/bin, records the actual physical quantity picked from a specific lot, and signals the completion of the outbound process.

**2. Target Users**

- **Warehouse Staff (Picker):** The personnel physically holding the device and picking goods.

**3. User Workflow**

1.  Open an outbound ticket from Page 1 or 3 to access `/outbound/picking/[id]`.
2.  Identify the designated rack/bin location on the screen and physically navigate there.
3.  Verify the quantity, select the actual Lot available on the shelf, input the picked quantity, and press "Confirm Pick."
4.  The system deducts the required quantity. Repeat until 100% of the line items are fulfilled.
5.  Once fully picked, press "Complete Ticket."

**4. Core Features**

- **Progress Bar:** Displays completion percentage (Picked SKUs / Total SKUs).
- **Location & Product Guide:** Prominently highlights the Rack/Bin, SKU, and Product Name.
- **Lot Selection Task:** Dropdown list of available Lots at that location, alongside an input field for the actual physical quantity.
- **Update Lot:** Confirmation button to record the selected lot.
- **Complete Ticket:** Final trigger to execute inventory deduction once all items are picked.

**5. Non-Functional Requirements**

- **UI/UX:** Strict Mobile-First design. Requires large typography, high-contrast colors, and extra-large buttons for gloved users.
- **Resilience:** Upon pressing "Confirm," a Loading Spinner must block the screen (approx. 0.5s) to prevent double-clicks.

**6. Event Flow**
Staff picks item -> Presses "Confirm Pick" -> Triggers API 6.5. (Ticket silently transitions to `PICKING`).
Staff hits 100% -> Presses "Complete" -> Triggers API 6.6 -> Transitions to `COMPLETED` -> Redirects to Page 1.

**7. Constraints & Requirements**

- Strictly accessible only when the ticket Status is `APPROVED` or `PICKING`. Other statuses must redirect out.
- Graceful error handling required if API 6.6 throws "insufficient available_quantity" (Popup required, app must not crash).

#### Acceptance Criteria: Page 2

**A. Functional AC**

- **AC 2.1 - Valid Access Control:**
  - _Given_ a ticket with `DRAFT` or `PENDING` status,
  - _When_ a user attempts to navigate to `/outbound/picking/[id]`,
  - _Then_ the system blocks access, redirects to Detail Page, and fires error toast: "Ticket is not ready for picking."
- **AC 2.2 - Lot Picking Execution (API 6.5):**
  - _Given_ a picker viewing a required SKU,
  - _When_ they select a Lot, input quantity X, and click "Confirm Pick",
  - _Then_ the system fires API 6.5. Progress bar updates. Lot marked as "Picked". If `APPROVED`, ticket status updates to `PICKING`.
- **AC 2.3 - Ticket Completion (API 6.6):**
  - _Given_ a picker confirmed 100% of SKU quantities,
  - _When_ they click "Complete Ticket",
  - _Then_ system triggers API 6.6, deducts inventory, transitions to `COMPLETED`, and redirects to Page 1.
- **AC 2.4 - Shortage Error Handling:**
  - _Given_ a picker clicks "Complete Ticket",
  - _When_ API 6.6 returns HTTP 400 (insufficient `available_quantity`),
  - _Then_ UI does NOT crash. Displays red Toast: "System Error: Insufficient inventory to complete. Please report to management."

**B. UI & UX Criteria**

- **Mobile-First Layout:** Fits device viewports perfectly (no horizontal scroll).
- **Physical Ergonomics:** "Confirm Pick" and "Complete" buttons must be at least 48px high and full-width.
- **High Contrast Typography:** Bin/Rack location must be bolded and the largest font size on screen.

**C. Non-Functional AC**

- **Debounce/Blocker:** Upon tapping "Confirm", button state transitions to Disabled with Loading icon to prevent duplicate submissions.

---

### PAGE 3: OUTBOUND DETAIL & WORKFLOW

**1. Purpose**
The administrative workspace used to review outbound ticket profiles, approve/cancel orders, and manage workflow State Machine transitions.

**2. Target Users**

- **Warehouse Manager:** Reviews content, approves/cancels orders.
- **Warehouse Staff:** Drafts tickets, reviews details.

**3. User Workflow**

1.  Navigate to `/outbound/[id]`.
2.  Review Header and Stepper.
3.  Review Line Items.
4.  Interact with Dynamic Action Panel (buttons conditionally rendered).
5.  Click action -> Confirmation Modal -> State mutates.

**4. Core Features**

- **Header & Stepper:** Displays ID, Type. Stepper: `DRAFT` -> `PENDING` -> `APPROVED` -> `PICKING` -> `COMPLETED`.
- **Line Items Table:** Shows SKUs, Required Quantities. Shows "Actual Picked Lot Details" if status is `>= PICKING`.
- **Dynamic Action Panel:**
  - `DRAFT`: "Submit for Approval".
  - `PENDING`: "Approve" (Manager only).
  - `APPROVED`: "Start Picking".
  - Global Action: "Cancel Ticket".
- **Audit Trail:** Workflow history log.

**5. Non-Functional Requirements**

- **UI/UX:** Desktop-optimized, Card-based layout.
- **Safety:** State-mutating actions strictly require a Confirmation Modal to prevent misclicks.

**6. Event Flow**
`DRAFT` -> "Submit" -> API 6.3 -> `PENDING`.
`PENDING` -> "Approve" -> API 6.4 -> `APPROVED`.
Any state before `COMPLETED` -> "Cancel" -> API 6.7 -> `CANCELLED`.

**7. Constraints & Requirements**

- Strict Poka-yoke: "Approve" button never renders for Staff.
- No stock allocation logic displayed (enforce manual physical verification).
- Action buttons disable immediately during API calls.

#### Acceptance Criteria: Page 3

**A. Functional AC**

- **AC 3.1 - Dynamic Action Panel:**
  - _Given_ a user opens an outbound detail view,
  - _When_ the Action Panel renders,
  - _Then_ buttons adhere to state rules: `DRAFT` ("Submit"), `PENDING` ("Approve" - Manager), `APPROVED` ("Start Picking"), before `COMPLETED` ("Cancel").
- **AC 3.2 - State Machine Transition:**
  - _Given_ a ticket in `DRAFT`,
  - _When_ staff clicks "Submit" and confirms,
  - _Then_ system triggers API 6.3. UI updates Stepper to `PENDING` and unmounts "Submit" button.
- **AC 3.3 - Actual Lot Data Visibility:**
  - _Given_ a user views Line Items of a `PICKING` or `COMPLETED` ticket,
  - _When_ scrolling through SKUs,
  - _Then_ the system displays precise Lots actually picked alongside requested quantity.

**B. UI & UX Criteria**

- **Poka-yoke (Modals):** Workflow alterations MUST intercept with Confirmation Modal.
- **Stepper Visualization:** Highlights current step, dims future, checkmarks completed.
- **Card-based Layout:** Groups Header info and SKU lists separately.

**C. Non-Functional AC**

- **Mutation Safety:** Gracefully disable Action Panel while API is in-flight.
- **Traceability:** Successful UI mutations must reflect in `stock_out_status_history` DB table.

---

## PART 2: BACKEND WORKFLOWS & API MAPPING

### 6.1 Create Sales Stock-out (SALES)

- **Endpoint:** `POST /api/stock-outs/sales`
- **Validation:**
  - `warehouse_location_id` exists.
  - `details` has >= 1 item.
  - `product_id` in `details` exists.
- **Behavior:**
  - Creates ticket in `DRAFT` status.
  - Sets `type = SALES`.
  - Generates code via `generateStockOutCode()`.
  - Logs `DRAFT` in history.

### 6.2 Create Return Stock-out (RETURN_TO_SUPPLIER)

- **Endpoint:** `POST /api/stock-outs/returns`
- **Behavior:** Sets `type = RETURN_TO_SUPPLIER`, creates `DRAFT`. (Supplier ID optional/attachable).

### 6.3 Submit Ticket (DRAFT -> PENDING)

- **Endpoint:** `PATCH /api/stock-outs/:id/submit`
- **Behavior:** Valid only in `DRAFT`. Updates `status = PENDING`. Logs history.

### 6.4 Approve Ticket (PENDING -> APPROVED)

- **Endpoint:** `PATCH /api/stock-outs/:id/approve`
- **Behavior:** Valid only in `PENDING`. Requires `stock-out:approve` permission. Updates `status = APPROVED`, records `approved_by`. Logs history.

### 6.5 Update Picked Lots (APPROVED / PICKING)

- **Endpoint:** `PUT /api/stock-outs/:id/picked-lots`
- **Validation:** Valid in `APPROVED`/`PICKING`. `lots` array > 0, `quantity` > 0.
- **Behavior:** Creates `stockOutDetailLot`. Auto-transitions `APPROVED` ticket to `PICKING`. Logs `PICKING` history.

### 6.6 Complete Ticket (PICKING -> COMPLETED)

- **Endpoint:** `PATCH /api/stock-outs/:id/complete`
- **Behavior:** Valid only in `PICKING`. Deducts actual inventory (`quantity`, `available_quantity`). Creates `OUT` `inventoryTransaction`. Transitions to `COMPLETED`. Logs history.

### 6.7 Cancel Ticket

- **Endpoint:** `PATCH /api/stock-outs/:id/cancel`
- **Behavior:** Blocks `COMPLETED`/`CANCELLED`. Voids selected lots, reverts inventory if needed. Updates `status = CANCELLED` with reason. Logs history.

### 6.8 Important Architectural Notes

- `warehouse_location_id` is the origin; specific lots are selected _after_ approval via `picked-lots`.
- History meticulously recorded in `stock_out_status_history` for Audit Trail.
- `cancelStockOut()` can intercept anywhere before `COMPLETED`.
