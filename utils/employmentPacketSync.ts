export type EmploymentPacketSyncMode = 'admin' | 'intake'

/** Detail line shown after employment edits are saved. */
export function employmentPacketSyncMessage(mode: EmploymentPacketSyncMode): string {
  if (mode === 'admin') {
    return 'Professional Snapshot updated from employment'
  }
  return 'Changes will appear in your preview packet'
}
