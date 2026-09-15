import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

const format = (entry: LogEntry) => JSON.stringify(entry);

// ponytail: no pino/winston dep — daily rolling file via node:fs append,
// best-effort (logging never throws). Console transport stays as-is.
export const resolveLogFilePath = (now: Date = new Date()): string =>
  process.env.LOG_FILE_PATH ?? path.join('logs', `app-${now.toISOString().slice(0, 10)}.log`);

const writeFileSink = (line: string): void => {
  const filePath = resolveLogFilePath();
  void mkdir(path.dirname(filePath), { recursive: true })
    .then(() => appendFile(filePath, `${line}\n`))
    .catch(() => {});
};

// Never log secrets: context keys that look like credentials are redacted
// in BOTH console and file output. Callers must also keep secrets out of
// the message string itself (messages pass through verbatim).
const SECRET_KEY_PATTERN =
  /password|passwd|secret|token|authorization|api[-_]?key|cookie|credential|private[-_]?key|session/i;

const redactSecrets = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) =>
        SECRET_KEY_PATTERN.test(key) ? [key, '[REDACTED]'] : [key, redactSecrets(nested)],
      ),
    );
  }
  return value;
};

const emit = (
  consoleFn: (line: string) => void,
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
) => {
  const line = format({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(redactSecrets(context ?? {}) as Record<string, unknown>),
  });
  consoleFn(line);
  writeFileSink(line);
};

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    emit(console.log, 'info', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    emit(console.warn, 'warn', message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    emit(console.error, 'error', message, context),
};
