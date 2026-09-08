import { z } from 'zod'

export const SUPPORTED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const GEMINI_MODEL_OPTIONS = ['gemini-3.5-flash', 'gemini-2.5-flash'] as const

export const LOOKUP_TEMPLATE_PLACEHOLDERS = [
  'facilityName',
  'city',
  'state',
  'licenseNumber',
  'profession',
] as const

export const DEFAULT_APP_SETTINGS = {
  default_invite_expiration_days: 7,
  allowed_upload_mime_types: [...SUPPORTED_UPLOAD_MIME_TYPES],
  max_upload_bytes: 10 * 1024 * 1024,
  company_name: 'Resume Rocket',
  brand_primary_color: '#1f1a40',
  logo_storage_path: '',
  packet_disclaimer:
    'Candidate packets contain confidential healthcare staffing information. Share only with authorized placement teams.',
  facility_search_template:
    'https://www.google.com/search?q={facilityName}+{city}+{state}+trauma+level+total+beds+teaching+hospital+Magnet+EMR',
  license_lookup_template: '',
  gemini_model: 'gemini-3.5-flash',
  gemini_extra_instructions: '',
} as const

export const UPLOAD_TYPE_OPTIONS = [
  {
    mime: 'application/pdf',
    label: 'PDF',
    extensions: ['.pdf'],
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'DOCX',
    extensions: ['.docx'],
  },
] as const

const uploadMimeSchema = z.enum(SUPPORTED_UPLOAD_MIME_TYPES)
const geminiModelSchema = z.enum(GEMINI_MODEL_OPTIONS)

function lookupTemplateSchema(options: { allowEmpty: boolean }) {
  return z
    .string()
    .trim()
    .max(500)
    .superRefine((value, ctx) => {
      if (!value) {
        if (!options.allowEmpty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Template is required.',
          })
        }
        return
      }

      if (!value.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use an https:// URL.',
        })
      }

      for (const placeholder of extractLookupPlaceholders(value)) {
        if (!LOOKUP_TEMPLATE_PLACEHOLDERS.includes(placeholder as LookupTemplatePlaceholder)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unsupported placeholder: {${placeholder}}.`,
          })
        }
      }
    })
}

export const appSettingsSchema = z.object({
  default_invite_expiration_days: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(DEFAULT_APP_SETTINGS.default_invite_expiration_days),
  allowed_upload_mime_types: z
    .array(uploadMimeSchema)
    .min(1)
    .default([...DEFAULT_APP_SETTINGS.allowed_upload_mime_types]),
  max_upload_bytes: z
    .number()
    .int()
    .min(1 * 1024 * 1024)
    .max(25 * 1024 * 1024)
    .default(DEFAULT_APP_SETTINGS.max_upload_bytes),
  company_name: z.string().trim().min(1).max(120).default(DEFAULT_APP_SETTINGS.company_name),
  brand_primary_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default(DEFAULT_APP_SETTINGS.brand_primary_color),
  logo_storage_path: z.string().trim().max(300).optional().default(''),
  packet_disclaimer: z
    .string()
    .trim()
    .max(1000)
    .default(DEFAULT_APP_SETTINGS.packet_disclaimer),
  facility_search_template: lookupTemplateSchema({ allowEmpty: false }).default(
    DEFAULT_APP_SETTINGS.facility_search_template,
  ),
  license_lookup_template: lookupTemplateSchema({ allowEmpty: true }).default(
    DEFAULT_APP_SETTINGS.license_lookup_template,
  ),
  gemini_model: geminiModelSchema.default(DEFAULT_APP_SETTINGS.gemini_model),
  gemini_extra_instructions: z
    .string()
    .trim()
    .max(2000)
    .default(DEFAULT_APP_SETTINGS.gemini_extra_instructions),
})

export const appSettingsPatchSchema = appSettingsSchema.partial().strict()

export type AppSettings = z.infer<typeof appSettingsSchema>
export type AppSettingsPatch = z.infer<typeof appSettingsPatchSchema>
export type UploadMimeType = (typeof SUPPORTED_UPLOAD_MIME_TYPES)[number]
export type GeminiModelOption = (typeof GEMINI_MODEL_OPTIONS)[number]
export type LookupTemplatePlaceholder = (typeof LOOKUP_TEMPLATE_PLACEHOLDERS)[number]

export type AdminSettingsResponse = AppSettings & {
  integrations: {
    gemini: {
      configured: boolean
      model: GeminiModelOption
    }
    resend: {
      configured: boolean
    }
  }
}

export function normalizeAppSettings(input: unknown): AppSettings {
  const raw = input && typeof input === 'object' ? input : {}
  return appSettingsSchema.parse({
    ...DEFAULT_APP_SETTINGS,
    ...(raw as Record<string, unknown>),
    allowed_upload_mime_types: Array.isArray((raw as Record<string, unknown>).allowed_upload_mime_types)
      ? (raw as Record<string, unknown>).allowed_upload_mime_types
      : [...DEFAULT_APP_SETTINGS.allowed_upload_mime_types],
  })
}

export function formatUploadSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${Number.isInteger(mb) ? mb.toFixed(0) : mb.toFixed(1)}MB`
}

export function uploadAcceptAttribute(mimeTypes: string[]): string {
  const parts = new Set<string>()
  for (const option of UPLOAD_TYPE_OPTIONS) {
    if (mimeTypes.includes(option.mime)) {
      parts.add(option.mime)
      for (const ext of option.extensions) parts.add(ext)
    }
  }
  return [...parts].join(',')
}

export function uploadTypeLabel(mimeTypes: string[]): string {
  const labels = UPLOAD_TYPE_OPTIONS
    .filter(option => mimeTypes.includes(option.mime))
    .map(option => option.label)
  return labels.length ? labels.join(' or ') : 'configured resume files'
}

export function isAllowedConfiguredUpload(
  mime: string,
  filename: string,
  allowedMimeTypes: string[],
): boolean {
  if (allowedMimeTypes.includes(mime)) return true
  const lower = filename.toLowerCase()
  const unknownMime = !mime || mime === 'application/octet-stream'
  if (!unknownMime) return false
  return UPLOAD_TYPE_OPTIONS.some(option =>
    allowedMimeTypes.includes(option.mime)
    && option.extensions.some(ext => lower.endsWith(ext)),
  )
}

export function extractLookupPlaceholders(template: string): string[] {
  return [...template.matchAll(/\{([^{}]+)\}/g)].map(match => match[1] || '')
}

export function buildLookupTemplateUrl(
  template: string,
  values: Partial<Record<LookupTemplatePlaceholder, string | number | null | undefined>>,
): string {
  const trimmed = template.trim()
  if (!trimmed) return ''
  return trimmed.replace(/\{([^{}]+)\}/g, (_match, key: string) => {
    const value = values[key as LookupTemplatePlaceholder]
    return encodeURIComponent(value == null ? '' : String(value).trim())
  })
}
