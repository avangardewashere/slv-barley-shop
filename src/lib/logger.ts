import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about the colors
winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.simple()
    ),
  }),
  // Error log file
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // Combined log file
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create stream for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export logger instance
export default logger;

// Utility functions for structured logging
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context,
  });
};

export const logWarning = (message: string, context?: Record<string, any>) => {
  logger.warn(message, context);
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, context);
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, context);
};

export const logHttpRequest = (
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  context?: Record<string, any>
) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
  
  logger.log(level, `${method} ${url} ${statusCode} ${responseTime}ms`, context);
};

// Security event logging
export const logSecurityEvent = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>
) => {
  const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  
  logger.log(level, `SECURITY: ${event}`, {
    severity,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Performance logging
export const logPerformance = (
  operation: string,
  duration: number,
  context?: Record<string, any>
) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  
  logger.log(level, `PERFORMANCE: ${operation} took ${duration}ms`, context);
};

// Database query logging
export const logDatabaseQuery = (
  collection: string,
  operation: string,
  duration: number,
  success: boolean,
  context?: Record<string, any>
) => {
  const level = !success ? 'error' : duration > 500 ? 'warn' : 'debug';
  
  logger.log(level, `DB: ${collection}.${operation} ${duration}ms`, {
    success,
    ...context,
  });
};

// API error response logging
export const logApiError = (
  endpoint: string,
  error: Error,
  statusCode: number,
  userId?: string,
  context?: Record<string, any>
) => {
  logger.error(`API Error: ${endpoint}`, {
    statusCode,
    error: error.message,
    stack: error.stack,
    userId,
    ...context,
  });
};

// Audit logging for important actions
export const logAudit = (
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  changes?: Record<string, any>,
  context?: Record<string, any>
) => {
  logger.info(`AUDIT: ${action}`, {
    userId,
    resourceType,
    resourceId,
    changes,
    timestamp: new Date().toISOString(),
    ...context,
  });
};