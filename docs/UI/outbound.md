# OUTBOUND MANAGEMENT BUSINESS SPECIFICATION

## 1. SYSTEM OVERVIEW

This process manages outbound operations from request initialization, physical execution at the warehouse (picking), evidence reconciliation (verification) to exception approval (escalation). The goal is to ensure the integrity of physical and system inventory, combined with an optimal user feedback experience (UX) across all devices.

---

## 2. ACTORS & RESPONSIBILITIES

| Role                  | Main Responsibilities                                                                                          |
| :-------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Warehouse Staff**   | Initializes the ticket, physically picks items, uploads evidence (images/videos).                              |
| **System**            | Automatically records Metadata (ID, Name, Timestamp), manages ticket status.                                   |
| **Warehouse Manager** | Monitors the Dashboard, reconciles physical reality and evidence, approves or reports discrepancies.           |
| **CEO / Director**    | Views the general report on the Dashboard, provides final approval for discrepancy cases (Exception handling). |

---

## 3. BUSINESS WORKFLOW

**3.1. Ticket Status Life-cycle**
`DRAFT` -> `PENDING_PICK` -> `PENDING_VERIFY` -> `COMPLETED` | `PENDING_CEO_APPROVAL` -> `COMPLETED_WITH_EXCEPTION`.

**3.2. Detailed Steps**

1. **Step 1 (Initialization):** Staff enters product information, quantity, and reason for outbound (or the manager creates it via the "New Manifest" button).
2. **Step 2 (System Recording):** System automatically stamps the creator's information and server time.
3. **Step 3 (Execution & Evidence):** Staff physically picks items and uploads Media (Image/Video) as evidence.
4. **Step 4 (Reconciliation):** Manager inspects. If valid: Complete outbound. If discrepant: Enter resolution and escalate to CEO.
5. **Step 5 (Exception Approval):** CEO reviews the discrepancy report and resolution to close the ticket, recording completion with an exception.

---

## 4. ACCEPTANCE CRITERIA (AC)

### 4.1. Functional AC

#### Module 1: Outbound Ticket Initialization

- **AC 1.1 (Initialization Form):** System provides a form to select products from a catalog, enter quantity (positive integer), unit of measurement, and reason.
- **AC 1.2 (Data Security):** System DOES NOT allow manual entry of staff ID or time. This information must be extracted from the login Token at the Backend.
- **AC 1.3 (State Transition 1):** Upon clicking "Save", the ticket moves to `PENDING_PICK` status.

#### Module 2: Update Picking Evidence

- **AC 2.1 (Update Condition):** Staff can only update evidence when the ticket is in `PENDING_PICK` status.
- **AC 2.2 (Upload Formats):** Supports Images (.jpg, .png, .webp, max 5 images) and Videos (.mp4, .mov, max 1 video < 50MB).
- **AC 2.3 (Upload Validation):** "Confirm Completion" button is only `Enabled` after at least 01 image/video is uploaded.

#### Module 3: Reconciliation & Discrepancy Handling (Manager)

- **AC 3.1 (Reconciliation Interface):** Displays a comparison screen (Split-view): Outbound request vs. Media evidence.
- **AC 3.2 (Mandatory Input):** If "Reject/Discrepancy" is selected, entering `Discrepancy Reason` and `Proposed Resolution` is mandatory.

#### Module 4: CEO Approval

- **AC 4.1 (Audit Trail):** CEO has the right to view the entire change history of the ticket before approving.
- **AC 4.2 (Inventory Update):** After the CEO clicks "Accept", the system deducts inventory based on the actual quantity approved in the resolution.

#### Module 5: Outbound List Dashboard Interface (For Manager / Director)

- **AC 5.1 (Overview KPI Cards):** The interface must display 4 real-time statistical cards including: Total Outbound Orders, Pending Allocation, Active Picking, and Completed Today. These cards must include a trend indicator (e.g., percentage increase/decrease).
- **AC 5.2 (Filtering & Search Tools):** Provide a multi-threaded search bar (Search by manifest #, customer, destination). Support dropdown filters: By Status (All Statuses), Priority (All Priorities), and Date Range.
- **AC 5.3 (Data Table Structure):** The outbound list data table must display mandatory columns: Order / Manifest, Customer & Address, Priority, Status, ETD (Estimated Time of Departure).
- **AC 5.4 (Status & Priority Visualization):** \* The Priority column must display corresponding colored tags: High (Light Red), Med (Orange/Yellow), Low (Grey).
  - The Status column displays corresponding semantic icons and text colors (e.g., Delivered in green, Shipped in dark blue, Picking/Packing in light blue).
- **AC 5.5 (Actions & Pagination):** Support primary action button "New Manifest" and "Export Data" button. The data table must support pagination at the bottom (displaying the current number of records out of the total).

### 4.2. Non-Functional AC

- **AC 6.1 (Responsive UI):** Warehouse Staff interface is 100% optimized for mobile (Touch targets >= 44px). Manager Dashboard interface is optimized for Desktop/Landscape Tablet screens; the Data Table must support horizontal scroll if the screen is too narrow, without breaking the layout.
- **AC 6.2 (UI Update Optimization):** Apply Optimistic UI to update ticket status instantly on the client. For the Manager Dashboard, consider integrating WebSocket or Long-polling to update metrics on KPI cards in real-time.
- **AC 6.3 (Storage & Upload):** Images/videos are uploaded to Cloud Storage via Presigned URL, supporting chunked upload.
- **AC 6.4 (Data Integrity):** The action of completing a ticket and deducting inventory must be wrapped in a Database Transaction.

---

## 5. DETAILED INTERACTION FLOW AND UI/UX FEEDBACK

- **Initialization Flow - Loading State:** Upon clicking "New Manifest", the button switches to `Disabled`, displaying a Loading Spinner.
- **Initialization Flow - Feedback:** Display a Toast Success (3 seconds) and automatically refresh the list on the Dashboard without reloading the entire page.
- **Upload Flow - Loading State:** Display a Progress Bar directly on the thumbnail of the uploading file. The confirm button is completely locked.
- **Approval Flow - Loading State:** When the Manager/CEO approves, display a blurred Loading Skeleton over the data details area.
- **Dashboard - Skeleton Loading:** Upon initially accessing the Dashboard page, the data table and 4 KPI cards must display Skeleton Loading instead of a blank screen until the API returns data.

---

## 6. SYSTEM RULES FOR TOAST & ANIMATION

- **Toast Position:** Top-center for Mobile and Top-right for Desktop.
- **Toast Duration:** Success (3s), Warning (5s), System Error (7s or wait for user to close).
- **Hover Effects (Data Table):** When the user hovers over a row in the Dashboard list table, the row should slightly change background color for easy tracking.
- **Page Load:** Display a Skeleton block for a minimum of 300ms when entering ticket details to avoid UI flickering (Layout Shift).

---

## 7. EDGE CASES FOR FRONT-END

- **Anti Double-Click:** Automatically disable all submit buttons at the first click.
- **Client-side File Size Validation:** Catch files > 50MB and pop up a Toast Error immediately upon file selection.
- **Empty State:** If the user applies filters on the Dashboard but no matching results are found, the data table must display a friendly Empty State UI (Illustration Icon + Text "No matching data found" + "Clear Filters" button).
- **Offline/Unstable Network Handling:** If the network drops while uploading, retain the successfully uploaded file(s), display a "Retry" button.
- **Session Timeout:** Catch HTTP 401 errors, display an expiration Toast, and automatically redirect to the Login page.
- **Media Fallback:** If the image/video URL yields a 404 error, display a Placeholder Image.
