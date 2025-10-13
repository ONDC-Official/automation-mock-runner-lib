/**
 * JSON Schema validator for user inputs
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class InputValidator {
  /**
   * Validates input data against a JSON schema
   * This is a simple implementation - consider using ajv for production
   */
  static validateInputs(data: any, schema: any): ValidationResult {
    const errors: string[] = [];

    if (!schema || typeof schema !== 'object') {
      return { valid: true, errors: [] };
    }

    try {
      this.validateObject(data, schema, '', errors);
    } catch (error) {
      errors.push(`Validation error: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static validateObject(data: any, schema: any, path: string, errors: string[]): void {
    if (schema.type === 'object') {
      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        errors.push(`${path || 'root'}: Expected object, got ${typeof data}`);
        return;
      }

      // Check required properties
      if (schema.required && Array.isArray(schema.required)) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in data)) {
            errors.push(`${path}.${requiredProp}: Required property missing`);
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in data) {
            const propPath = path ? `${path}.${propName}` : propName;
            this.validateProperty(data[propName], propSchema as any, propPath, errors);
          }
        }
      }

      // Check additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = Object.keys(schema.properties || {});
        for (const prop of Object.keys(data)) {
          if (!allowedProps.includes(prop)) {
            errors.push(`${path}.${prop}: Additional property not allowed`);
          }
        }
      }
    }
  }

  private static validateProperty(value: any, schema: any, path: string, errors: string[]): void {
    // Type validation
    if (schema.type) {
      if (!this.validateType(value, schema.type)) {
        errors.push(`${path}: Expected ${schema.type}, got ${typeof value}`);
        return;
      }
    }

    // String validations
    if (schema.type === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        errors.push(`${path}: String too short (minimum ${schema.minLength})`);
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(`${path}: String too long (maximum ${schema.maxLength})`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push(`${path}: String does not match pattern ${schema.pattern}`);
      }
      if (schema.format) {
        if (!this.validateFormat(value, schema.format)) {
          errors.push(`${path}: Invalid ${schema.format} format`);
        }
      }
    }

    // Number validations
    if (schema.type === 'number' || schema.type === 'integer') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path}: Value below minimum (${schema.minimum})`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path}: Value above maximum (${schema.maximum})`);
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: Value must be one of ${schema.enum.join(', ')}`);
    }

    // Nested object validation
    if (schema.type === 'object' && schema.properties) {
      this.validateObject(value, schema, path, errors);
    }
  }

  private static validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'integer':
        return Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return true;
    }
  }

  private static validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'uri':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'date':
        return !isNaN(Date.parse(value));
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      default:
        return true;
    }
  }
}