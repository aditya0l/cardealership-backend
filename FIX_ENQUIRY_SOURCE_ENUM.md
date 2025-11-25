# ✅ Fixed: EnquirySource Enum Error

**Date:** January 2025  
**Error:** `invalid input value for enum "EnquirySource": "SHOWROOM_VISIT"`

---

## 🐛 Problem

The database enum `EnquirySource` was missing several values that are defined in the Prisma schema. When creating an enquiry with `source: "SHOWROOM_VISIT"`, PostgreSQL threw an error because that value wasn't in the enum.

**Expected Values (from Prisma schema):**
- WALK_IN
- PHONE_CALL
- WEBSITE
- DIGITAL
- SOCIAL_MEDIA
- REFERRAL
- ADVERTISEMENT
- EMAIL
- **SHOWROOM_VISIT** ← Missing!
- EVENT
- BTL_ACTIVITY
- WHATSAPP
- OUTBOUND_CALL
- OTHER

---

## ✅ Solution

Added all missing enum values to the database.

**Script Used:** `scripts/fix-enquiry-source-enum.ts`

---

## 🔧 What Was Done

1. **Checked current enum values** in database
2. **Added missing values** one by one:
   - ✅ SHOWROOM_VISIT
   - ✅ EVENT
   - ✅ BTL_ACTIVITY
   - ✅ WHATSAPP
   - ✅ OUTBOUND_CALL
   - ✅ And all others that were missing
3. **Verified** all expected values are now available

---

## 📊 Current Enum Values

All expected values are now available:
- ✅ WALK_IN
- ✅ PHONE_CALL
- ✅ WEBSITE
- ✅ DIGITAL
- ✅ SOCIAL_MEDIA
- ✅ REFERRAL
- ✅ ADVERTISEMENT
- ✅ EMAIL
- ✅ **SHOWROOM_VISIT** ← Now available!
- ✅ EVENT
- ✅ BTL_ACTIVITY
- ✅ WHATSAPP
- ✅ OUTBOUND_CALL
- ✅ OTHER

---

## 🚀 Next Steps

1. **Backend has been rebuilt** ✅
2. **Restart Backend Server** (if not already restarted):
   ```bash
   npm start
   ```

3. **Test Creating Enquiry:**
   - Try creating an enquiry with `source: "SHOWROOM_VISIT"` ✅
   - Should work now!

---

## ✅ Verification

The fix is complete! The enum now includes all values from the Prisma schema.

**Status:** ✅ Fixed and Ready

---

**Last Updated:** January 2025

