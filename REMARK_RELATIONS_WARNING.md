# ⚠️ CRITICAL: Remark Relations Configuration

**DO NOT** add explicit `Enquiry` or `Booking` relations to the `Remark` model!

---

## 🚨 Why This Breaks Prisma Studio

When you add both `Enquiry` and `Booking` relations with explicit foreign keys:

```prisma
// ❌ DO NOT DO THIS - Causes Prisma Studio Fatal Error
model Remark {
  // ...
  Enquiry   Enquiry? @relation(fields: [enquiryId], references: [id])
  enquiryId String?
  Booking   Booking? @relation(fields: [bookingId], references: [id])
  bookingId String?
}
```

**Result:**
- ❌ Prisma Studio shows: `Fatal Error: Unable to process count query`
- ❌ Prisma Studio cannot count records in the `remarks` table
- ❌ Prisma Studio becomes unusable for the `remarks` model

---

## ✅ Correct Configuration (Polymorphic Relations)

Use **ONLY** `entityType` + `entityId` fields:

```prisma
// ✅ CORRECT - Works with Prisma Studio
model Remark {
  id          String   @id @default(cuid())
  entityType  String   // 'enquiry' or 'booking'
  entityId    String   // ID of enquiry or booking
  remark      String
  remarkType  String
  createdBy   String
  // ... other fields
  
  // Relations
  user            User  @relation("RemarkAuthor", fields: [createdBy], references: [firebaseUid])
  cancelledByUser User? @relation("RemarkCanceller", fields: [cancelledBy], references: [firebaseUid])
  
  // ✅ DO NOT add Enquiry/Booking relations here!
  // Use polymorphic approach with entityType + entityId only
}
```

---

## 🔧 How Relations Work in Application Code

### In Enquiry Controller:

```typescript
const enquiry = await prisma.enquiry.findUnique({
  where: { id },
  include: {
    remarkHistory: {
      where: {
        entityType: 'enquiry',
        entityId: id,
        isCancelled: false
      },
      orderBy: { createdAt: 'desc' }
    }
  }
});
```

### In Booking Controller:

```typescript
const booking = await prisma.booking.findUnique({
  where: { id },
  include: {
    remarkHistory: {
      where: {
        entityType: 'booking',
        entityId: id,
        isCancelled: false
      },
      orderBy: { createdAt: 'desc' }
    }
  }
});
```

### Schema Relations:

```prisma
model Enquiry {
  remarkHistory Remark[] // Works via implicit matching
}

model Booking {
  remarkHistory Remark[] // Works via implicit matching
}
```

Prisma automatically matches `remarkHistory` based on:
- `entityType = 'enquiry'` and `entityId = enquiry.id`
- `entityType = 'booking'` and `entityId = booking.id`

---

## ✅ What Works

- ✅ Prisma Studio can query and count `remarks` table
- ✅ `enquiry.remarkHistory` works in application code
- ✅ `booking.remarkHistory` works in application code
- ✅ All API endpoints work correctly
- ✅ Relations are resolved via implicit matching

---

## ❌ What Doesn't Work

- ❌ Explicit `Enquiry?` relation with `enquiryId` field
- ❌ Explicit `Booking?` relation with `bookingId` field
- ❌ Both relations at the same time (causes Prisma Studio fatal error)

---

## 📋 Summary

**The `Remark` model MUST use polymorphic relations ONLY:**

1. ✅ Use `entityType` + `entityId` fields
2. ✅ Keep relations to `User` only (these work fine)
3. ❌ **DO NOT** add `Enquiry` or `Booking` relations
4. ✅ Relations work via implicit matching in `Enquiry` and `Booking` models

---

## 🔄 If You Need to Fix

1. Remove explicit `Enquiry` and `Booking` relations
2. Remove `enquiryId` and `bookingId` fields
3. Run: `npx prisma generate`
4. Restart Prisma Studio: `npx prisma studio`

---

**Status:** ✅ Keep polymorphic approach - DO NOT add explicit relations!

**Last Updated:** January 2025

