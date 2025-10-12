import { Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

// ============================================================================
// DEALERSHIP MANAGEMENT
// ============================================================================

export const createDealership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  // Only admins can create dealerships
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can create dealerships', 403);
  }

  const { name, companyName, dealerCode, address, phone, email, gstNumber } = req.body;

  if (!name || !companyName || !dealerCode) {
    throw createError('Name, company name, and dealer code are required', 400);
  }

  const dealership = await prisma.dealership.create({
    data: {
      name,
      companyName,
      dealerCode,
      address,
      phone,
      email,
      gstNumber,
      adminUserId: user.firebaseUid
    }
  });

  res.status(201).json({
    success: true,
    message: 'Dealership created successfully',
    data: { dealership }
  });
});

export const getDealerships = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  // Only admins and general managers can view all dealerships
  const allowedRoles: RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_MANAGER];
  if (!allowedRoles.includes(user.role.name)) {
    throw createError('Insufficient permissions', 403);
  }

  const dealerships = await prisma.dealership.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          vehicleModels: true,
          customRoles: true,
          userRoleAssignments: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { dealerships }
  });
});

export const getDealershipById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  const dealership = await prisma.dealership.findUnique({
    where: { id },
    include: {
      vehicleModels: {
        where: { isActive: true },
        include: {
          variants: {
            where: { isActive: true },
            include: {
              colors: { where: { isActive: true } }
            }
          }
        }
      },
      customRoles: { where: { isActive: true } },
      userRoleAssignments: {
        where: { isActive: true },
        include: {
          customRole: true
        }
      }
    }
  });

  if (!dealership) {
    throw createError('Dealership not found', 404);
  }

  res.json({
    success: true,
    data: { dealership }
  });
});

export const updateDealership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins can update dealerships
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can update dealerships', 403);
  }

  const { name, companyName, dealerCode, address, phone, email, gstNumber } = req.body;

  const dealership = await prisma.dealership.update({
    where: { id },
    data: {
      name,
      companyName,
      dealerCode,
      address,
      phone,
      email,
      gstNumber,
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Dealership updated successfully',
    data: { dealership }
  });
});

export const deleteDealership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins can delete dealerships
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can delete dealerships', 403);
  }

  // Soft delete
  await prisma.dealership.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Dealership deleted successfully'
  });
});

// ============================================================================
// VEHICLE MODELS MANAGEMENT
// ============================================================================

export const createVehicleModel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  // Only admins and general managers can create vehicle models
  const allowedRoles: RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_MANAGER];
  if (!allowedRoles.includes(user.role.name)) {
    throw createError('Insufficient permissions', 403);
  }

  const { dealershipId, modelName, modelCode, company, segment } = req.body;

  if (!dealershipId || !modelName || !modelCode || !company) {
    throw createError('Dealership ID, model name, model code, and company are required', 400);
  }

  const vehicleModel = await prisma.vehicleModel.create({
    data: {
      dealershipId,
      modelName,
      modelCode,
      company,
      segment
    }
  });

  res.status(201).json({
    success: true,
    message: 'Vehicle model created successfully',
    data: { vehicleModel }
  });
});

export const getVehicleModels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId } = req.query;

  const where: any = { isActive: true };
  if (dealershipId) {
    where.dealershipId = dealershipId as string;
  }

  const vehicleModels = await prisma.vehicleModel.findMany({
    where,
    include: {
      dealership: {
        select: {
          id: true,
          name: true,
          companyName: true
        }
      },
      _count: {
        select: {
          variants: true
        }
      }
    },
    orderBy: { modelName: 'asc' }
  });

  res.json({
    success: true,
    data: { vehicleModels }
  });
});

export const updateVehicleModel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins and general managers can update vehicle models
  const allowedRoles: RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_MANAGER];
  if (!allowedRoles.includes(user.role.name)) {
    throw createError('Insufficient permissions', 403);
  }

  const { modelName, modelCode, company, segment } = req.body;

  const vehicleModel = await prisma.vehicleModel.update({
    where: { id },
    data: {
      modelName,
      modelCode,
      company,
      segment,
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Vehicle model updated successfully',
    data: { vehicleModel }
  });
});

export const deleteVehicleModel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins can delete vehicle models
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can delete vehicle models', 403);
  }

  // Soft delete
  await prisma.vehicleModel.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Vehicle model deleted successfully'
  });
});

// ============================================================================
// VEHICLE VARIANTS MANAGEMENT
// ============================================================================

export const createVehicleVariant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  // Only admins and general managers can create variants
  const allowedRoles: RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_MANAGER];
  if (!allowedRoles.includes(user.role.name)) {
    throw createError('Insufficient permissions', 403);
  }

  const {
    modelId,
    variantName,
    variantCode,
    fuelType,
    transmission,
    engineCc,
    powerBhp,
    mileage,
    priceRangeMin,
    priceRangeMax
  } = req.body;

  if (!modelId || !variantName || !variantCode || !fuelType) {
    throw createError('Model ID, variant name, variant code, and fuel type are required', 400);
  }

  const variant = await prisma.vehicleVariant.create({
    data: {
      modelId,
      variantName,
      variantCode,
      fuelType,
      transmission,
      engineCc,
      powerBhp,
      mileage,
      priceRangeMin,
      priceRangeMax
    },
    include: {
      model: {
        select: {
          id: true,
          modelName: true,
          company: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Vehicle variant created successfully',
    data: { variant }
  });
});

export const getVehicleVariants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { modelId } = req.query;

  const where: any = { isActive: true };
  if (modelId) {
    where.modelId = modelId as string;
  }

  const variants = await prisma.vehicleVariant.findMany({
    where,
    include: {
      model: {
        select: {
          id: true,
          modelName: true,
          company: true
        }
      },
      _count: {
        select: {
          colors: true
        }
      }
    },
    orderBy: { variantName: 'asc' }
  });

  res.json({
    success: true,
    data: { variants }
  });
});

export const updateVehicleVariant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins and general managers can update variants
  const allowedRoles: RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_MANAGER];
  if (!allowedRoles.includes(user.role.name)) {
    throw createError('Insufficient permissions', 403);
  }

  const {
    variantName,
    variantCode,
    fuelType,
    transmission,
    engineCc,
    powerBhp,
    mileage,
    priceRangeMin,
    priceRangeMax
  } = req.body;

  const variant = await prisma.vehicleVariant.update({
    where: { id },
    data: {
      variantName,
      variantCode,
      fuelType,
      transmission,
      engineCc,
      powerBhp,
      mileage,
      priceRangeMin,
      priceRangeMax,
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Vehicle variant updated successfully',
    data: { variant }
  });
});

export const deleteVehicleVariant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins can delete variants
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can delete variants', 403);
  }

  // Soft delete
  await prisma.vehicleVariant.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Vehicle variant deleted successfully'
  });
});

// ============================================================================
// VEHICLE COLORS MANAGEMENT
// ============================================================================

export const createVehicleColor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  // Only admins and general managers can create colors
  const allowedRoles: RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_MANAGER];
  if (!allowedRoles.includes(user.role.name)) {
    throw createError('Insufficient permissions', 403);
  }

  const { variantId, colorName, colorCode, colorType } = req.body;

  if (!variantId || !colorName || !colorCode) {
    throw createError('Variant ID, color name, and color code are required', 400);
  }

  const color = await prisma.vehicleColor.create({
    data: {
      variantId,
      colorName,
      colorCode,
      colorType
    },
    include: {
      variant: {
        select: {
          id: true,
          variantName: true,
          model: {
            select: {
              modelName: true
            }
          }
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Vehicle color created successfully',
    data: { color }
  });
});

export const getVehicleColors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { variantId } = req.query;

  const where: any = { isActive: true };
  if (variantId) {
    where.variantId = variantId as string;
  }

  const colors = await prisma.vehicleColor.findMany({
    where,
    include: {
      variant: {
        select: {
          id: true,
          variantName: true,
          model: {
            select: {
              modelName: true
            }
          }
        }
      }
    },
    orderBy: { colorName: 'asc' }
  });

  res.json({
    success: true,
    data: { colors }
  });
});

export const updateVehicleColor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins and general managers can update colors
  const allowedRoles: RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_MANAGER];
  if (!allowedRoles.includes(user.role.name)) {
    throw createError('Insufficient permissions', 403);
  }

  const { colorName, colorCode, colorType } = req.body;

  const color = await prisma.vehicleColor.update({
    where: { id },
    data: {
      colorName,
      colorCode,
      colorType,
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Vehicle color updated successfully',
    data: { color }
  });
});

export const deleteVehicleColor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins can delete colors
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can delete colors', 403);
  }

  // Soft delete
  await prisma.vehicleColor.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Vehicle color deleted successfully'
  });
});

// ============================================================================
// VEHICLE HIERARCHY FOR FORMS
// ============================================================================

export const getVehicleHierarchy = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId } = req.query;

  if (!dealershipId) {
    throw createError('Dealership ID is required', 400);
  }

  const vehicleModels = await prisma.vehicleModel.findMany({
    where: {
      dealershipId: dealershipId as string,
      isActive: true
    },
    include: {
      variants: {
        where: { isActive: true },
        include: {
          colors: {
            where: { isActive: true }
          }
        }
      }
    },
    orderBy: { modelName: 'asc' }
  });

  res.json({
    success: true,
    data: { vehicleModels }
  });
});

// ============================================================================
// CUSTOM ROLES MANAGEMENT
// ============================================================================

export const createCustomRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  // Only admins can create custom roles
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can create custom roles', 403);
  }

  const { dealershipId, roleName, roleCode, description, hierarchyLevel } = req.body;

  if (!dealershipId || !roleName || !roleCode || hierarchyLevel === undefined) {
    throw createError('Dealership ID, role name, role code, and hierarchy level are required', 400);
  }

  const customRole = await prisma.customRole.create({
    data: {
      dealershipId,
      roleName,
      roleCode,
      description,
      hierarchyLevel
    }
  });

  res.status(201).json({
    success: true,
    message: 'Custom role created successfully',
    data: { customRole }
  });
});

export const getCustomRoles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId } = req.query;

  const where: any = { isActive: true };
  if (dealershipId) {
    where.dealershipId = dealershipId as string;
  }

  const customRoles = await prisma.customRole.findMany({
    where,
    include: {
      dealership: {
        select: {
          id: true,
          name: true
        }
      },
      permissions: true,
      _count: {
        select: {
          userRoleAssignments: true
        }
      }
    },
    orderBy: { hierarchyLevel: 'asc' }
  });

  res.json({
    success: true,
    data: { customRoles }
  });
});

export const updateCustomRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins can update custom roles
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can update custom roles', 403);
  }

  const { roleName, roleCode, description, hierarchyLevel } = req.body;

  const customRole = await prisma.customRole.update({
    where: { id },
    data: {
      roleName,
      roleCode,
      description,
      hierarchyLevel,
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Custom role updated successfully',
    data: { customRole }
  });
});

export const deleteCustomRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only admins can delete custom roles
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can delete custom roles', 403);
  }

  // Soft delete
  await prisma.customRole.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Custom role deleted successfully'
  });
});

// ============================================================================
// MODULE PERMISSIONS MANAGEMENT
// ============================================================================

export const setRolePermissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roleId } = req.params;
  const user = req.user;

  // Only admins can set role permissions
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can set role permissions', 403);
  }

  const {
    moduleName,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canAddRemarks,
    canViewRemarks,
    canViewAllData
  } = req.body;

  if (!moduleName) {
    throw createError('Module name is required', 400);
  }

  const permission = await prisma.modulePermission.upsert({
    where: {
      roleId_moduleName: {
        roleId,
        moduleName
      }
    },
    update: {
      canCreate,
      canRead,
      canUpdate,
      canDelete,
      canAddRemarks,
      canViewRemarks,
      canViewAllData,
      updatedAt: new Date()
    },
    create: {
      roleId,
      moduleName,
      canCreate: canCreate || false,
      canRead: canRead || false,
      canUpdate: canUpdate || false,
      canDelete: canDelete || false,
      canAddRemarks: canAddRemarks || false,
      canViewRemarks: canViewRemarks || false,
      canViewAllData: canViewAllData || false
    }
  });

  res.json({
    success: true,
    message: 'Role permissions updated successfully',
    data: { permission }
  });
});

export const getRolePermissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roleId } = req.params;

  const permissions = await prisma.modulePermission.findMany({
    where: { roleId },
    orderBy: { moduleName: 'asc' }
  });

  res.json({
    success: true,
    data: { permissions }
  });
});

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

export const assignUserRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const user = req.user;

  // Only admins and general managers can assign roles
  const allowedRoles: RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_MANAGER];
  if (!allowedRoles.includes(user.role.name)) {
    throw createError('Insufficient permissions', 403);
  }

  const { customRoleId, dealershipId } = req.body;

  if (!customRoleId || !dealershipId) {
    throw createError('Custom role ID and dealership ID are required', 400);
  }

  const assignment = await prisma.userRoleAssignment.upsert({
    where: {
      userId_dealershipId: {
        userId,
        dealershipId
      }
    },
    update: {
      customRoleId,
      assignedBy: user.firebaseUid,
      assignedAt: new Date()
    },
    create: {
      userId,
      customRoleId,
      dealershipId,
      assignedBy: user.firebaseUid
    },
    include: {
      customRole: true,
      dealership: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'User role assigned successfully',
    data: { assignment }
  });
});

export const getUserRoleAssignments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;

  const assignments = await prisma.userRoleAssignment.findMany({
    where: {
      userId,
      isActive: true
    },
    include: {
      customRole: {
        include: {
          permissions: true
        }
      },
      dealership: {
        select: {
          id: true,
          name: true,
          companyName: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: { assignments }
  });
});

export const removeUserRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const user = req.user;

  // Only admins can remove role assignments
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Only admins can remove role assignments', 403);
  }

  const { dealershipId } = req.body;

  if (!dealershipId) {
    throw createError('Dealership ID is required', 400);
  }

  await prisma.userRoleAssignment.update({
    where: {
      userId_dealershipId: {
        userId,
        dealershipId
      }
    },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'User role assignment removed successfully'
  });
});

