/**
 * Custom error classes for better error handling and debugging
 */

export class MockRunnerError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(message: string, code: string, context: Record<string, any> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export class ConfigurationError extends MockRunnerError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'CONFIG_ERROR', context);
  }
}

export class ValidationError extends MockRunnerError {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[] = [], context: Record<string, any> = {}) {
    super(message, 'VALIDATION_ERROR', context);
    this.validationErrors = validationErrors;
  }
}

export class ExecutionError extends MockRunnerError {
  public readonly executionTime: number;
  public readonly actionId: string;

  constructor(message: string, actionId: string, executionTime: number = 0, context: Record<string, any> = {}) {
    super(message, 'EXECUTION_ERROR', { ...context, actionId, executionTime });
    this.executionTime = executionTime;
    this.actionId = actionId;
  }
}

export class SecurityError extends MockRunnerError {
  public readonly securityViolation: string;

  constructor(message: string, violation: string, context: Record<string, any> = {}) {
    super(message, 'SECURITY_ERROR', { ...context, violation });
    this.securityViolation = violation;
  }
}

export class TimeoutError extends MockRunnerError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, context: Record<string, any> = {}) {
    super(message, 'TIMEOUT_ERROR', { ...context, timeoutMs });
    this.timeoutMs = timeoutMs;
  }
}

export class ActionNotFoundError extends MockRunnerError {
  public readonly actionId: string;
  public readonly availableActions: string[];

  constructor(actionId: string, availableActions: string[] = []) {
    super(`Action step with ID '${actionId}' not found`, 'ACTION_NOT_FOUND', { 
      actionId, 
      availableActions 
    });
    this.actionId = actionId;
    this.availableActions = availableActions;
  }
}

export class SessionDataError extends MockRunnerError {
  public readonly stepIndex: number;
  public readonly jsonPath: string;

  constructor(message: string, stepIndex: number, jsonPath?: string, context: Record<string, any> = {}) {
    super(message, 'SESSION_DATA_ERROR', { ...context, stepIndex, jsonPath });
    this.stepIndex = stepIndex;
    this.jsonPath = jsonPath || '';
  }
}