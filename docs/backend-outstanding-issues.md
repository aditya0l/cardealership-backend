# Outstanding Backend Issues (Observed on Current Frontend Integration)

_Last updated: 2025-11-09_

## 1. `/auth/profile` returning legacy dealership IDs — ✅ Resolved

- **What happens:** The profile payload still exposes the old Prisma CUID (`cmgphfcpi0005…`) in `dealershipId` and `dealership.id`.
- **Impact:** All scoped endpoints (enquiries, advisor bookings, pending summary, booking plan) filter by the new UUIDs and therefore crash with _“Database operation failed”_ when the frontend passes the legacy value.
- **Recommended fix:**
  - Update the profile controller to send the UUID that the rest of the APIs expect.
  - If needed, include both values (e.g. `dealership.id` for UUID, `dealership.cuid` for legacy) to keep backwards compatibility.
  - Regenerate Prisma client after schema change or ensure the UUID column is selected.
- **Frontend workaround in place:** Lookup dealership by code before calling scoped APIs. This should be removed once the API returns the UUID directly.

## 2. `/auth/sync` contract changed (role now required) — ✅ Resolved

- **What happens:** Endpoint now requires `roleName` in the body; requests without it receive a 400 _“Name, email, and role are required”_.
- **Impact:** Scripted user sync or kiosk flows that relied on the previous contract fail unless manually patched.
- **Recommended fix:**
  - Update API documentation / README to specify the new payload (`{ name, email, roleName }`).
  - Optionally default `roleName` to the existing Firebase custom claim if omitted to preserve legacy clients.

## 3. Enquiry creation undocumented requirements — ✅ Resolved

- **What happens:** POST `/api/enquiries` now rejects requests missing `dealerCode`, `dealershipId`, or if date strings are not ISO (`YYYY-MM-DD`).
- **Impact:** Frontend had to reverse engineer the new required fields through repeated 400 responses.
- **Recommended fix:**
  - Either document the required fields clearly (schema tables, README, Swagger) or default these values from the authenticated user inside the controller.
  - Explicitly mention that dates must be ISO strings (UTC).

## 4. Swagger / public docs still show legacy enums — ✅ Docs pending refresh

- **What happens:** Enquiry source options in documentation still list `SHOWROOM`, `PHONE`, etc., whereas the backend expects the new values:  
  `WALK_IN`, `PHONE_CALL`, `WEBSITE`, `DIGITAL`, `SOCIAL_MEDIA`, `REFERRAL`, `ADVERTISEMENT`, `EMAIL`,  
  `SHOWROOM_VISIT`, `EVENT`, `BTL_ACTIVITY`, `WHATSAPP`, `OUTBOUND_CALL`, `OTHER`.
- **Impact:** Frontend users sending the documented values receive “Invalid enquiry source”.
- **Recommended fix:** Update Swagger/OpenAPI spec and any public docs, then regenerate SDKs if necessary.

---

## Summary of next actions

| Issue | Priority | Owner | Status / Action Items |
|-------|----------|-------|------------------------|
| Profile returns CUID | High | Backend | ✅ Profile now returns dealership UUID alongside legacy CUID (see `/auth/profile`). |
| `/auth/sync` role requirement | Medium | Backend | ✅ Endpoint defaults to existing role when `roleName` omitted; docs updated. |
| Enquiry creation fields | High | Backend | ✅ Dealer code and dealership ID auto-populated from authenticated user; docs updated. |
| Documentation enum mismatch | Medium | Backend | ⏳ Swagger refresh still pending (README + .md docs updated). |

Frontend workarounds can be removed once Swagger is regenerated; no additional payload hacks are required.


