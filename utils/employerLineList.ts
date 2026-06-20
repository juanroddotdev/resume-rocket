/** Join stored line arrays for textarea display (preserves newlines). */
export function arrayToLines(values?: string[]): string {
  return values?.join('\n') ?? ''
}

/** Normalize textarea content to a trimmed string array (commit on blur). */
export function linesToArray(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}
