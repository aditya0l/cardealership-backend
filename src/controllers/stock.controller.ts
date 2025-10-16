import { Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { canPerformAction } from '../middlewares/rbac.middleware';
import { RoleName } from '@prisma/client';

interface CreateVehicleRequest {
  variant: string;
  vcCode?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  dealerId?: string;
  dealerType?: string;
  exShowroomPrice?: number;
  finalBillingPrice?: number;
  onRoadPrice?: number;
}

interface UpdateVehicleRequest {
  variant?: string;
  vcCode?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  dealerId?: string;
  dealerType?: string;
  exShowroomPrice?: number;
  finalBillingPrice?: number;
  onRoadPrice?: number;
}

export const createVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  // Check if user can create vehicles - Admin and General Manager can create vehicles
  if (user.role.name !== RoleName.ADMIN && user.role.name !== RoleName.GENERAL_MANAGER) {
    throw createError('Insufficient permissions to create vehicles', 403);
  }

  const data: any = req.body;

  if (!data.variant) {
    throw createError('Vehicle variant is required', 400);
  }

  if (data.exShowroomPrice !== undefined && data.exShowroomPrice <= 0) {
    throw createError('Ex-showroom price must be greater than 0', 400);
  }

  // Auto-calculate totalStock from all stock locations
  const zawlStock = parseInt(data.zawlStock) || 0;
  const rasStock = parseInt(data.rasStock) || 0;
  const regionalStock = parseInt(data.regionalStock) || 0;
  const plantStock = parseInt(data.plantStock) || 0;
  const totalStock = zawlStock + rasStock + regionalStock + plantStock;

  const vehicle = await prisma.vehicle.create({
    data: {
      ...data,
      zawlStock,
      rasStock,
      regionalStock,
      plantStock,
      totalStock,
      dealershipId: user.dealershipId // CRITICAL: Assign to user's dealership
    },
    include: {
      dealer: true,
      model: true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Vehicle created successfully',
    data: { vehicle }
  });
});

export const getVehicles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const dealerId = req.query.dealerId as string; // Dealer-specific filtering
  
  // Check if user can read vehicles
  if (!canPerformAction(user.role.name, 'read', 'booking')) {
    throw createError('Insufficient permissions to view vehicles', 403);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  const dealerType = req.query.dealerType as string;

  const skip = (page - 1) * limit;
  
  const where: any = { isActive: true };
  
  // CRITICAL: Filter by dealership for multi-tenant isolation
  if (user.dealershipId) {
    where.dealershipId = user.dealershipId;
  }
  
  // Dealer-specific filtering
  if (dealerId) {
    where.dealerId = dealerId;
  }
  
  if (search) {
    where.OR = [
      { variant: { contains: search, mode: 'insensitive' } },
      { vcCode: { contains: search, mode: 'insensitive' } },
      { color: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (dealerType) {
    where.dealerType = dealerType;
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take: limit,
      include: {
        dealer: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.vehicle.count({ where })
  ]);

  res.json({
    success: true,
    message: 'Vehicles retrieved successfully',
    data: {
      vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

export const getVehicleById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Check if user can read vehicles
  if (!canPerformAction(user.role.name, 'read', 'booking')) {
    throw createError('Insufficient permissions to view vehicle', 403);
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      dealer: true
    }
  });

  if (!vehicle) {
    throw createError('Vehicle not found', 404);
  }

  res.json({
    success: true,
    message: 'Vehicle retrieved successfully',
    data: { vehicle }
  });
});

export const updateVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Check if user can update vehicles (Admin, General Manager, Sales Manager, Team Lead)
  const allowedRoles = [RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.TEAM_LEAD];
  if (!allowedRoles.includes(user.role.name as any)) {
    throw createError('Insufficient permissions to update vehicles', 403);
  }

  const updateData: any = req.body;

  if (updateData.exShowroomPrice !== undefined && updateData.exShowroomPrice <= 0) {
    throw createError('Ex-showroom price must be greater than 0', 400);
  }

  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id }
  });

  if (!existingVehicle) {
    throw createError('Vehicle not found', 404);
  }

  // Auto-calculate totalStock if any stock quantities are updated
  if (updateData.zawlStock !== undefined || updateData.rasStock !== undefined || 
      updateData.regionalStock !== undefined || updateData.plantStock !== undefined) {
    const zawlStock = updateData.zawlStock !== undefined ? parseInt(updateData.zawlStock) : existingVehicle.zawlStock;
    const rasStock = updateData.rasStock !== undefined ? parseInt(updateData.rasStock) : existingVehicle.rasStock;
    const regionalStock = updateData.regionalStock !== undefined ? parseInt(updateData.regionalStock) : existingVehicle.regionalStock;
    const plantStock = updateData.plantStock !== undefined ? parseInt(updateData.plantStock) : existingVehicle.plantStock;
    
    updateData.totalStock = zawlStock + rasStock + regionalStock + plantStock;
  }

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: updateData,
    include: {
      dealer: true,
      model: true
    }
  });

  res.json({
    success: true,
    message: 'Vehicle updated successfully',
    data: { vehicle }
  });
});

export const deleteVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Check if user can delete vehicles (Admin only)
  if (user.role.name !== RoleName.ADMIN) {
    throw createError('Insufficient permissions to delete vehicles', 403);
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id }
  });

  if (!vehicle) {
    throw createError('Vehicle not found', 404);
  }

  // Soft delete by setting isActive to false
  await prisma.vehicle.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Vehicle deleted successfully'
  });
});
