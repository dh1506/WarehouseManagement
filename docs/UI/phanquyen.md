# Frontend Requirements Specification (FE): Roles & Permissions Management (Role-Based Access Control)

**Project:** Warehouse Management System (WMS)
**Module:** Roles & Permissions Management (Frontend Specification)
**General Description:** A Master-Detail interface allowing Administrators to configure and manage access levels of Roles for various System Modules, strictly adhering to the "View Cascade" principle (View permission is a prerequisite).

---

## 1. Functional Requirements (FR)

The management page is divided into two primary, interconnected UI components:

### FR01. Role Management Panel (Role Hierarchy - Left Column)

- **List Display:** Lists all system Roles (e.g., MANAGER, CEO, STAFF) along with their current operational status (ACTIVE/INACTIVE).
- **Navigation & UI Update:** When a user clicks on a Role (highlighting the card), the FE calls the API to fetch permission details and automatically updates the state to render the Matrix on the right panel.
- **Operations (Role CRUD):**
  - `+` (Add) button: Opens a modal to create a new Role.
  - `Edit` button: Opens a modal to edit the Role's name/description.
  - `Inactivate / Activate` button: Toggles the Role's status (with a confirmation dialog).

### FR02. Module Permissions Matrix (Right Column)

- **Header & Statistics:** Displays the name of the currently selected Role. Provides dynamic statistics based on the current state (e.g., Number of active modules, Number of high-risk permissions granted).
- **Search Bar (Filter):** A search input component allowing users to type keywords to quickly filter Module rows. The filtering must be executed smoothly on the Client-side.
- **Matrix Structure:**
  - Y-Axis (Rows): Module names (corresponding to system pages) accompanied by a brief description (e.g., User Management, Roles).
  - X-Axis (Columns): Permitted actions (`VIEW`, `CREATE`, `EDIT`, `DELETE / DEACTIVATE`) represented by UI Checkboxes.

### FR03. Core UI Business Logic (Cascade Rules)

The FE is responsible for handling this cross-checking logic instantly upon user interaction (`onChange` event):

- **Rule 1 - View Prerequisite (Auto-check):** If the user checks ANY of the action permissions (`CREATE`, `EDIT`, `DELETE`), the FE must automatically update the state to check the `VIEW` box on the exact same row.
- **Rule 2 - Cascade Down (Auto-uncheck):** If the user unchecks the `VIEW` box, the FE must automatically update the state to uncheck all `CREATE`, `EDIT`, and `DELETE` boxes on the exact same row.

### FR04. State Management (Action Panel)

- **Discard Changes:** A button that resets the matrix state back to the original fetched data (pristine state).
- **Save Access:** Packages the entire current matrix state into a valid JSON payload. This button is only enabled when the state has changed compared to the original data (`isDirty === true`).

---

## 2. Frontend Workflow (Event Flow)

**Use Case Name:** Update Role Permission Matrix

### 2.1. Basic Flow (Happy Path)

1. **[User]** Accesses the Permissions page URL.
2. **[FE]** Calls the API to fetch the Role list and renders it on the left panel. Highlights the first Role by default.
3. **[FE]** Calls the API to fetch the permission details of the first Role, rendering the right matrix. Assigns the baseline state (pristine). Disables the `Save Access` button.
4. **[User]** Checks/unchecks boxes on the Matrix.
5. **[FE]** Listens to the events and executes the Cascade Logic to update the UI instantly (checks View if Create/Edit is selected; unchecks Create/Edit if View is deselected).
6. **[FE]** Marks the form state as `isDirty`. Enables the `Save Access` button and displays the `Discard Changes` button.
7. **[User]** Clicks the `Save Access` button.
8. **[FE]** Disables the Save button and displays a Loading spinner on it. Converts the matrix state into a JSON payload and makes a `PUT/PATCH` API call to the server.
9. **[FE]** Receives a 200 OK status response from the server. Displays a "Success" Toast notification.
10. **[FE]** Removes the Loading indicator, updates the pristine baseline to the current data, and disables the `Save Access` button again.

### 2.2. Alternative / Exception Flows

- **[Module Search]:** At step 4, the User types text into the Search box. The FE filters the currently rendered data array, hiding rows that do not match the keyword, while preserving all checked states.
- **[Discard Changes]:** At step 6, the User clicks `Discard Changes`. The FE dispatches an action to reset the matrix to the initial state from Step 3 and disables the Save button.
- **[Server Error on Save]:** At step 9, the API returns an error (400, 500). The FE displays a red Error Toast, removes the Loading indicator on the Save button, but **preserves the User's checked state** so they can attempt to save again.

---

## 3. Non-Functional Requirements (NFR)

- **NFR01. State Management:** Given the large grid matrix, the FE must optimize rendering (e.g., using `React.memo`, `useMemo`, or managing state via `Zustand` at the Row level). Checking a single box must not cause lag or re-render the entire page DOM.
- **NFR02. Client Payload Validation:** Before making the Save API call, the FE must ensure the payload is valid. It must strictly prevent sending requests if the payload contains an object with `CREATE/EDIT/DELETE` permissions while `VIEW` is false.
- **NFR03. Feedback UX:** Mandatory skeleton loading effects upon initial page entry, and a loading spinner on action buttons to prevent double-clicks (Double-click prevention) leading to API spam.
- **NFR04. UI Enforcement Logic:** Other modules in the App (Sidebar, Buttons) must subscribe to the global authorization state. If a Module loses `VIEW` permission, the FE must instantly hide it from the Navigation Menu.

---

## 4. Acceptance Criteria (AC)

**AC1: Load Data by Role**

- **Given:** The Administrator accesses the Roles & Permissions Management page.
- **When:** Selects the "CEO" Role from the left list.
- **Then:** The UI title updates to "Module Permissions Matrix: CEO" AND the checkbox list renders correctly according to the API response AND the "Save Access" button is disabled.

**AC2: Grant Logic (View Cascade Up)**

- **Given:** On the "Roles" module row, all boxes are unchecked.
- **When:** The user checks the checkbox in the `EDIT` column.
- **Then:** The UI automatically checks the checkbox in the `VIEW` column AND the "Save Access" button becomes clickable.

**AC3: Revoke Logic (View Cascade Down)**

- **Given:** On the "User Management" row, the `VIEW`, `CREATE`, `EDIT`, and `DELETE` permissions are checked.
- **When:** The user unchecks the checkbox in the `VIEW` column.
- **Then:** The UI automatically unchecks all checkboxes in the `CREATE`, `EDIT`, and `DELETE` columns on that row.

**AC4: Client-side Module Search**

- **Given:** The matrix is rendering a list of 20 modules.
- **When:** The user enters the keyword "Inbound" into the "Filter modules..." box.
- **Then:** The UI matrix only renders rows containing the word "Inbound" AND preserves the current check/uncheck states of those rows.

**AC5: Discard Changes**

- **Given:** The user has changed the state of 5 different checkboxes but has not clicked save.
- **When:** The user clicks the "Discard Changes" button.
- **Then:** The UI form reverts to the initial data state AND the "Save Access" button is disabled again.
