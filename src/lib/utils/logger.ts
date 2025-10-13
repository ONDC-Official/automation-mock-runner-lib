/**
 * Enhanced logging utility for MockRunner
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  executionId?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogEntries = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private addLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
      console.log(`[${entry.timestamp}] ${levelNames[level]}: ${message}`, context || '');
      if (error) console.error(error);
    }
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.addLog(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.addLog(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.addLog(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.addLog(LogLevel.DEBUG, message, context);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level <= level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  // Helper for execution tracking
  createExecutionContext(actionId: string): string {
    const executionId = `${actionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.debug(`Starting execution`, { actionId, executionId });
    return executionId;
  }

  logExecution(executionId: string, message: string, context?: Record<string, any>): void {
    this.info(message, { ...context, executionId });
  }
}