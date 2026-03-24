export function logMessage(message: string, ...meta: unknown[]): void {
  console.log(`[LOG]: ${message}`, ...meta);
}

export function logError(message: string, ...meta: unknown[]): void {
  console.error(`[LOG]: ${message}`, ...meta);
}
