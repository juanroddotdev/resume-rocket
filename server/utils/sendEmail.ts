import { Resend } from 'resend'

export async function sendConfirmationEmail(params: {
  to: string
  firstName?: string | null
  accessToken: string
  submittedAt: string
}) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    console.warn('[sendEmail] RESEND_API_KEY missing; skipping email')
    return { skipped: true as const }
  }

  const resend = new Resend(config.resendApiKey)
  const siteUrl = config.public.siteUrl
  const downloadUrl = `${siteUrl}/intake/complete/${params.accessToken}`

  const { error } = await resend.emails.send({
    from: config.resendFromEmail,
    to: params.to,
    subject: 'Your Resume Rocket submission is complete',
    html: `
      <p>Hi${params.firstName ? ` ${params.firstName}` : ''},</p>
      <p>Your healthcare resume was submitted on ${new Date(params.submittedAt).toLocaleString()}.</p>
      <p><a href="${downloadUrl}">Download your VMS-ready resume</a></p>
      <p>If you did not submit this, contact your recruiter.</p>
    `,
  })

  if (error) throw error
  return { skipped: false as const }
}
