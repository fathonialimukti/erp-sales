type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

const format = (entry: LogEntry) => JSON.stringify(entry);

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    console.log(format({ timestamp: new Date().toISOString(), level: 'info', message, ...context })),
  warn: (message: string, context?: Record<string, unknown>) =>
    console.warn(format({ timestamp: new Date().toISOString(), level: 'warn', message, ...context })),
  error: (message: string, context?: Record<string, unknown>) =>
    console.error(format({ timestamp: new Date().toISOString(), level: 'error', message, ...context })),
};
