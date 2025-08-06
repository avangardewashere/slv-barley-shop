/**
 * Application Version Configuration
 * Update this file to change the version across the entire application
 */

export const VERSION = 'v1.0.0';

export const VERSION_INFO = {
  version: VERSION,
  buildDate: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
};

// Semantic version parts for programmatic access
export const VERSION_PARTS = {
  major: 1,
  minor: 0,
  patch: 0,
};

export default VERSION;