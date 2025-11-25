# 🔧 Dashboard Fix: loadImportHistory Initialization Error

## ❌ Error

```
ReferenceError: Cannot access 'loadImportHistory' before initialization
at BulkUploadPage (BulkUploadPage.tsx:39:35)
```

---

## 🔍 Root Cause

This error occurs when a function is called before it's defined. Common causes:

1. Function declared with `const`/`let` after `useEffect` that calls it
2. Circular dependency
3. Hoisting issue with arrow functions

---

## ✅ Solution: Fix Function Order

**File: `src/pages/admin/BulkUploadPage.tsx`**

### Option 1: Move Function Before useEffect (Quick Fix)

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { apiClient } from '../../api/client';

const BulkUploadPage: React.FC = () => {
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Define function BEFORE useEffect
  const loadImportHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ✅ Correct endpoint: /api/bookings/imports (not /bookings/import/history)
      const response = await apiClient.get('/bookings/imports', {
        params: {
          page: 1,
          limit: 50
        }
      });
      
      if (response.data.success) {
        setImportHistory(response.data.data.imports || []);
      } else {
        setError(response.data.message || 'Failed to load import history');
      }
    } catch (err: any) {
      console.error('Error loading import history:', err);
      setError(err.response?.data?.message || 'Failed to load import history');
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps = stable function reference

  // ✅ Now safe to use in useEffect
  useEffect(() => {
    loadImportHistory();
  }, [loadImportHistory]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Upload History
      </Typography>
      
      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      
      {importHistory.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Uploaded At</TableCell>
              <TableCell>Total Records</TableCell>
              <TableCell>Success Count</TableCell>
              <TableCell>Error Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {importHistory.map((importItem: any) => (
              <TableRow key={importItem.id}>
                <TableCell>{importItem.originalFilename}</TableCell>
                <TableCell>{importItem.status}</TableCell>
                <TableCell>
                  {new Date(importItem.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{importItem.totalRecords || 0}</TableCell>
                <TableCell>{importItem.successCount || 0}</TableCell>
                <TableCell>{importItem.errorCount || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default BulkUploadPage;
```

---

### Option 2: Use Function Declaration (Alternative)

```typescript
const BulkUploadPage: React.FC = () => {
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Function declaration (hoisted, can be used anywhere)
  async function loadImportHistory() {
    setLoading(true);
    try {
      const response = await apiClient.get('/bookings/imports');
      setImportHistory(response.data.data.imports || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImportHistory(); // ✅ Works because function declarations are hoisted
  }, []);

  // ... rest of component
};
```

---

## 📋 Backend API Endpoint Reference

### GET `/api/bookings/imports` - Import History

**Authentication**: Required (Admin or General Manager)

**Query Parameters**:
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `status` (optional): Filter by status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`)

**Response Format**:
```json
{
  "success": true,
  "message": "Import history retrieved successfully",
  "data": {
    "imports": [
      {
        "id": "import-id",
        "originalFilename": "bookings.csv",
        "filename": "stored-filename.csv",
        "status": "COMPLETED",
        "totalRecords": 100,
        "successCount": 95,
        "errorCount": 5,
        "fileSize": 1024000,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "completedAt": "2024-01-01T00:05:00.000Z",
        "admin": {
          "firebaseUid": "admin-uid",
          "name": "Admin Name",
          "email": "admin@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

## 🔧 Common Patterns That Cause This Error

### ❌ Pattern 1: Calling Before Definition

```typescript
// ❌ WRONG - Will cause "Cannot access before initialization"
useEffect(() => {
  loadData(); // Called here
}, []);

const loadData = async () => { // Defined here (too late!)
  // ...
};
```

### ❌ Pattern 2: Circular Reference

```typescript
// ❌ WRONG - Circular dependency
const functionA = () => {
  functionB(); // Uses functionB
};

const functionB = () => {
  functionA(); // Uses functionA (circular!)
};
```

---

## ✅ Best Practices

1. **Use `useCallback` for functions used in `useEffect`**
   - Provides stable function reference
   - Can be safely included in dependency arrays

2. **Define functions before using them**
   - Especially with `const`/`let` arrow functions

3. **Keep component logic organized**:
   - State declarations first
   - Function definitions second
   - Effects last

---

## 🎯 Quick Fix Checklist

- [ ] Open `src/pages/admin/BulkUploadPage.tsx`
- [ ] Find where `loadImportHistory` is called (around line 39 in useEffect)
- [ ] Find where `loadImportHistory` is defined
- [ ] Move the function definition BEFORE the useEffect
- [ ] Wrap with `useCallback` hook (recommended)
- [ ] Verify API endpoint is `/bookings/imports` (not `/bookings/import/history`)
- [ ] Save and refresh the page

---

## 🚀 After Fix

Once you fix the function order, the error should be resolved and the `BulkUploadPage` component should:
- Load without errors
- Fetch import history from the backend
- Display the history table correctly

---

## 📝 Example: Complete Working Component

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import { apiClient } from '../../api/client';

interface ImportRecord {
  id: string;
  originalFilename: string;
  status: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  fileSize: number;
  createdAt: string;
  completedAt?: string;
  admin: {
    name: string;
    email: string;
  };
}

const BulkUploadPage: React.FC = () => {
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Define with useCallback BEFORE useEffect
  const loadImportHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/bookings/imports', {
        params: {
          page: 1,
          limit: 50
        }
      });
      
      if (response.data.success) {
        setImportHistory(response.data.data.imports || []);
      } else {
        setError(response.data.message || 'Failed to load import history');
      }
    } catch (err: any) {
      console.error('Error loading import history:', err);
      setError(err.response?.data?.message || 'Failed to load import history');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array

  // ✅ Now safe to use
  useEffect(() => {
    loadImportHistory();
  }, [loadImportHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'error';
      case 'PROCESSING': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Upload History
      </Typography>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {!loading && !error && importHistory.length === 0 && (
        <Alert severity="info">No import history found.</Alert>
      )}
      
      {!loading && importHistory.length > 0 && (
        <Paper sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell>Uploaded At</TableCell>
                <TableCell>Total Records</TableCell>
                <TableCell>Success</TableCell>
                <TableCell>Errors</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {importHistory.map((importItem) => (
                <TableRow key={importItem.id}>
                  <TableCell>{importItem.originalFilename}</TableCell>
                  <TableCell>
                    <Chip 
                      label={importItem.status} 
                      color={getStatusColor(importItem.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{importItem.admin.name}</TableCell>
                  <TableCell>
                    {new Date(importItem.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{importItem.totalRecords || 0}</TableCell>
                  <TableCell>{importItem.successCount || 0}</TableCell>
                  <TableCell>{importItem.errorCount || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default BulkUploadPage;
```

---

**Note**: This is a frontend code issue in your Dashboard React app, not a backend issue. The backend API endpoint `/api/bookings/imports` is working correctly.
