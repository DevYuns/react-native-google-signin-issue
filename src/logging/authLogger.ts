export type LogListener = (logs: string[]) => void

const MAX_LOG_COUNT = 300

let logs: string[] = []
const listeners = new Set<LogListener>()

function emit(): void {
  const snapshot = [...logs]

  listeners.forEach(listener => {
    listener(snapshot)
  })
}

export function sanitizeUrl(url: string): string {
  return url.replace(/\?.*$/, '?...')
}

export function logLine(message: string): void {
  const line = `${new Date().toISOString()} ${message}`

  logs = [...logs, line].slice(-MAX_LOG_COUNT)
  emit()
  console.log(line)
}

export function subscribeLogs(listener: LogListener): () => void {
  listeners.add(listener)
  listener([...logs])

  return () => {
    listeners.delete(listener)
  }
}

export function clearLogs(): void {
  logs = []
  emit()
}

export function getLogs(): string[] {
  return [...logs]
}
