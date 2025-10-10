import { RoleName } from '@prisma/client';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateRole = (role: string): boolean => {
  return Object.values(RoleName).includes(role as RoleName);
};

export const validatePagination = (page?: string, limit?: string) => {
  const parsedPage = page ? parseInt(page, 10) : 1;
  const parsedLimit = limit ? parseInt(limit, 10) : 10;
  
  if (isNaN(parsedPage) || parsedPage < 1) {
    throw new ValidationError('Page must be a positive integer');
  }
  
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }
  
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
};

export const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const sanitizeString = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input.trim().replace(/\s+/g, ' ');
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Simple phone number validation - adjust based on your requirements
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

export const validateAmount = (amount: number): boolean => {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         isFinite(amount) && 
         amount > 0;
};

export const validateQuantity = (quantity: number): boolean => {
  return typeof quantity === 'number' && 
         !isNaN(quantity) && 
         isFinite(quantity) && 
         quantity >= 0 && 
         Number.isInteger(quantity);
};

// Request body validators
export const validateRegisterRequest = (body: any) => {
  const errors: string[] = [];
  
  if (!body.name || typeof body.name !== 'string') {
    errors.push('Name is required and must be a string');
  } else if (body.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!body.email || typeof body.email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!validateEmail(body.email)) {
    errors.push('Invalid email format');
  }
  
  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required and must be a string');
  } else {
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }
  
  if (!body.roleName || typeof body.roleName !== 'string') {
    errors.push('Role name is required and must be a string');
  } else if (!validateRole(body.roleName)) {
    errors.push('Invalid role name');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateLoginRequest = (body: any) => {
  const errors: string[] = [];
  
  if (!body.email || typeof body.email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!validateEmail(body.email)) {
    errors.push('Invalid email format');
  }
  
  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required and must be a string');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
