export const EMR_PRESET_OPTIONS = ['Epic', 'Cerner', 'Meditech'] as const
export type EmrPreset = (typeof EMR_PRESET_OPTIONS)[number]
export const EMR_OTHER_OPTION = 'Other'

export function resolveEmrFields(emrSystem: string | null | undefined) {
  const value = (emrSystem || '').trim()
  if (!value) {
    return { selection: '', custom: '' }
  }
  if ((EMR_PRESET_OPTIONS as readonly string[]).includes(value)) {
    return { selection: value, custom: '' }
  }
  return { selection: EMR_OTHER_OPTION, custom: value }
}

/** Persist only preset or custom text — never the literal "Other" placeholder. */
export function emrSystemFromFields(selection: string, custom: string) {
  if (!selection) return ''
  if (selection === EMR_OTHER_OPTION) return custom.trim()
  return selection
}

export function isEmrComplete(selection: string, custom: string) {
  if (!selection) return false
  if (selection === EMR_OTHER_OPTION) return Boolean(custom.trim())
  return true
}
