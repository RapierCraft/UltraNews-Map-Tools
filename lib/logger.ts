type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;
    
    if (context) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context;
    console.error(this.formatMessage('error', message, errorContext));
  }

  // For map-related events
  mapEvent(event: string, data?: Record<string, unknown>): void {
    this.debug(`Map Event: ${event}`, data);
  }

  // For API calls
  apiCall(endpoint: string, method: string, status?: number): void {
    this.debug(`API Call: ${method} ${endpoint}`, { status });
  }

  // For performance tracking
  performance(operation: string, duration: number): void {
    this.debug(`Performance: ${operation}`, { duration_ms: duration });
  }
}

export const logger = new Logger();