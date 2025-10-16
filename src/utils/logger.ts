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

export interface LoggerOptions {
  level?: LogLevel;
  output?: NodeJS.WritableStream;
}

class Logger {
  private level: LogLevel;
  private module: string;
  private output: NodeJS.WritableStream;

  constructor(module: string, options: LogLevel | LoggerOptions = 'info') {
    this.module = module;
    
    if (typeof options === 'string') {
      this.level = this.getLogLevelFromEnv(options);
      this.output = this.getOutputFromEnv();
    } else {
      this.level = this.getLogLevelFromEnv(options.level || 'info');
      this.output = options.output || this.getOutputFromEnv();
    }
  }

  private getOutputFromEnv(): NodeJS.WritableStream {
    const logOutput = process.env.LOG_OUTPUT;
    if (logOutput === 'stderr') {
      return process.stderr;
    }
    return process.stdout;
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
    
    // Write to the configured output stream
    this.output.write(formattedMessage + '\n');
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
export function createLogger(module: string, options?: LogLevel | LoggerOptions): Logger {
  return new Logger(module, options);
}

/**
 * Default logger for the application
 */
export const logger = createLogger('mcp-meta-orchestrator');

