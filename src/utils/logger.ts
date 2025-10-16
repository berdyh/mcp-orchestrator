/**
 * Logging Utility
 * 
 * Provides structured logging functionality for the MCP Meta-Orchestrator.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class Logger {
  private level: LogLevel;
  private module: string;

  constructor(module: string, level: LogLevel = 'info') {
    this.module = module;
    this.level = this.getLogLevelFromEnv(level);
  }

  private getLogLevelFromEnv(defaultLevel: LogLevel): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    
    if (envLevel && validLevels.includes(envLevel)) {
      return envLevel;
    }
    
    return defaultLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      module: this.module,
      message,
      ...(data && { data })
    };

    return JSON.stringify(logEntry);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, data);
    
    // Use appropriate console method based on level
    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }
}

/**
 * Creates a new logger instance for the specified module
 */
export function createLogger(module: string, level?: LogLevel): Logger {
  return new Logger(module, level);
}

/**
 * Default logger for the application
 */
export const logger = createLogger('mcp-meta-orchestrator');

