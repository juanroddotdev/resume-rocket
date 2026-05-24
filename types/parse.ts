export interface ParsedResume {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  licenseNumber?: string
  licenseState?: string
  specialties?: string[]
  detectedCredentials?: string[]
  employers?: Array<{
    name: string
    role?: string
    startDate?: string
    endDate?: string
    city?: string
    state?: string
  }>
  rawText?: string
}
