/** Comma-separated emails allowed to opt into platform / Dev tools. */
export function getPlatformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isPlatformAdmin(user: { email?: string | null }): boolean {
  const email = user.email?.trim().toLowerCase()
  if (!email) return false
  return getPlatformAdminEmails().includes(email)
}
