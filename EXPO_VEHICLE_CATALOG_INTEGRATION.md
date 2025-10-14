# 📱 EXPO APP - VEHICLE CATALOG INTEGRATION GUIDE

## 🎯 **OVERVIEW**

This guide shows you how to fetch and use vehicle models, variants, colors, and pricing from your dealership's catalog in the Expo app.

---

## 🔗 **API ENDPOINTS**

**Base URL:** `https://automotive-backend-frqe.onrender.com/api`

### **Available Catalog Endpoints:**

| Endpoint | Method | Description | Who Can Use |
|----------|--------|-------------|-------------|
| `/dealerships/:dealershipId/catalog/complete` | GET | Get complete catalog (structured) | All employees |
| `/dealerships/:dealershipId/catalog` | GET | Get raw catalog entries | All employees |
| `/dealerships/:dealershipId/catalog/brands` | GET | Get available brands only | All employees |
| `/dealerships/:dealershipId/catalog/models?brand=TATA` | GET | Get models by brand | All employees |
| `/dealerships/:dealershipId/catalog/:catalogId/variants` | GET | Get variants for a model | All employees |
| `/dealerships/:dealershipId/catalog` | POST | Add vehicle to catalog | Admin, GM, SM only |

---

## 📊 **DATA STRUCTURE**

### **Complete Catalog Response**

```typescript
{
  "success": true,
  "data": {
    "brands": [
      {
        "brand": "TATA",
        "models": [
          {
            "model": "Nexon",
            "catalogId": "catalog-id-123",
            "variants": [
              {
                "name": "XZ+ Lux Petrol AT",
                "vcCode": "NXN-XZ-LUX-P-AT",
                "fuelTypes": ["Petrol"],
                "transmissions": ["Automatic"],
                "colors": [
                  {
                    "name": "Flame Red",
                    "code": "FR",
                    "additionalCost": 0,
                    "isAvailable": true
                  },
                  {
                    "name": "Pearl White",
                    "code": "PW",
                    "additionalCost": 5000,
                    "isAvailable": true
                  }
                ],
                "exShowroomPrice": 1149000,
                "rtoCharges": 85000,
                "insurance": 45000,
                "accessories": 15000,
                "onRoadPrice": 1294000,
                "isAvailable": true
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## 🔧 **IMPLEMENTATION**

### **Step 1: Create Type Definitions**

Create `types/catalog.ts`:

```typescript
// types/catalog.ts

export interface ColorOption {
  name: string;              // "Flame Red"
  code: string;              // "FR"
  additionalCost: number;    // 0 or 5000
  isAvailable: boolean;
}

export interface VehicleVariant {
  name: string;              // "XZ+ Lux Petrol AT"
  vcCode: string;            // "NXN-XZ-LUX-P-AT"
  fuelTypes: string[];       // ["Petrol", "Diesel", "Electric"]
  transmissions: string[];   // ["Manual", "Automatic"]
  colors: ColorOption[];
  exShowroomPrice: number;   // 1149000
  rtoCharges: number;        // 85000
  insurance: number;         // 45000
  accessories: number;       // 15000
  onRoadPrice: number;       // 1294000
  isAvailable: boolean;
}

export interface VehicleModel {
  model: string;             // "Nexon"
  catalogId: string;         // "catalog-id-123"
  variants: VehicleVariant[];
}

export interface VehicleBrand {
  brand: string;             // "TATA"
  models: VehicleModel[];
}

export interface CatalogData {
  brands: VehicleBrand[];
}
```

---

### **Step 2: Create API Service**

Create or update `services/catalogApi.ts`:

```typescript
// services/catalogApi.ts
import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../config';
import type { CatalogData, VehicleBrand, VehicleModel, VehicleVariant } from '../types/catalog';

const getAuthHeaders = async () => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const catalogApi = {
  /**
   * Get complete catalog (structured by brand → model → variants)
   * This is the MAIN method to use
   */
  async getCompleteCatalog(dealershipId: string): Promise<CatalogData> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/complete`,
      { headers }
    );
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch catalog');
    }
    
    return data.data;
  },

  /**
   * Get available brands only
   */
  async getBrands(dealershipId: string): Promise<string[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/brands`,
      { headers }
    );
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch brands');
    }
    
    return data.data.brands;
  },

  /**
   * Get models for a specific brand
   */
  async getModelsByBrand(dealershipId: string, brand: string): Promise<VehicleModel[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/models?brand=${encodeURIComponent(brand)}`,
      { headers }
    );
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch models');
    }
    
    return data.data.models;
  },

  /**
   * Get variants for a specific model
   */
  async getVariants(dealershipId: string, catalogId: string): Promise<{
    brand: string;
    model: string;
    variants: VehicleVariant[];
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/${catalogId}/variants`,
      { headers }
    );
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch variants');
    }
    
    return data.data;
  },
};
```

---

### **Step 3: Create Catalog Context** (Optional but Recommended)

Create `contexts/CatalogContext.tsx`:

```typescript
// contexts/CatalogContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { catalogApi } from '../services/catalogApi';
import { useAuth } from './AuthContext';
import type { CatalogData, VehicleBrand, VehicleModel, VehicleVariant } from '../types/catalog';

interface CatalogContextType {
  catalog: CatalogData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  
  // Helper methods
  getBrandByName: (brandName: string) => VehicleBrand | undefined;
  getModelByName: (brandName: string, modelName: string) => VehicleModel | undefined;
  getVariantByCode: (brandName: string, modelName: string, vcCode: string) => VehicleVariant | undefined;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = async () => {
    if (!user?.dealershipId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await catalogApi.getCompleteCatalog(user.dealershipId);
      setCatalog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [user?.dealershipId]);

  // Helper method: Get brand by name
  const getBrandByName = (brandName: string): VehicleBrand | undefined => {
    return catalog?.brands.find(b => b.brand === brandName);
  };

  // Helper method: Get model by name
  const getModelByName = (brandName: string, modelName: string): VehicleModel | undefined => {
    const brand = getBrandByName(brandName);
    return brand?.models.find(m => m.model === modelName);
  };

  // Helper method: Get variant by code
  const getVariantByCode = (
    brandName: string, 
    modelName: string, 
    vcCode: string
  ): VehicleVariant | undefined => {
    const model = getModelByName(brandName, modelName);
    return model?.variants.find(v => v.vcCode === vcCode);
  };

  return (
    <CatalogContext.Provider
      value={{
        catalog,
        loading,
        error,
        reload: loadCatalog,
        getBrandByName,
        getModelByName,
        getVariantByCode,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return context;
};
```

---

### **Step 4: Update App.tsx to Include CatalogProvider**

```typescript
// App.tsx
import { AuthProvider } from './contexts/AuthContext';
import { CatalogProvider } from './contexts/CatalogContext';

export default function App() {
  return (
    <AuthProvider>
      <CatalogProvider>
        {/* Your app components */}
      </CatalogProvider>
    </AuthProvider>
  );
}
```

---

### **Step 5: Create Vehicle Selector Component**

Create `components/VehicleSelector.tsx`:

```typescript
// components/VehicleSelector.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useCatalog } from '../contexts/CatalogContext';
import type { VehicleVariant, ColorOption } from '../types/catalog';

interface VehicleSelectorProps {
  onSelect: (selection: {
    brand: string;
    model: string;
    variant: VehicleVariant;
    color: ColorOption;
    totalPrice: number;
  }) => void;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({ onSelect }) => {
  const { catalog, loading } = useCatalog();
  
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVariantCode, setSelectedVariantCode] = useState<string>('');
  const [selectedColorCode, setSelectedColorCode] = useState<string>('');

  // Get available options based on selections
  const brands = catalog?.brands || [];
  const models = brands.find(b => b.brand === selectedBrand)?.models || [];
  const variants = models.find(m => m.model === selectedModel)?.variants || [];
  const selectedVariant = variants.find(v => v.vcCode === selectedVariantCode);
  const colors = selectedVariant?.colors || [];
  const selectedColor = colors.find(c => c.code === selectedColorCode);

  // Calculate total price
  const totalPrice = selectedVariant && selectedColor
    ? selectedVariant.onRoadPrice + selectedColor.additionalCost
    : 0;

  // Trigger callback when all selections are made
  useEffect(() => {
    if (selectedBrand && selectedModel && selectedVariant && selectedColor) {
      onSelect({
        brand: selectedBrand,
        model: selectedModel,
        variant: selectedVariant,
        color: selectedColor,
        totalPrice,
      });
    }
  }, [selectedBrand, selectedModel, selectedVariantCode, selectedColorCode]);

  if (loading) {
    return <Text>Loading catalog...</Text>;
  }

  if (!catalog || brands.length === 0) {
    return <Text>No vehicles in catalog. Contact your admin.</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Brand Selector */}
      <View style={styles.field}>
        <Text style={styles.label}>Brand *</Text>
        <Picker
          selectedValue={selectedBrand}
          onValueChange={(value) => {
            setSelectedBrand(value);
            setSelectedModel('');
            setSelectedVariantCode('');
            setSelectedColorCode('');
          }}
          style={styles.picker}
        >
          <Picker.Item label="Select Brand" value="" />
          {brands.map((brand) => (
            <Picker.Item 
              key={brand.brand} 
              label={brand.brand} 
              value={brand.brand} 
            />
          ))}
        </Picker>
      </View>

      {/* Model Selector */}
      {selectedBrand && (
        <View style={styles.field}>
          <Text style={styles.label}>Model *</Text>
          <Picker
            selectedValue={selectedModel}
            onValueChange={(value) => {
              setSelectedModel(value);
              setSelectedVariantCode('');
              setSelectedColorCode('');
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select Model" value="" />
            {models.map((model) => (
              <Picker.Item 
                key={model.catalogId} 
                label={model.model} 
                value={model.model} 
              />
            ))}
          </Picker>
        </View>
      )}

      {/* Variant Selector */}
      {selectedModel && (
        <View style={styles.field}>
          <Text style={styles.label}>Variant *</Text>
          <Picker
            selectedValue={selectedVariantCode}
            onValueChange={(value) => {
              setSelectedVariantCode(value);
              setSelectedColorCode('');
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select Variant" value="" />
            {variants.filter(v => v.isAvailable).map((variant) => (
              <Picker.Item 
                key={variant.vcCode} 
                label={`${variant.name} - ₹${variant.onRoadPrice.toLocaleString('en-IN')}`}
                value={variant.vcCode} 
              />
            ))}
          </Picker>
        </View>
      )}

      {/* Variant Details */}
      {selectedVariant && (
        <View style={styles.details}>
          <Text style={styles.detailText}>
            Fuel: {selectedVariant.fuelTypes.join(', ')}
          </Text>
          <Text style={styles.detailText}>
            Transmission: {selectedVariant.transmissions.join(', ')}
          </Text>
          <Text style={styles.detailText}>
            Ex-Showroom: ₹{selectedVariant.exShowroomPrice.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.detailText}>
            RTO: ₹{selectedVariant.rtoCharges.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.detailText}>
            Insurance: ₹{selectedVariant.insurance.toLocaleString('en-IN')}
          </Text>
        </View>
      )}

      {/* Color Selector */}
      {selectedVariant && (
        <View style={styles.field}>
          <Text style={styles.label}>Color *</Text>
          <Picker
            selectedValue={selectedColorCode}
            onValueChange={setSelectedColorCode}
            style={styles.picker}
          >
            <Picker.Item label="Select Color" value="" />
            {colors.filter(c => c.isAvailable).map((color) => (
              <Picker.Item 
                key={color.code} 
                label={
                  color.additionalCost > 0
                    ? `${color.name} (+₹${color.additionalCost.toLocaleString('en-IN')})`
                    : color.name
                }
                value={color.code} 
              />
            ))}
          </Picker>
        </View>
      )}

      {/* Total Price */}
      {totalPrice > 0 && (
        <View style={styles.totalPrice}>
          <Text style={styles.totalLabel}>Total On-Road Price:</Text>
          <Text style={styles.totalAmount}>
            ₹{totalPrice.toLocaleString('en-IN')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  picker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  details: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalPrice: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
});
```

---

### **Step 6: Use in Booking Screen**

Update `screens/CreateBookingScreen.tsx`:

```typescript
// screens/CreateBookingScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from 'react-native';
import { VehicleSelector } from '../components/VehicleSelector';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { getAuth } from 'firebase/auth';

export const CreateBookingScreen = () => {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  const [vehicleSelection, setVehicleSelection] = useState<{
    brand: string;
    model: string;
    variant: any;
    color: any;
    totalPrice: number;
  } | null>(null);

  const createBooking = async () => {
    if (!vehicleSelection) {
      alert('Please select a vehicle');
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          variant: vehicleSelection.variant.name,
          vcCode: vehicleSelection.variant.vcCode,
          color: vehicleSelection.color.name,
          fuelType: vehicleSelection.variant.fuelTypes[0],
          transmission: vehicleSelection.variant.transmissions[0],
          // dealershipId is auto-assigned by backend
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Booking created successfully!');
        // Reset form or navigate
      } else {
        alert(`Error: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Failed to create booking');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create New Booking</Text>
      <Text style={styles.subtitle}>
        Dealership: {user?.dealership.name}
      </Text>

      {/* Customer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Customer Name *"
          value={customerName}
          onChangeText={setCustomerName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Phone Number *"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={customerEmail}
          onChangeText={setCustomerEmail}
          keyboardType="email-address"
        />
      </View>

      {/* Vehicle Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Selection</Text>
        <VehicleSelector onSelect={setVehicleSelection} />
      </View>

      {/* Create Button */}
      <Button
        title="Create Booking"
        onPress={createBooking}
        disabled={!customerName || !customerPhone || !vehicleSelection}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
});
```

---

## 🎯 **COMPLETE WORKFLOW**

### **1. User Opens Booking Screen**
```
App loads → CatalogProvider fetches catalog → Data cached in context
```

### **2. User Selects Vehicle**
```
Brand: TATA
  ↓
Model: Nexon
  ↓
Variant: XZ+ Lux Petrol AT (₹12,94,000)
  ↓
Color: Flame Red (+₹0)
  ↓
Total: ₹12,94,000
```

### **3. Backend Receives**
```json
{
  "customerName": "John Doe",
  "customerPhone": "+91-9876543210",
  "variant": "XZ+ Lux Petrol AT",
  "vcCode": "NXN-XZ-LUX-P-AT",
  "color": "Flame Red",
  "fuelType": "Petrol",
  "transmission": "Automatic"
  // dealershipId auto-assigned
}
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

- [ ] Create `types/catalog.ts` with interfaces
- [ ] Create `services/catalogApi.ts` with fetch methods
- [ ] Create `contexts/CatalogContext.tsx` for state management
- [ ] Update `App.tsx` to include `CatalogProvider`
- [ ] Create `components/VehicleSelector.tsx` for reusable selection
- [ ] Update `CreateBookingScreen.tsx` to use vehicle selector
- [ ] Update `CreateEnquiryScreen.tsx` to use vehicle selector
- [ ] Test with real catalog data

---

## 🚀 **READY TO USE**

**The catalog API is already deployed and working!**

Just implement these components in your Expo app and you'll have:
- ✅ Cascading dropdowns (Brand → Model → Variant → Color)
- ✅ Real-time pricing display
- ✅ Automatic dealership scoping
- ✅ Variant details (fuel, transmission, etc.)
- ✅ Color selection with additional costs

**Start with Step 1 and work through each step!** 📱🚗

