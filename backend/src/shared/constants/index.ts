// Default values
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Date formats
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// Expiry warning periods (days)
export const EXPIRY_WARNING_DAYS = {
  CRITICAL: 30,
  WARNING: 60,
  INFO: 90,
};

// Low stock threshold (percentage)
export const LOW_STOCK_THRESHOLD = 20;

// Barcode prefix
export const BARCODE_PREFIX = 'MWH';

// Tax rate (percentage)
export const TAX_RATE = 15;

// Currency
export const CURRENCY = 'SAR';

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

// JWT expiry
export const JWT_EXPIRY = '1h';
export const REFRESH_TOKEN_EXPIRY = '7d';

// Password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// Response messages
export const MESSAGES = {
  // Success
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',

  // Auth
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized access',
  TOKEN_EXPIRED: 'Token has expired',

  // Errors
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  INVALID_INPUT: 'Invalid input data',
  INTERNAL_ERROR: 'Internal server error',

  // Validation
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PASSWORD: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
  PASSWORD_MISMATCH: 'Passwords do not match',

  // Stock
  INSUFFICIENT_STOCK: 'Insufficient stock',
  STOCK_ADJUSTED: 'Stock adjusted successfully',
  STOCK_TRANSFERRED: 'Stock transferred successfully',

  // Orders
  ORDER_CREATED: 'Order created successfully',
  ORDER_UPDATED: 'Order updated successfully',
  ORDER_CANCELLED: 'Order cancelled successfully',
  ORDER_APPROVED: 'Order approved successfully',
  ORDER_REJECTED: 'Order rejected successfully',
};
