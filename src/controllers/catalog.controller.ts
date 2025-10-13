import { Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

// Add vehicle to dealership catalog
export const addVehicleToCatalog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId } = req.params;
  const { brand, model, variants } = req.body;

  // Check permissions
  const allowedRoles: RoleName[] = [RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER];
  const canManage = req.user.role.name === RoleName.ADMIN || 
                    (req.user.dealershipId === dealershipId && 
                     allowedRoles.includes(req.user.role.name));

  if (!canManage) {
    throw createError('Insufficient permissions to manage catalog', 403);
  }

  // Validate input
  if (!brand || !model || !variants || !Array.isArray(variants)) {
    throw createError('Brand, model, and variants are required', 400);
  }

  // Verify dealership exists
  const dealership = await prisma.dealership.findUnique({
    where: { id: dealershipId }
  });

  if (!dealership) {
    throw createError('Dealership not found', 404);
  }

  // Check if catalog entry already exists
  const existing = await prisma.vehicleCatalog.findFirst({
    where: {
      dealershipId,
      brand,
      model
    }
  });

  if (existing) {
    throw createError('Vehicle model already exists in catalog', 409);
  }

  // Create catalog entry
  const catalog = await prisma.vehicleCatalog.create({
    data: {
      dealershipId,
      brand,
      model,
      variants,
      isActive: true
    },
    include: {
      dealership: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Vehicle added to catalog successfully',
    data: { catalog }
  });
});

// Get all brands for a dealership
export const getDealershipBrands = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId } = req.params;

  const catalogs = await prisma.vehicleCatalog.findMany({
    where: {
      dealershipId,
      isActive: true
    },
    select: {
      brand: true
    },
    distinct: ['brand']
  });

  const brands = catalogs.map((c: any) => c.brand);

  res.json({
    success: true,
    message: 'Brands retrieved successfully',
    data: { brands }
  });
});

// Get all models for a specific brand
export const getDealershipModels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId } = req.params;
  const brand = req.query.brand as string;

  if (!brand) {
    throw createError('Brand query parameter is required', 400);
  }

  const catalogs = await prisma.vehicleCatalog.findMany({
    where: {
      dealershipId,
      brand,
      isActive: true
    },
    select: {
      id: true,
      model: true,
      variants: true
    },
    orderBy: {
      model: 'asc'
    }
  });

  res.json({
    success: true,
    message: 'Models retrieved successfully',
    data: {
      brand,
      models: catalogs.map((c: any) => ({
        id: c.id,
        name: c.model,
        variantsCount: Array.isArray(c.variants) ? c.variants.length : 0
      }))
    }
  });
});

// Get variants for a specific model
export const getModelVariants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId, catalogId } = req.params;

  const catalog = await prisma.vehicleCatalog.findFirst({
    where: {
      id: catalogId,
      dealershipId,
      isActive: true
    }
  });

  if (!catalog) {
    throw createError('Catalog entry not found', 404);
  }

  res.json({
    success: true,
    message: 'Variants retrieved successfully',
    data: {
      brand: catalog.brand,
      model: catalog.model,
      variants: catalog.variants
    }
  });
});

// Update catalog entry
export const updateCatalog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId, catalogId } = req.params;

  // Check permissions
  const allowedUpdateRoles: RoleName[] = [RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER];
  const canManage = req.user.role.name === RoleName.ADMIN ||
                    (req.user.dealershipId === dealershipId &&
                     allowedUpdateRoles.includes(req.user.role.name));

  if (!canManage) {
    throw createError('Insufficient permissions to update catalog', 403);
  }

  const updateData: any = {};
  if (req.body.variants !== undefined) updateData.variants = req.body.variants;
  if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

  const catalog = await prisma.vehicleCatalog.update({
    where: { id: catalogId },
    data: updateData
  });

  res.json({
    success: true,
    message: 'Catalog updated successfully',
    data: { catalog }
  });
});

// Delete catalog entry (soft delete)
export const deleteCatalog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId, catalogId } = req.params;

  // Check permissions
  const canManage = req.user.role.name === RoleName.ADMIN ||
                    (req.user.dealershipId === dealershipId &&
                     req.user.role.name === RoleName.GENERAL_MANAGER);

  if (!canManage) {
    throw createError('Insufficient permissions to delete catalog', 403);
  }

  await prisma.vehicleCatalog.update({
    where: { id: catalogId },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Catalog entry deleted successfully'
  });
});

// Get complete dealership catalog (all brands, models, variants)
export const getCompleteCatalog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId } = req.params;

  const catalogs = await prisma.vehicleCatalog.findMany({
    where: {
      dealershipId,
      isActive: true
    },
    orderBy: [
      { brand: 'asc' },
      { model: 'asc' }
    ]
  });

  // Group by brand
  const groupedCatalog: Record<string, any[]> = {};
  
  catalogs.forEach((catalog: any) => {
    if (!groupedCatalog[catalog.brand]) {
      groupedCatalog[catalog.brand] = [];
    }
    groupedCatalog[catalog.brand].push({
      id: catalog.id,
      model: catalog.model,
      variants: catalog.variants,
      createdAt: catalog.createdAt,
      updatedAt: catalog.updatedAt
    });
  });

  res.json({
    success: true,
    message: 'Complete catalog retrieved successfully',
    data: {
      dealershipId,
      catalog: groupedCatalog
    }
  });
});

