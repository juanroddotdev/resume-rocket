/** Submitted/confirmed packets are immutable via PATCH (no field edits or status downgrade). */
export function isCandidatePatchLocked(status: string | null | undefined): boolean {
  return status === 'submitted' || status === 'confirmed'
}
