import prisma from '../config/db';

export interface StockStatus {
  variantCode: string;
  variantName: string;
  isInStock: boolean;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  lastUpdated: string;
  status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  badgeColor: 'green' | 'orange' | 'red' | 'gray';
  badgeText: string;
  stockLocations?: {
    zawl: number;
    ras: number;
    regional: number;
    plant: number;
  };
}

export class StockService {
  /**
   * Get stock status for a variant (informational only - does not block operations)
   */
  async getStockStatus(variantCode: string): Promise<StockStatus> {
    try {
      // Check stock availability
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          variant: variantCode,
          isActive: true
        },
        select: {
          id: true,
          variant: true,
          zawlStock: true,
          rasStock: true,
          regionalStock: true,
          plantStock: true,
          totalStock: true
        }
      });

      if (!vehicle) {
        // Vehicle not found in database
        return this.getUnknownStatus(variantCode);
      }

      const totalQuantity = vehicle.totalStock || 0;
      const reservedQuantity = 0; // TODO: Calculate from pending bookings if needed

      return {
        variantCode,
        variantName: vehicle.variant || variantCode,
        isInStock: totalQuantity > 0,
        availableQuantity: totalQuantity - reservedQuantity,
        reservedQuantity,
        totalQuantity,
        lastUpdated: new Date().toISOString(),
        status: this.getStatusBadge(totalQuantity),
        badgeColor: this.getBadgeColor(totalQuantity),
        badgeText: this.getBadgeText(totalQuantity),
        stockLocations: {
          zawl: vehicle.zawlStock || 0,
          ras: vehicle.rasStock || 0,
          regional: vehicle.regionalStock || 0,
          plant: vehicle.plantStock || 0
        }
      };
    } catch (error) {
      console.error(`Error fetching stock status for ${variantCode}:`, error);
      // Return default "unknown" status if stock check fails
      return this.getUnknownStatus(variantCode);
    }
  }

  /**
   * Get stock status for multiple variants
   */
  async getBulkStockStatus(variantCodes: string[]): Promise<Record<string, StockStatus>> {
    const results: Record<string, StockStatus> = {};
    
    for (const code of variantCodes) {
      results[code] = await this.getStockStatus(code);
    }
    
    return results;
  }

  /**
   * Get unknown status (when vehicle not found or error occurs)
   */
  private getUnknownStatus(variantCode: string): StockStatus {
    return {
      variantCode,
      variantName: variantCode,
      isInStock: false,
      availableQuantity: 0,
      reservedQuantity: 0,
      totalQuantity: 0,
      lastUpdated: new Date().toISOString(),
      status: 'UNKNOWN',
      badgeColor: 'gray',
      badgeText: 'Stock Unknown'
    };
  }

  /**
   * Get status badge based on quantity
   */
  private getStatusBadge(quantity: number): 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
    if (quantity > 5) return 'AVAILABLE';
    if (quantity > 0) return 'LOW_STOCK';
    return 'OUT_OF_STOCK';
  }

  /**
   * Get badge color based on quantity
   */
  private getBadgeColor(quantity: number): 'green' | 'orange' | 'red' {
    if (quantity > 5) return 'green';
    if (quantity > 0) return 'orange';
    return 'red';
  }

  /**
   * Get badge text based on quantity
   */
  private getBadgeText(quantity: number): string {
    if (quantity > 5) return 'In Stock';
    if (quantity > 0) return `Low Stock (${quantity} left)`;
    return 'Out of Stock';
  }
}

// Export singleton instance
export const stockService = new StockService();

