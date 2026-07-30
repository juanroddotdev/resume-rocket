/** Failed invite validate — reason only; never echo candidate PII (S1-M1). */
export function inviteValidateFailure(reason: string) {
  return { valid: false as const, reason }
}
