export interface ParsedResume {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  licenseNumber?: string
  licenseState?: string
  specialties?: string[]
  yearsNursingExperience?: string
  compactLicenseStatus?: string
  averagePatientRatios?: string
  specializedMedicalEquipment?: string
  education?: Array<{
    degree?: string
    school?: string
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
