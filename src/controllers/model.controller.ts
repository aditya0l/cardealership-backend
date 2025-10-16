import { Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

interface CreateModelRequest {
  brand: string;
  modelName: string;
  segment?: string;
  description?: string;
  basePrice?: number;
}

interface UpdateModelRequest {
  brand?: string;
  modelName?: string;
  segment?: string;
  description?: string;
  basePrice?: number;
  isActive?: boolean;
}

/**
 * Create a new vehicle model
 */
export const createModel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // Only Admin and General Manager can create models
  if (user.role.name !== RoleName.ADMIN && user.role.name !== RoleName.GENERAL_MANAGER) {
    throw createError('Insufficient permissions to create models', 403);
  }

  const { brand, modelName, segment, description, basePrice }: CreateModelRequest = req.body;

  if (!brand || !modelName) {
    throw createError('Brand and model name are required', 400);
  }

  // Check if model already exists
  const existing = await prisma.model.findFirst({
    where: {
      brand,
      modelName
    }
  });

  if (existing) {
    throw createError('Model with this brand and name already exists', 409);
  }

  const model = await prisma.model.create({
    data: {
      brand,
      modelName,
      segment,
      description,
      basePrice
    }
  });

  res.status(201).json({
    success: true,
    message: 'Model created successfully',
    data: { model }
  });
});

/**
 * Get all models with optional filtering
 */
export const getModels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const brand = req.query.brand as string;
  const segment = req.query.segment as string;
  const isActive = req.query.isActive === 'true';

  const skip = (page - 1) * limit;
  
  const where: any = {};
  if (brand) where.brand = brand;
  if (segment) where.segment = segment;
  if (isActive !== undefined) where.isActive = isActive;

  const [models, total] = await Promise.all([
    prisma.model.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: {
          select: { vehicles: true }
        }
      },
      orderBy: { brand: 'asc' }
    }),
    prisma.model.count({ where })
  ]);

  res.json({
    success: true,
    message: 'Models retrieved successfully',
    data: {
      models,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get model by ID
 */
export const getModelById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const model = await prisma.model.findUnique({
    where: { id },
    include: {
      vehicles: {
        select: {
          id: true,
          variant: true,
          color: true,
          fuelType: true,
          transmission: true,
          totalStock: true,
          exShowroomPrice: true,
          dealerId: true,
          isActive: true
        }
      }
    }
  });

  if (!model) {
    throw createError('Model not found', 404);
  }

  res.json({
    success: true,
    message: 'Model retrieved successfully',
    data: { model }
  });
});

/**
 * Update model
 */
export const updateModel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role.name !== RoleName.ADMIN && user.role.name !== RoleName.GENERAL_MANAGER) {
    throw createError('Insufficient permissions to update models', 403);
  }

  const updateData: UpdateModelRequest = req.body;

  // Check if model exists
  const existing = await prisma.model.findUnique({ where: { id } });
  if (!existing) {
    throw createError('Model not found', 404);
  }

  // If changing brand/modelName, check for duplicates
  if ((updateData.brand || updateData.modelName) &&
      (updateData.brand !== existing.brand || updateData.modelName !== existing.modelName)) {
    const duplicate = await prisma.model.findFirst({
      where: {
        brand: updateData.brand || existing.brand,
        modelName: updateData.modelName || existing.modelName,
        id: { not: id }
      }
    });

    if (duplicate) {
      throw createError('Model with this brand and name already exists', 409);
    }
  }

  const model = await prisma.model.update({
    where: { id },
    data: updateData
  });

  res.json({
    success: true,
    message: 'Model updated successfully',
    data: { model }
  });
});

/**
 * Delete model (soft delete)
 */
export const deleteModel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Insufficient permissions to delete models', 403);
  }

  const model = await prisma.model.findUnique({ where: { id } });
  if (!model) {
    throw createError('Model not found', 404);
  }

  // Soft delete
  await prisma.model.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Model deleted successfully'
  });
});

