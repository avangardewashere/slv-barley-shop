import { z } from 'zod';

// Password policy configuration
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
}

// Default password policy from environment or fallback
export const getPasswordPolicy = (): PasswordPolicy => ({
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
  maxLength: 128,
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
  requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
  requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS === 'true',
  preventCommonPasswords: true,
  preventUserInfo: true,
});

// Common weak passwords to check against
const COMMON_PASSWORDS = [
  'password', '12345678', '123456789', 'qwerty', 'abc123',
  'password123', 'admin', 'letmein', 'welcome', 'monkey',
  '1234567890', 'qwertyuiop', 'password1', '123123', 'welcome123',
  'admin123', 'root', 'toor', 'pass', 'test', 'guest',
  'master', 'dragon', 'baseball', 'football', 'letmein123',
  'mustang', 'michael', 'shadow', 'superman', 'hello',
];

// Password strength levels
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4,
  VERY_STRONG = 5,
}

// Password validation result
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
  score: number;
  suggestions: string[];
}

// Check if password contains user information
const containsUserInfo = (
  password: string,
  email?: string,
  name?: string
): boolean => {
  const lowerPassword = password.toLowerCase();
  
  if (email) {
    const emailParts = email.toLowerCase().split('@')[0].split(/[._-]/);
    for (const part of emailParts) {
      if (part.length > 3 && lowerPassword.includes(part)) {
        return true;
      }
    }
  }
  
  if (name) {
    const nameParts = name.toLowerCase().split(/\s+/);
    for (const part of nameParts) {
      if (part.length > 3 && lowerPassword.includes(part)) {
        return true;
      }
    }
  }
  
  return false;
};

// Calculate password entropy
const calculateEntropy = (password: string): number => {
  let charset = 0;
  
  if (/[a-z]/.test(password)) charset += 26;
  if (/[A-Z]/.test(password)) charset += 26;
  if (/[0-9]/.test(password)) charset += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charset += 32;
  
  return password.length * Math.log2(charset);
};

// Calculate password strength
const calculateStrength = (password: string, entropy: number): PasswordStrength => {
  if (entropy < 25) return PasswordStrength.VERY_WEAK;
  if (entropy < 35) return PasswordStrength.WEAK;
  if (entropy < 45) return PasswordStrength.FAIR;
  if (entropy < 55) return PasswordStrength.GOOD;
  if (entropy < 70) return PasswordStrength.STRONG;
  return PasswordStrength.VERY_STRONG;
};

// Main password validation function
export const validatePassword = (
  password: string,
  options?: {
    email?: string;
    name?: string;
    policy?: Partial<PasswordPolicy>;
  }
): PasswordValidationResult => {
  const policy = { ...getPasswordPolicy(), ...(options?.policy || {}) };
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Length validation
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
    suggestions.push(`Add ${policy.minLength - password.length} more characters`);
  }
  
  if (password.length > policy.maxLength) {
    errors.push(`Password must not exceed ${policy.maxLength} characters`);
  }
  
  // Character type validation
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
    suggestions.push('Add an uppercase letter (A-Z)');
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
    suggestions.push('Add a lowercase letter (a-z)');
  }
  
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
    suggestions.push('Add a number (0-9)');
  }
  
  if (policy.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
    suggestions.push('Add a special character (!@#$%^&*...)');
  }
  
  // Check for common passwords
  if (policy.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword === common)) {
      errors.push('Password is too common and easily guessable');
      suggestions.push('Choose a more unique password');
    }
  }
  
  // Check for user information
  if (policy.preventUserInfo && containsUserInfo(password, options?.email, options?.name)) {
    errors.push('Password should not contain personal information');
    suggestions.push('Avoid using your name or email in the password');
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password contains too many repeated characters');
    suggestions.push('Avoid repeating the same character multiple times');
  }
  
  // Check for sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push('Password contains sequential characters');
    suggestions.push('Avoid sequential patterns like "abc" or "123"');
  }
  
  // Calculate entropy and strength
  const entropy = calculateEntropy(password);
  const strength = calculateStrength(password, entropy);
  const score = Math.min(100, Math.round((entropy / 70) * 100));
  
  // Add strength-based suggestions
  if (strength < PasswordStrength.GOOD) {
    if (password.length < 12) {
      suggestions.push('Consider using a longer password (12+ characters)');
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      suggestions.push('Add special characters to increase strength');
    }
    suggestions.push('Consider using a passphrase with multiple words');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score,
    suggestions: [...new Set(suggestions)], // Remove duplicates
  };
};

// Zod schema for password validation
export const createPasswordSchema = (options?: {
  email?: string;
  name?: string;
  policy?: Partial<PasswordPolicy>;
}) => {
  return z.string().refine(
    (password) => {
      const result = validatePassword(password, options);
      return result.isValid;
    },
    (password) => {
      const result = validatePassword(password, options);
      return {
        message: result.errors.join(', '),
      };
    }
  );
};

// Generate strong password suggestion
export const generateStrongPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Check if password has been breached (requires external API in production)
export const checkPasswordBreach = async (password: string): Promise<boolean> => {
  // In production, you would check against haveibeenpwned.com API
  // For now, just check against our common passwords list
  return COMMON_PASSWORDS.includes(password.toLowerCase());
};