export interface HospitalRow {
  id: string
  name: string
  city: string | null
  state: string | null
  beds?: number | null
  trauma_level?: string | null
  teaching_status?: boolean | null
  created_at?: string
  score?: number
}
