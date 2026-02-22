
# Booking System Documentation

This document provides a detailed overview of how the Booking System works within the Car Dealership Backend. It covers the data model, core workflows, role-based access control (RBAC), and key features.

## 1. Data Model

The `Booking` entity is the central record for vehicle sales. It is defined in `prisma/schema.prisma`.

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Unique identifier. |
| `status` | Enum (`BookingStatus`) | Current state (e.g., `PENDING`, `CONFIRMED`, `DELIVERED`). |
| `bookingDate` | DateTime | Date when the booking was made. |
| `customerName` | String | Name of the customer. |
| `advisorId` | String (FK) | ID of the Customer Advisor managing this booking. |
| `dealerCode` | String | Code of the dealer where booking was made. |
| `dealershipId` | String (FK) | **Multi-tenant isolation**: The dealership this booking belongs to. |
| `stockAvailability` | Enum | `VNA` (Vehicle Not Available) or `VEHICLE_AVAILABLE`. |
| `chassisNumber` | String | Required if `stockAvailability` is `VEHICLE_AVAILABLE`. |
| `allocationOrderNumber`| String | Required if `stockAvailability` is `VNA`. |
| `remarks` | String | Legacy/general remarks. |
| `advisorRemarks` | String | Specific remarks editable by Customer Advisors. |
| `teamLeadRemarks` | String | Specific remarks editable by Team Leads. |
| `salesManagerRemarks` | String | Specific remarks editable by Sales Managers. |

### Relationships

-   **Enquiry**: Linked via `enquiryId`. A booking often originates from an enquiry.
-   **Advisor**: Linked via `advisorId` to the `User` model.
-   **Dealership**: Linked via `dealershipId` for tenant isolation.
-   **Audit Logs**: A one-to-many relation with `BookingAuditLog` to track all changes.

---

## 2. Core Workflows

### 2.1 Booking Creation

**Endpoint**: `POST /api/bookings`

1.  **Permission Check**: The system validates if the user has `create` permission for bookings.
    *   *Note*: `CUSTOMER_ADVISOR` role generally **cannot** create bookings directly via this endpoint in broad contexts, but checking `rbac.middleware.ts` shows they *can* create their own enquiries, but for bookings, `canPerformAction` returns `['read', 'update']` for advisors (line 313). However, the `createBooking` controller logic (line 74) has handling for `CUSTOMER_ADVISOR` to auto-assign themselves, suggesting it might be allowed in some contexts or legacy code, but RBAC is the gatekeeper. *Correction*: The middleware explicitly lists `CUSTOMER_ADVISOR` has `booking: ['read', 'update']`, effectively blocking creation unless overridden.
2.  **Field Validation**:
    *   Required: `customerName`, `dealerCode`.
    *   Dates: Converted to ISO-8601 objects.
    *   Empty fields are sanitized.
3.  **Dealership Assignment**: The `dealershipId` is automatically set to the creating user's `dealershipId`.
4.  **Notification**: A generic "New Booking" notification is triggered.

### 2.2 Booking Retrieval

**Endpoints**:
*   `GET /api/bookings`: Main list with filtering.
*   `GET /api/bookings/advisor/my-bookings`: Optimized for advisors.
*   `GET /api/bookings/:id`: Detail view.

**Filtering & Security**:
*   **Dealership Isolation**: Users can only see bookings within their `dealershipId`.
*   **Advisor Isolation**: `CUSTOMER_ADVISOR` role is restricted to see *only* their assigned bookings (enforced in `getBookings` and `getBookingById`).
*   **Pagination**: Supports `page` and `limit`.
*   **Filters**: `status`, `timeline` (e.g., 'today', 'overdue', 'delivery_today').

### 2.3 Booking Updates

**Endpoint**: `PUT /api/bookings/:id`

1.  **Permission Check**: Validates `update` permission.
2.  **Advisor Restriction**: Advisors can only update their own bookings.
3.  **Field-Level Security**: The `filterWritableFields` middleware ensures users can only modify fields allowed for their role.
    *   *Example*: Advisors can update `expectedDeliveryDate` and `financeRequired`, but *cannot* update `dealerCode` or `stockAvailability` (read-only for them).
4.  **Stock Availability Logic**:
    *   If `stockAvailability` = `VEHICLE_AVAILABLE`, then `chassisNumber` is **required**.
    *   If `stockAvailability` = `VNA`, then `allocationOrderNumber` is **required**.
5.  **Audit Logging**: Every update creates a `BookingAuditLog` entry recording `oldValue`, `newValue`, `changedBy`, and `changeReason`.
6.  **Status Changes**: If `status` changes, a specific notification is triggered.

### 2.4 Remarks System

**Endpoint**: `POST /api/bookings/:id/remarks`

*   **Appends Only**: Logic ensures remarks are usually appended with a timestamp and author, rather than overwriting.
*   **Role-Specific Fields**:
    *   `advisorRemarks`: Editable by Advisor.
    *   `teamLeadRemarks`: Editable by Team Lead.
    *   `salesManagerRemarks`: Editable by Sales Manager.
    *   `generalManagerRemarks`: Editable by GM.
    *   This prevents users from editing each other's remarks.

---

## 3. Role-Based Access Control (RBAC)

Defined in `src/middlewares/rbac.middleware.ts`.

| Role | Create | Read | Update | Delete | Special Notes |
|------|:------:|:----:|:------:|:------:|---------------|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | Full access. |
| **GM** | ❌ | ✅ | ✅ | ❌ | Can edit `generalManagerRemarks`. |
| **Sales Mgr** | ❌ | ✅ | ✅ | ❌ | Can edit `salesManagerRemarks`. |
| **Team Lead** | ❌ | ✅ | ✅ | ❌ | Can edit `teamLeadRemarks`. |
| **Advisor** | ❌ | ✅ | ✅ | ❌ | **Restricted**: Can only see/edit *assigned* bookings. Can edit specific fields like `status`, `expectedDeliveryDate`, `financeRequired`, `rtoDate`, `fileLoginDate`. |

---

## 4. Bulk Operations via Import

The system supports bulk importing of bookings (CSV/Excel) handled by `booking-import.controller.ts`.

*   **Upload**: Admin/GM can upload a file.
*   **Preview**: Validates data before insertion.
*   **Processing**: Background processing to create bookings.
*   **Error Handling**: Detailed row-level error logs (`BookingImportError` model).

## 5. Audit Logging

Every critical action (Update, Delete, Add Remark) on a booking is logged in the `booking_audit_logs` table.

*   **What is logged**:
    *   `action` (e.g., "UPDATE", "ADD_REMARK")
    *   `changedBy` (User ID)
    *   `oldValue` (JSON snapshot before change)
    *   `newValue` (JSON snapshot after change)
    *   `ipAddress` & `userAgent`
