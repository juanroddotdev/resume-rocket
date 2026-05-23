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
  credentials: Record<string, boolean> | null
  parsed_resume: Record<string, unknown> | null
  employers: EmployerEntry[] | null
  preferred_hospital_id: string | null
  emr_system: string | null
  access_token: string | null
  resume_storage_path: string | null
  resume_original_filename?: string | null
  parse_error?: string | null
  confirmation_sent_at?: string | null
  created_at: string
  updated_at: string
}

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
  trauma_level?: string
}

export interface CandidateDraftInput {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  license_number?: string
  license_state?: string
  specialties?: string[]
  credentials?: Record<string, boolean>
  parsed_resume?: Record<string, unknown>
  employers?: EmployerEntry[]
  preferred_hospital_id?: string
}
