import type { EducationEntry } from '../types/candidate'

export const GRADUATION_MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const

function padMonth(month: number): string | undefined {
  if (month < 1 || month > 12) return undefined
  return String(month).padStart(2, '0')
}

/** Normalize month to 01–12 when parseable. */
export function normalizeGraduationMonth(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const numeric = Number(trimmed)
  if (Number.isFinite(numeric)) {
    return padMonth(numeric)
  }

  const named = GRADUATION_MONTH_OPTIONS.find(
    option => option.label.toLowerCase() === trimmed.toLowerCase(),
  )
  return named?.value
}

/** Normalize year to four digits when parseable. */
export function normalizeGraduationYear(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  if (/^\d{4}$/.test(trimmed)) return trimmed

  const mmYyyy = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (mmYyyy) return mmYyyy[2]

  const iso = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (iso) return iso[1]

  return undefined
}

/** Split legacy combined graduation strings into month + year parts. */
export function splitLegacyGraduationValue(value: string | null | undefined): {
  graduationMonth?: string
  graduationYear?: string
} {
  const trimmed = value?.trim()
  if (!trimmed) return {}

  const mmYyyy = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (mmYyyy) {
    return {
      graduationMonth: normalizeGraduationMonth(mmYyyy[1]),
      graduationYear: mmYyyy[2],
    }
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (iso) {
    return {
      graduationMonth: normalizeGraduationMonth(iso[2]),
      graduationYear: iso[1],
    }
  }

  if (/^\d{4}$/.test(trimmed)) {
    return { graduationYear: trimmed }
  }

  return {}
}

/** Format for DOCX `education_graduation_year` tag (MM/YYYY when month known). */
export function formatEducationGraduationForDocx(entry: EducationEntry): string {
  const year = normalizeGraduationYear(entry.graduationYear)
  const month = normalizeGraduationMonth(entry.graduationMonth)
  if (month && year) return `${month}/${year}`
  return year || entry.graduationYear?.trim() || ''
}

export function isCompleteEducationGraduation(entry: EducationEntry): boolean {
  return Boolean(normalizeGraduationYear(entry.graduationYear))
}
