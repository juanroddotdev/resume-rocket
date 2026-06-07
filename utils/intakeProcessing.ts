export type FinalizePhase = 'saving' | 'generating' | 'finalizing' | 'email'

export const FINALIZE_PHASE_MESSAGES: Record<FinalizePhase, string> = {
  saving: 'Saving your answers…',
  generating: 'Building VMS Word template…',
  finalizing: 'Finalizing submission…',
  email: 'Sending confirmation…',
}

export const FINALIZE_PHASE_PROGRESS: Record<FinalizePhase, number> = {
  saving: 25,
  generating: 50,
  finalizing: 75,
  email: 90,
}

export const FINALIZE_SUCCESS_MESSAGE = 'Your VMS profile is polished and ready.'

export function finalizePhaseMessage(phase: FinalizePhase | 'success' | null): string {
  if (phase === 'success') return FINALIZE_SUCCESS_MESSAGE
  if (!phase) return FINALIZE_PHASE_MESSAGES.saving
  return FINALIZE_PHASE_MESSAGES[phase]
}

/** Map parse stage index to progress (0–90 while waiting; parent sets 100 on success). */
export function parseStageProgress(stageIndex: number, stageCount: number): number {
  if (stageCount <= 0) return 10
  const cappedIndex = Math.min(stageIndex, stageCount + 2)
  const maxIndex = stageCount + 2
  return Math.min(90, Math.round(((cappedIndex + 1) / (maxIndex + 1)) * 90))
}
