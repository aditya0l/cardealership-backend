import { Request, Response } from 'express';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { QuotationStatus } from '@prisma/client';

interface CreateQuotationRequest {
  enquiryId: string;
  amount: number;
  pdfUrl?: string;
}

interface UpdateQuotationRequest {
  amount?: number;
  status?: QuotationStatus;
  pdfUrl?: string;
}

export const createQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { enquiryId, amount, pdfUrl }: CreateQuotationRequest = req.body;

  if (!enquiryId || !amount) {
    throw createError('Enquiry ID and amount are required', 400);
  }

  if (amount <= 0) {
    throw createError('Amount must be greater than 0', 400);
  }

  // Validate enquiry exists
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId }
  });

  if (!enquiry) {
    throw createError('Enquiry not found', 404);
  }

  const quotation = await prisma.quotation.create({
    data: {
      enquiryId,
      amount,
      pdfUrl
    },
    include: {
      enquiry: {
        select: {
          id: true,
          customerName: true,
          customerContact: true,
          customerEmail: true,
          status: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Quotation created successfully',
    data: { quotation }
  });
});

export const getQuotations = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as QuotationStatus;

  const skip = (page - 1) * limit;
  
  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      skip,
      take: limit,
      include: {
        enquiry: {
          select: {
            id: true,
            customerName: true,
            customerContact: true,
            customerEmail: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.quotation.count({ where })
  ]);

  res.json({
    success: true,
    message: 'Quotations retrieved successfully',
    data: {
      quotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

export const getQuotationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      enquiry: {
        include: {
          assignedTo: {
            select: {
              firebaseUid: true,
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              firebaseUid: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!quotation) {
    throw createError('Quotation not found', 404);
  }

  res.json({
    success: true,
    message: 'Quotation retrieved successfully',
    data: { quotation }
  });
});

export const updateQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, status, pdfUrl }: UpdateQuotationRequest = req.body;

  if (amount !== undefined && amount <= 0) {
    throw createError('Amount must be greater than 0', 400);
  }

  const existingQuotation = await prisma.quotation.findUnique({
    where: { id }
  });

  if (!existingQuotation) {
    throw createError('Quotation not found', 404);
  }

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount }),
      ...(status && { status }),
      ...(pdfUrl !== undefined && { pdfUrl })
    },
    include: {
      enquiry: {
        select: {
          id: true,
          customerName: true,
          customerContact: true,
          customerEmail: true,
          status: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Quotation updated successfully',
    data: { quotation }
  });
});

export const deleteQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id }
  });

  if (!quotation) {
    throw createError('Quotation not found', 404);
  }

  await prisma.quotation.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Quotation deleted successfully'
  });
});

export const getQuotationStats = asyncHandler(async (req: Request, res: Response) => {
  // Get total quotations count
  const totalQuotations = await prisma.quotation.count();

  // Get quotations by status
  const quotationsByStatus = await prisma.quotation.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  });

  // Get recent quotations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentQuotations = await prisma.quotation.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo
      }
    }
  });

  // Get average quotation amount
  const avgQuotationAmount = await prisma.quotation.aggregate({
    _avg: {
      amount: true
    },
    _sum: {
      amount: true
    },
    _max: {
      amount: true
    },
    _min: {
      amount: true
    }
  });

  // Get quotations with enquiry info (top amounts)
  const topQuotations = await prisma.quotation.findMany({
    take: 5,
    orderBy: {
      amount: 'desc'
    },
    include: {
      enquiry: {
        select: {
          customerName: true,
          model: true,
          variant: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Quotation statistics retrieved successfully',
    data: {
      totalQuotations,
      quotationsByStatus: quotationsByStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      recentQuotations,
      averageAmount: avgQuotationAmount._avg.amount,
      totalAmount: avgQuotationAmount._sum.amount,
      highestAmount: avgQuotationAmount._max.amount,
      lowestAmount: avgQuotationAmount._min.amount,
      topQuotations: topQuotations.map(item => ({
        id: item.id,
        amount: item.amount,
        status: item.status,
        customerName: item.enquiry.customerName,
        model: item.enquiry.model,
        variant: item.enquiry.variant,
        createdAt: item.createdAt
      }))
    }
  });
});
