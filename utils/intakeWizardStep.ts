export type WizardStep = number | 'success'

/** Parse `?step=` query value into a wizard step, or null when invalid/absent. */
export function parseStepQuery(raw: unknown): WizardStep | null {
  if (raw == null || raw === '') return null
  const value = String(raw).trim().toLowerCase()
  if (value === 'success') return 'success'
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > 4) return null
  return n
}

/** Serialize wizard step for the URL query; omit on step 0 (upload). */
export function stepToQuery(step: WizardStep): string | undefined {
  if (step === 0) return undefined
  if (step === 'success') return 'success'
  return String(step)
}

export function isEditableWizardStep(step: WizardStep): step is number {
  return typeof step === 'number' && step >= 1 && step <= 4
}
