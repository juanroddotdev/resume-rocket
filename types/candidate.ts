export type CandidateStatus =
  | 'draft'
  | 'submitted'
  | 'confirmed'
  | 'archived'

export interface CandidateRow {
  id: string
  intake_invite_id: string
  status: CandidateStatus
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  license_number: string | null
  license_state: string | null
  specialties: string[] | null
  credentials: CredentialsMap | null
  parsed_resume: Record<string, unknown> | null
  employers: EmployerEntry[] | null
  education: EducationEntry[] | null
  years_nursing_experience: string | null
  compact_license_status: string | null
  average_patient_ratios: string | null
  specialized_medical_equipment: string | null
  preferred_hospital_id: string | null
  emr_system: string | null
  access_token: string | null
  resume_storage_path: string | null
  resume_original_filename?: string | null
  parse_error?: string | null
  parse_outcome?: import('~/types/parse').ParseOutcome | null
  intake_url?: string | null
  confirmation_sent_at?: string | null
  created_at: string
  updated_at: string
}

export interface CredentialEntry {
  active: boolean
  expiry?: string
}

/** Canonical credentials JSONB (server-normalized). Client PATCH may send booleans. */
export type CredentialsMap = Record<string, CredentialEntry>

export interface EducationEntry {
  degree?: string
  school?: string
  /** 01–12 when known */
  graduationMonth?: string
  graduationYear?: string
}

import type { HospitalSuggestion } from '~/types/hospital'

export interface EmployerEntry {
  name: string
  role?: string
  startDate?: string
  endDate?: string
  city?: string
  state?: string
  hospitalId?: string
  beds?: number
  traumaLevel?: string
  teachingStatus?: boolean
  /** Client-only parse suggestions until candidate links a facility */
  hospitalSuggestions?: HospitalSuggestion[]
  /** VMS experience_employment_type */
  employmentType?: string
  /** VMS experience_unit_bed_count */
  unitBedCount?: string
  /** VMS experience_patient_scope */
  patientScope?: string
  /** VMS experience_floated_units_list */
  floatedUnits?: string[]
  /** VMS experience_equipment_procedures_list */
  equipmentProcedures?: string[]
  /** VMS experience_average_daily_patients */
  avgDailyPatients?: string
  /** VMS experience_patient_acuity_level */
  patientAcuity?: string
  /** VMS experience_highlights */
  highlights?: string[]
  /** Included in DOCX highlights when true */
  chargeNurseExperience?: boolean
  /** Included in DOCX highlights when true */
  preceptorExperience?: boolean
}

export interface CandidateDraftInput {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  license_number?: string
  license_state?: string
  specialties?: string[]
  credentials?: CredentialsMap | Record<string, boolean>
  parsed_resume?: Record<string, unknown>
  employers?: EmployerEntry[]
  education?: EducationEntry[]
  years_nursing_experience?: string
  compact_license_status?: string
  average_patient_ratios?: string
  specialized_medical_equipment?: string
  preferred_hospital_id?: string
  emr_system?: string
}
