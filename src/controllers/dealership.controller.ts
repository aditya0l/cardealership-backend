import { Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { RoleName, DealershipType } from '@prisma/client';

// Create new dealership
// MULTI-TENANT: Only admins WITHOUT a dealership can create one (initial setup)
// Or use this for super-admin/system setup only
export const createDealership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // MULTI-TENANT RESTRICTION: Admins can only create ONE dealership
  if (req.user.dealershipId) {
    throw createError(
      'You are already managing a dealership. In multi-tenant mode, each admin manages only one dealership.',
      403
    );
  }

  // Only ADMIN role can create dealerships
  if (req.user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can create dealerships', 403);
  }

  const {
    name,
    code,
    type,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    gstNumber,
    panNumber,
    brands
  } = req.body;

  // Validate required fields
  if (!name || !code || !type || !email || !phone || !address || !city || !state || !pincode) {
    throw createError('Name, code, type, email, phone, address, city, state, and pincode are required', 400);
  }

  // ONE ADMIN = ONE DEALERSHIP: Prevent admins from creating multiple dealerships
  // BUT: Allow new admins to create their own dealership if they're in a default one
  if (req.user.role.name === RoleName.ADMIN && req.user.dealershipId) {
    // Check if admin is in a default dealership (auto-assigned)
    const currentDealership = await prisma.dealership.findUnique({
      where: { id: req.user.dealershipId },
      select: { name: true, code: true }
    });
    
    // Allow creating new dealership only if currently in default dealership
    const isDefaultDealership = currentDealership?.name === 'Default Dealership' || 
                               currentDealership?.code === 'DEFAULT001';
    
    if (!isDefaultDealership) {
      throw createError('You can only manage one dealership. You are already assigned to a dealership.', 403);
    }
    
    console.log(`🔄 Admin creating own dealership - will be moved from default: ${currentDealership?.name}`);
  }

  // Check if code already exists
  const existing = await prisma.dealership.findUnique({
    where: { code }
  });

  if (existing) {
    throw createError('Dealership with this code already exists', 409);
  }

  const dealership = await prisma.dealership.create({
    data: {
      name,
      code,
      type,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gstNumber,
      panNumber,
      brands: brands || [],
      isActive: true,
      onboardingCompleted: false
    }
  });

  // IMPORTANT: Auto-assign the creator (admin) to this dealership
  await prisma.user.update({
    where: { firebaseUid: req.user.firebaseUid },
    data: { dealershipId: dealership.id }
  });

  // Clean up: If admin was in default dealership, check if it's now empty
  if (req.user.dealershipId) {
    const currentDealership = await prisma.dealership.findUnique({
      where: { id: req.user.dealershipId },
      select: { name: true, code: true }
    });
    
    if (currentDealership?.name === 'Default Dealership' || currentDealership?.code === 'DEFAULT001') {
      const usersInDefaultDealership = await prisma.user.count({
        where: { dealershipId: req.user.dealershipId }
      });
      
      if (usersInDefaultDealership === 0) {
        // Delete empty default dealership
        await prisma.dealership.delete({
          where: { id: req.user.dealershipId }
        });
        console.log('🗑️ Deleted empty default dealership');
      }
    }
  }

  res.status(201).json({
    success: true,
    message: 'Dealership created successfully. You are now assigned to this dealership.',
    data: { dealership }
  });
});

// Get all dealerships with pagination and filters
// MULTI-TENANT: Returns only the user's own dealership
export const getAllDealerships = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  
  const type = req.query.type as DealershipType | undefined;
  const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
  const search = req.query.search as string | undefined;

  // Build where clause
  const where: any = {};
  
  // MULTI-TENANT: Filter by user's dealership
  if (req.user.dealershipId) {
    // User has dealership - filter by their dealership
    where.id = req.user.dealershipId;
  } else {
    // User without dealership - return empty (including new admins)
    res.json({
      success: true,
      message: 'No dealership assigned',
      data: {
        dealerships: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      }
    });
    return;
  }
  
  if (type) where.type = type;
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [dealerships, total] = await Promise.all([
    prisma.dealership.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            bookings: true,
            enquiries: true,
            vehicleCatalogs: true
          }
        }
      }
    }),
    prisma.dealership.count({ where })
  ]);

  res.json({
    success: true,
    message: 'Dealerships retrieved successfully',
    data: {
      dealerships,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

// Get specific dealership by ID
export const getDealershipById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const dealership = await prisma.dealership.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          firebaseUid: true,
          name: true,
          email: true,
          employeeId: true,
          role: true,
          isActive: true
        }
      },
      vehicleCatalogs: true,
      _count: {
        select: {
          bookings: true,
          enquiries: true,
          quotations: true,
          vehicles: true
        }
      }
    }
  });

  if (!dealership) {
    throw createError('Dealership not found', 404);
  }

  res.json({
    success: true,
    message: 'Dealership retrieved successfully',
    data: { dealership }
  });
});

// Update dealership
export const updateDealership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Check permissions
  if (req.user.role.name !== RoleName.ADMIN && req.user.dealershipId !== id) {
    throw createError('Insufficient permissions', 403);
  }

  const updateData: any = {};
  const allowedFields = [
    'name', 'email', 'phone', 'address', 'city', 'state', 'pincode',
    'gstNumber', 'panNumber', 'brands', 'isActive'
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const dealership = await prisma.dealership.update({
    where: { id },
    data: updateData
  });

  res.json({
    success: true,
    message: 'Dealership updated successfully',
    data: { dealership }
  });
});

// Complete dealership onboarding
export const completeOnboarding = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Check permissions
  if (req.user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can complete onboarding', 403);
  }

  const dealership = await prisma.dealership.update({
    where: { id },
    data: { onboardingCompleted: true }
  });

  res.json({
    success: true,
    message: 'Dealership onboarding completed',
    data: { dealership }
  });
});

// Get dealership catalog
export const getDealershipCatalog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const brand = req.query.brand as string | undefined;

  const where: any = { dealershipId: id, isActive: true };
  if (brand) where.brand = brand;

  const catalogs = await prisma.vehicleCatalog.findMany({
    where,
    orderBy: [
      { brand: 'asc' },
      { model: 'asc' }
    ]
  });

  res.json({
    success: true,
    message: 'Dealership catalog retrieved successfully',
    data: {
      dealershipId: id,
      catalogs
    }
  });
});

// Deactivate dealership (soft delete)
export const deactivateDealership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Only admins can deactivate
  if (req.user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can deactivate dealerships', 403);
  }

  const dealership = await prisma.dealership.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Dealership deactivated successfully',
    data: { dealership }
  });
});

// Activate dealership
export const activateDealership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Only admins can activate
  if (req.user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can activate dealerships', 403);
  }

  const dealership = await prisma.dealership.update({
    where: { id },
    data: { isActive: true }
  });

  res.json({
    success: true,
    message: 'Dealership activated successfully',
    data: { dealership }
  });
});

