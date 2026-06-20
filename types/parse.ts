export interface ParsedResume {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  homeAddress?: string
  homeCity?: string
  homeState?: string
  licenseNumber?: string
  licenseState?: string
  licenses?: Array<{
    state?: string
    number?: string
    expiry?: string
  }>
  specialties?: string[]
  yearsNursingExperience?: string
  compactLicenseStatus?: string
  averagePatientRatios?: string
  specializedMedicalEquipment?: string
  education?: Array<{
    degree?: string
    school?: string
    graduationMonth?: string
    graduationYear?: string
  }>
  detectedCredentials?: string[]
  certificationDetails?: Array<{
    name: string
    expiry?: string
  }>
  employers?: Array<{
    name: string
    role?: string
    startDate?: string
    endDate?: string
    city?: string
    state?: string
    employmentType?: string
    unitBedCount?: string
    patientScope?: string
    floatedUnits?: string[]
    equipmentProcedures?: string[]
    avgDailyPatients?: string
    patientAcuity?: string
    highlights?: string[]
  }>
  rawText?: string
}

/** Server-only parse QA payload stored under candidates.parsed_resume.audit — never returned to intake client. */
export interface ParseEmployerAudit {
  name: string
  sourceSnippet?: string
}

export interface ParseAudit {
  identifiedFacilitiesRaw?: string[]
  suggestedEmployers?: ParseEmployerAudit[]
  capturedAt: string
}

/** Server-only parse flags stored under candidates.parsed_resume.outcome — never returned to intake client. */
export interface ParseOutcome {
  fields_found: number
  partial_parse: boolean
  document_scan: boolean
  gemini_failed: boolean
  parse_failed: boolean
}

/** Client-side parse banner state (intake wizard + admin builder). */
export type ParseMeta = {
  document_scan?: boolean
  partial_parse?: boolean
  fields_found?: number
}

export interface ParseAuditViewEmployer {
  name: string
  sourceSnippet?: string
  inWizard: boolean
  missingSnippet: boolean
}

export interface ParseAuditViewResponse {
  candidateId: string
  firstName: string | null
  lastName: string | null
  parseError: string | null
  outcome: ParseOutcome | null
  audit: ParseAudit | null
  employers: ParseAuditViewEmployer[]
  facilitiesWithoutEmployer: string[]
}
