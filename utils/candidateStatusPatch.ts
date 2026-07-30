/** PATCH may only transition draft → submitted. Confirmed is set via send-confirmation. */
export function isAllowedStatusPatch(
  existingStatus: string | null | undefined,
  nextStatus: string | undefined,
): boolean {
  if (nextStatus === undefined) return true
  return nextStatus === 'submitted' && existingStatus === 'draft'
}
