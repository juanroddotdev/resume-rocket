/** Scroll to and focus a wizard field by gap-review id (`intake-field-{fieldId}`). */
export async function focusIntakeField(fieldId: string) {
  if (!import.meta.client) return false

  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

  const el = document.getElementById(`intake-field-${fieldId}`)
  if (!el) return false

  el.scrollIntoView({ behavior: 'smooth', block: 'center' })

  if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus()
  } else {
    el.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
  }

  return true
}
