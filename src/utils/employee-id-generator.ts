import prisma from '../config/db';
import { RoleName } from '@prisma/client';

/**
 * Generate custom employee ID based on role
 * Format:
 * - ADMIN: ADM001, ADM002, ...
 * - GENERAL_MANAGER: GM001, GM002, ...
 * - SALES_MANAGER: SM001, SM002, ...
 * - TEAM_LEAD: TL001, TL002, ...
 * - CUSTOMER_ADVISOR: ADV001, ADV002, ...
 */
export async function generateEmployeeId(roleName: RoleName): Promise<string> {
  // Define prefix for each role
  const rolePrefixes: Record<RoleName, string> = {
    ADMIN: 'ADM',
    GENERAL_MANAGER: 'GM',
    SALES_MANAGER: 'SM',
    TEAM_LEAD: 'TL',
    CUSTOMER_ADVISOR: 'ADV'
  };

  const prefix = rolePrefixes[roleName];

  // Get the highest existing employee ID for this prefix
  const existingUsers = await prisma.user.findMany({
    where: {
      employeeId: {
        startsWith: prefix
      }
    },
    select: {
      employeeId: true
    },
    orderBy: {
      employeeId: 'desc'
    },
    take: 1
  });

  let nextNumber = 1;

  if (existingUsers.length > 0 && existingUsers[0].employeeId) {
    // Extract number from last ID (e.g., "ADV005" → 5)
    const lastId = existingUsers[0].employeeId;
    const numberPart = lastId.replace(prefix, '');
    const lastNumber = parseInt(numberPart, 10);
    
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Format with leading zeros (3 digits)
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  
  return `${prefix}${formattedNumber}`;
}

/**
 * Validate employee ID format
 */
export function isValidEmployeeId(employeeId: string): boolean {
  const validPrefixes = ['ADM', 'GM', 'SM', 'TL', 'ADV'];
  const pattern = /^(ADM|GM|SM|TL|ADV)\d{3}$/;
  
  return pattern.test(employeeId);
}

/**
 * Extract role from employee ID
 */
export function getRoleFromEmployeeId(employeeId: string): RoleName | null {
  if (!isValidEmployeeId(employeeId)) return null;
  
  const prefix = employeeId.substring(0, employeeId.length - 3);
  
  const prefixToRole: Record<string, RoleName> = {
    'ADM': RoleName.ADMIN,
    'GM': RoleName.GENERAL_MANAGER,
    'SM': RoleName.SALES_MANAGER,
    'TL': RoleName.TEAM_LEAD,
    'ADV': RoleName.CUSTOMER_ADVISOR
  };
  
  return prefixToRole[prefix] || null;
}

